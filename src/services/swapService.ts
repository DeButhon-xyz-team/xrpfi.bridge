import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';
import XrpWbtcLendingSwapABI from '../contracts/XrpWbtcLendingSwap.json';

/**
 * XRP-BTC 스왑 서비스 클래스
 * XRP EVM 사이드체인에서 XRP를 BTC로 스왑하는 기능 제공
 */
class SwapService {
  private provider: ethers.JsonRpcProvider;
  private swapWallet: ethers.Wallet | null = null;
  private swapContract: ethers.Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.evm.rpcUrl);
  }

  /**
   * 서비스 초기화
   */
  async initialize(): Promise<void> {
    try {
      logger.info('스왑 서비스 초기화 중...');
      
      // 네트워크 연결 확인
      const network = await this.provider.getNetwork();
      logger.info(`EVM 사이드체인 연결됨: 체인 ID ${network.chainId}`);
      
      // 스왑 지갑 설정
      if (config.swap?.privateKey) {
        this.swapWallet = new ethers.Wallet(config.swap.privateKey, this.provider);
        const balance = await this.provider.getBalance(this.swapWallet.address);
        
        logger.info(`스왑 지갑 주소: ${this.swapWallet.address}`);
        logger.info(`스왑 지갑 잔액: ${ethers.formatEther(balance)} XRP`);
        
        // 스왑 컨트랙트 초기화
        if (config.swap?.contractAddress) {
          this.swapContract = new ethers.Contract(
            config.swap.contractAddress,
            XrpWbtcLendingSwapABI,
            this.swapWallet
          );
          logger.info(`스왑 컨트랙트 초기화됨: ${config.swap.contractAddress}`);
        } else {
          logger.warn('스왑 컨트랙트 주소가 설정되지 않았습니다.');
        }
      } else {
        logger.warn('스왑 지갑 개인키가 설정되지 않았습니다. 컨트랙트 호출이 불가능합니다.');
      }
      
      logger.info('스왑 서비스 초기화 완료');
    } catch (error: any) {
      logger.error('스왑 서비스 초기화 실패', error);
      throw error;
    }
  }

  /**
   * XRP를 BTC로 스왑하고 스테이킹
   * @param xrpAmount 스왑할 XRP 양 (ETH 단위 문자열, 예: "0.1")
   * @param userAddress 사용자 주소 (대상 주소가 지정되지 않으면 스왑 지갑 사용)
   */
  async swapXRPToBTC(xrpAmount: string, userAddress?: string): Promise<ethers.TransactionResponse> {
    if (!this.swapWallet || !this.swapContract) {
      throw new Error('스왑 지갑 또는 컨트랙트가 초기화되지 않았습니다');
    }

    const targetAddress = userAddress || this.swapWallet.address;
    
    try {
      logger.info(`XRP -> BTC 스왑 요청: ${xrpAmount} XRP`);
      
      // XRP를 Wei로 변환
      const xrpWei = ethers.parseEther(xrpAmount);
      
      // 가스 추정
      const gasEstimate = await this.swapContract.swapAndStake.estimateGas({
        value: xrpWei
      });
      
      // 가스 가격 가져오기
      const gasPrice = await this.provider.getFeeData();
      
      // 트랜잭션 전송
      const tx = await this.swapContract.swapAndStake({
        value: xrpWei,
        gasLimit: BigInt(Math.floor(Number(gasEstimate) * 1.2)), // 안전 마진 추가
        gasPrice: gasPrice.gasPrice
      });
      
      logger.info(`스왑 트랜잭션 전송됨: ${tx.hash}`);
      
      return tx;
    } catch (error: any) {
      logger.error(`XRP -> BTC 스왑 실패: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * 특정 금액의 XRP로 컨트랙트의 swapAndStake 함수 호출
   * (브릿지를 통해 수신된 XRP에 대해 자동으로 스왑 실행)
   * @param destinationAddress 대상 주소 (브릿지 수신 주소)
   * @param amount 수신된 XRP 양
   */
  async autoSwapBridgeReceived(destinationAddress: string, amount: string): Promise<ethers.TransactionResponse | null> {
    try {
      logger.info(`브릿지 수신 XRP 자동 스왑: ${amount} XRP to ${destinationAddress}`);
      
      // XRP 잔액 확인
      const balance = await this.provider.getBalance(destinationAddress);
      const balanceInEther = ethers.formatEther(balance);
      
      logger.info(`현재 대상 주소 잔액: ${balanceInEther} XRP`);
      
      // 수신된 금액이 잔액보다 크면 오류
      if (parseFloat(amount) > parseFloat(balanceInEther)) {
        logger.warn(`요청된 스왑 금액(${amount})이 현재 잔액(${balanceInEther})보다 큽니다`);
        return null;
      }
      
      // 스왑 실행
      return await this.swapXRPToBTC(amount, destinationAddress);
    } catch (error: any) {
      logger.error(`브릿지 수신 XRP 자동 스왑 실패: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * 트랜잭션 상태 확인
   * @param txHash 트랜잭션 해시
   */
  async checkTransactionStatus(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error: any) {
      logger.error(`트랜잭션 상태 확인 실패: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * BTC 잔액 조회
   * @param address 조회할 주소
   */
  async getBTCBalance(address: string): Promise<string> {
    if (!this.swapContract) {
      throw new Error('스왑 컨트랙트가 초기화되지 않았습니다');
    }
    
    try {
      // WBTC 주소 가져오기
      const wbtcAddress = await this.swapContract.getWbtcAddress();
      
      // WBTC 토큰 컨트랙트 인스턴스 생성
      const wbtcContract = new ethers.Contract(
        wbtcAddress,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.provider
      );
      
      // WBTC 소수점 자릿수 가져오기
      const decimals = await wbtcContract.decimals();
      
      // 잔액 조회
      const balance = await wbtcContract.balanceOf(address);
      
      return ethers.formatUnits(balance, decimals);
    } catch (error: any) {
      logger.error(`BTC 잔액 조회 실패: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * 스왑 컨트랙트의 WBTC 잔액 조회
   */
  async getSwapContractWBTCBalance(): Promise<string> {
    if (!this.swapContract) {
      throw new Error('스왑 컨트랙트가 초기화되지 않았습니다');
    }
    
    try {
      // WBTC 주소 가져오기
      const wbtcAddress = await this.swapContract.getWbtcAddress();
      
      // WBTC 토큰 컨트랙트 인스턴스 생성
      const wbtcContract = new ethers.Contract(
        wbtcAddress,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.provider
      );
      
      // WBTC 소수점 자릿수 가져오기
      const decimals = await wbtcContract.decimals();
      
      // 스왑 컨트랙트의 WBTC 잔액 조회
      const contractAddress = this.swapContract.getAddress();
      const balance = await wbtcContract.balanceOf(await contractAddress);
      
      return ethers.formatUnits(balance, decimals);
    } catch (error: any) {
      logger.error(`스왑 컨트랙트의 WBTC 잔액 조회 실패: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * 사용자의 스테이킹 보상 계산
   * @param userAddress 사용자 주소
   */
  async calculateReward(userAddress: string): Promise<{ rewardWbtc: string; rewardXrp: string }> {
    if (!this.swapContract) {
      throw new Error('스왑 컨트랙트가 초기화되지 않았습니다');
    }
    
    try {
      // 컨트랙트의 calculateReward 메서드 호출
      const [rewardWbtcBigInt, rewardXrpBigInt] = await this.swapContract.calculateReward(userAddress);
      
      // WBTC는 일반적으로 8자리 소수점, XRP는 6자리 소수점을 사용
      const rewardWbtc = ethers.formatUnits(rewardWbtcBigInt, 8);
      const rewardXrp = ethers.formatUnits(rewardXrpBigInt, 18);
      
      return { rewardWbtc, rewardXrp };
    } catch (error: any) {
      logger.error(`스테이킹 보상 계산 실패: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * 사용자의 시간당 스테이킹 보상 계산
   * @param userAddress 사용자 주소
   */
  async calculateHourlyReward(userAddress: string): Promise<{ hourlyWbtc: string; hourlyXrp: string; dailyWbtc: string; dailyXrp: string }> {
    if (!this.swapContract) {
      throw new Error('스왑 컨트랙트가 초기화되지 않았습니다');
    }
    
    try {
      // aToken 주소 가져오기
      const aTokenAddress = await this.swapContract.getATokenAddress();
      
      // aToken 컨트랙트 인스턴스 생성
      const aTokenContract = new ethers.Contract(
        aTokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      
      // 사용자의 스테이킹 잔액 조회
      const balance = await aTokenContract.balanceOf(userAddress);
      
      // 이자율 조회 (연간 이율, 10000 기준)
      const interestRate = await this.swapContract.interestRate();
      
      // 시간당 이율 계산 (연간 이율 / 365일 / 24시간)
      const hourlyRate = Number(interestRate) / 10000 / 365 / 24;
      
      // 시간당 WBTC 보상 계산
      const hourlyWbtcAmount = Number(ethers.formatUnits(balance, 8)) * hourlyRate;
      const hourlyWbtc = hourlyWbtcAmount.toFixed(8);
      
      // 일일 WBTC 보상 계산
      const dailyWbtc = (hourlyWbtcAmount * 24).toFixed(8);
      
      // BTC-XRP 가격 비율 계산
      const XRP_USD_PRICE = await this.swapContract.XRP_USD_PRICE();
      const BTC_USD_PRICE = await this.swapContract.BTC_USD_PRICE();
      const btcXrpRatio = Number(BTC_USD_PRICE) / Number(XRP_USD_PRICE);
      
      // XRP 보상 계산
      const hourlyXrpAmount = hourlyWbtcAmount * btcXrpRatio;
      const hourlyXrp = hourlyXrpAmount.toFixed(6);
      const dailyXrp = (hourlyXrpAmount * 24).toFixed(6);
      
      return { hourlyWbtc, hourlyXrp, dailyWbtc, dailyXrp };
    } catch (error: any) {
      logger.error(`시간당 스테이킹 보상 계산 실패: ${error.message}`, error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const swapService = new SwapService();
export default swapService; 