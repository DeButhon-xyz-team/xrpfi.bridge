import { AxelarQueryAPI, Environment, EvmChain, GasToken } from '@axelar-network/axelarjs-sdk';
import config from '../config';
import logger from '../utils/logger';
import xrplService from './xrplService';
import evmService from './evmService';
import swapService from './swapService';

/**
 * Axelar 브릿지 서비스 클래스
 * XRPL과 XRP EVM 사이드체인 간의 브릿지 기능 제공
 */
class AxelarBridgeService {
  private axelarQuery: AxelarQueryAPI;
  private readonly XRPL_CHAIN = 'xrpl';
  private readonly EVM_CHAIN = 'xrpl-evm'; // Axelar에서 정의된 XRP EVM 체인 이름
  private readonly TOKEN = 'XRP';
  private readonly headers: Record<string, string>;
  private autoSwapEnabled: boolean = false;

  constructor() {
    // Axelar 쿼리 API 초기화 - 테스트넷 사용
    this.axelarQuery = new AxelarQueryAPI({
      environment: Environment.TESTNET, // 테스트넷 사용
    });

    // API 헤더 설정
    this.headers = {};
    if (config.axelar.apiKey) {
      this.headers['x-allthatnode-api-key'] = config.axelar.apiKey;
    }
    
    // 자동 스왑 기능 활성화 여부 (swap 설정이 있는 경우 활성화)
    this.autoSwapEnabled = !!(config.swap?.contractAddress && config.swap?.privateKey);
    if (this.autoSwapEnabled) {
      logger.info('XRP -> BTC 자동 스왑 기능이 활성화되었습니다.');
    }
  }

  /**
   * XRPL에서 EVM 사이드체인으로 XRP 전송
   * @param amount 전송할 XRP 양
   * @param sourceAddress XRPL 소스 주소
   * @param destinationAddress EVM 목적지 주소
   * @param sourceSeed XRPL 소스 지갑 시드 (옵션 - 자동 전송 시 필요)
   * @param autoSwap BTC로 자동 스왑 여부 (기본: true)
   */
  async bridgeXrplToEvm(
    amount: string,
    sourceAddress: string,
    destinationAddress: string,
    sourceSeed?: string,
    autoSwap: boolean = true
  ): Promise<{ txHash: string; status: string; swapTxHash?: string }> {
    try {
      logger.info(`XRP 브릿지 요청: ${amount} XRP from ${sourceAddress} (XRPL) to ${destinationAddress} (EVM)`);

      let receivedTx: any;
      
      // 소스 시드가 제공된 경우 자동으로 XRP 전송
      if (sourceSeed) {
        logger.info(`자동 모드: 사용자 지갑에서 브릿지 지갑으로 자동 전송 시작...`);
        const transferResult = await xrplService.transferFromUserToBridge(sourceSeed, amount);
        logger.info(`사용자 지갑에서 브릿지 지갑으로 전송 완료: ${transferResult.result.hash}`);
        
        // 짧은 대기 시간 후 입금 확인
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 입금 확인 (자동 전송 후)
        receivedTx = await xrplService.confirmPayment(transferResult.result.hash);
      } else {
        // 기존 방식: 사용자가 직접 송금한 경우 모니터링
        logger.info(`수동 모드: XRPL에서 입금 확인 중...`);
        receivedTx = await xrplService.monitorIncomingPayment(sourceAddress, amount);
      }
      
      if (!receivedTx) {
        throw new Error(`XRPL에서 ${amount} XRP 입금이 확인되지 않았습니다.`);
      }
      
      logger.info(`XRPL에서 입금 확인됨: 트랜잭션 해시 ${receivedTx.tx?.hash || receivedTx.hash || 'unknown'}`);
      
      // 여기서 EVM 사이드체인으로 XRP 전송 로직을 구현합니다.
      logger.info(`${amount} XRP를 EVM 사이드체인의 ${destinationAddress}로 전송 중...`);
      
      // 예시: 실제 전송 함수 호출
      const evmTx = await evmService.sendXRP(destinationAddress, amount);
      logger.info(`EVM 사이드체인으로 전송 완료: ${evmTx.hash}`);
      
      // 트랜잭션 상태 확인
      await evmService.checkTransactionStatus(evmTx.hash);
      
      // 자동 스왑 기능 실행 (활성화되어 있고, 호출자가 원하는 경우)
      let swapTxHash: string | undefined;
      if (this.autoSwapEnabled && autoSwap) {
        try {
          logger.info(`자동 스왑 기능이 활성화되어 있습니다. ${amount} XRP를 BTC로 스왑합니다...`);
          
          // 브릿지가 완료된 후 5초 대기 (트랜잭션 처리 시간 고려)
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // 스왑 서비스 초기화 (아직 초기화되지 않은 경우)
          await swapService.initialize();
          
          // 스왑 실행
          const swapTx = await swapService.autoSwapBridgeReceived(destinationAddress, amount);
          
          if (swapTx) {
            swapTxHash = swapTx.hash;
            logger.info(`자동 스왑 트랜잭션 전송됨: ${swapTxHash}`);
            
            // BTC 잔액 조회 (5초 후)
            setTimeout(async () => {
              try {
                const btcBalance = await swapService.getBTCBalance(destinationAddress);
                const swapContractBalance = await swapService.getSwapContractWBTCBalance();
                
                // 스테이킹 보상 계산
                const rewards = await swapService.calculateReward(destinationAddress);
                
                // 시간당/일일 스테이킹 보상 계산
                const timeRewards = await swapService.calculateHourlyReward(destinationAddress);
                
                logger.info(`스테이킹된 BTC 잔액: ${swapContractBalance} WBTC`);
                logger.info(`현재 누적 보상: ${rewards.rewardWbtc} WBTC (${rewards.rewardXrp} XRP)`);
                logger.info(`시간당 예상 보상: ${timeRewards.hourlyWbtc} WBTC (${timeRewards.hourlyXrp} XRP)`);
                logger.info(`일일 예상 보상: ${timeRewards.dailyWbtc} WBTC (${timeRewards.dailyXrp} XRP)`);
              } catch (err: any) {
                logger.warn(`BTC 잔액 조회 실패: ${err.message}`);
              }
            }, 5000);
          } else {
            logger.warn('자동 스왑 실패: 스왑 트랜잭션을 생성할 수 없습니다');
          }
        } catch (swapError: any) {
          logger.error(`자동 스왑 중 오류 발생: ${swapError.message}`, swapError);
          // 스왑에 실패해도 브릿지 자체는 성공으로 간주
        }
      }
      
      return { 
        txHash: evmTx.hash, 
        status: 'completed',
        ...(swapTxHash && { swapTxHash })
      };
    } catch (error: any) {
      logger.error(`XRP 브릿지 실패: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * EVM 사이드체인에서 XRPL로 XRP 전송
   * @param amount 전송할 XRP 양
   * @param sourceAddress EVM 소스 주소
   * @param destinationAddress XRPL 목적지 주소
   */
  async bridgeEvmToXrpl(
    amount: string,
    sourceAddress: string,
    destinationAddress: string
  ): Promise<{ txHash: string; status: string }> {
    try {
      logger.info(`XRP 브릿지 요청: ${amount} XRP from ${sourceAddress} (EVM) to ${destinationAddress} (XRPL)`);

      // 1. 브릿지 컨트랙트에 자금이 입금되었는지 확인
      // 실제 구현에서는 여기에 추가 검증 로직이 필요합니다

      // 2. 가스 요금 예측
      const gasFee = await this.estimateGasFee(
        this.EVM_CHAIN,
        this.XRPL_CHAIN,
        this.TOKEN
      );
      
      logger.info(`예상 가스 비용: ${gasFee}`);

      // 3. XRPL로 XRP 전송
      const xrplTx = await xrplService.sendXRP(destinationAddress, amount);
      logger.info(`XRPL로 XRP 전송됨: 트랜잭션 해시 ${xrplTx.result.hash}`);

      return {
        txHash: xrplTx.result.hash,
        status: 'completed',
      };
    } catch (error) {
      logger.error('EVM에서 XRPL로 브릿지 실패', error);
      throw error;
    }
  }

  /**
   * 가스 요금 예측
   * @param sourceChain 소스 체인
   * @param destinationChain 목적지 체인
   * @param token 토큰 유형
   */
  private async estimateGasFee(
    sourceChain: string,
    destinationChain: string,
    token: string
  ): Promise<string> {
    try {
      // 실제 구현에서는 Axelar API를 통해 가스 요금 예측
      // 현재는 더미 값 반환
      return '0.001';
    } catch (error) {
      logger.error('가스 요금 예측 실패', error);
      throw error;
    }
  }

  /**
   * 브릿지 트랜잭션 상태 확인
   * @param txHash 트랜잭션 해시
   * @param sourceChain 소스 체인
   */
  async getTransferStatus(txHash: string, sourceChain: 'xrpl' | 'evm'): Promise<string> {
    try {
      if (sourceChain === 'xrpl') {
        // XRPL 트랜잭션 상태 확인
        // 실제 구현에서는 XRPL API를 통해 트랜잭션 상태 확인
        return 'completed';
      } else {
        // EVM 트랜잭션 상태 확인
        const receipt = await evmService.checkTransactionStatus(txHash);
        return receipt && receipt.status === 1 ? 'completed' : 'failed';
      }
    } catch (error) {
      logger.error(`브릿지 트랜잭션 상태 확인 실패: ${txHash}`, error);
      throw error;
    }
  }
}

export default new AxelarBridgeService(); 