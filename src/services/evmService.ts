import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';

/**
 * EVM 사이드체인 서비스 클래스
 * XRP EVM 사이드체인과 상호작용하는 기능 제공
 */
class EVMService {
  private provider: ethers.JsonRpcProvider;
  private bridgeWallet: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.evm.rpcUrl);
  }

  /**
   * 서비스 초기화
   */
  async initialize(): Promise<void> {
    try {
      logger.info('EVM 사이드체인 서비스 초기화 중...');
      
      // 네트워크 연결 확인
      const network = await this.provider.getNetwork();
      logger.info(`EVM 사이드체인 연결됨: 체인 ID ${network.chainId}`);
      
      // 브릿지 지갑 설정
      if (config.evm.bridgePrivateKey) {
        this.bridgeWallet = new ethers.Wallet(config.evm.bridgePrivateKey, this.provider);
        const balance = await this.provider.getBalance(this.bridgeWallet.address);
        
        logger.info(`EVM 브릿지 지갑 주소: ${this.bridgeWallet.address}`);
        logger.info(`EVM 브릿지 지갑 잔액: ${ethers.formatEther(balance)} ETH`);
      } else {
        logger.warn('EVM 브릿지 개인키가 설정되지 않았습니다. 읽기 전용 모드로 실행합니다.');
      }
      
      logger.info('EVM 사이드체인 서비스 초기화 완료');
    } catch (error) {
      logger.error('EVM 사이드체인 서비스 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 계정 XRP 잔액 조회
   * @param address EVM 주소
   */
  async getXRPBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error(`EVM 계정 잔액 조회 실패: ${address}`, error);
      throw error;
    }
  }

  /**
   * XRP 전송
   * @param destination 받는 주소
   * @param amount 전송할 XRP 양 (ETH 단위)
   */
  async sendXRP(destination: string, amount: string): Promise<ethers.TransactionResponse> {
    if (!this.bridgeWallet) {
      throw new Error('EVM 브릿지 지갑이 설정되지 않았습니다');
    }

    try {
      // 가스 가격 추정
      const feeData = await this.provider.getFeeData();
      
      // 트랜잭션 생성 및 전송
      const tx = await this.bridgeWallet.sendTransaction({
        to: destination,
        value: ethers.parseEther(amount),
        gasPrice: feeData.gasPrice || undefined
      });

      logger.info(`EVM XRP 전송 트랜잭션 전송됨: ${tx.hash}`);
      
      // 트랜잭션 확인 대기
      const receipt = await tx.wait();
      logger.info(`EVM XRP 전송 확인됨: ${amount} XRP to ${destination}, 블록: ${receipt?.blockNumber}`);
      
      return tx;
    } catch (error) {
      logger.error(`EVM XRP 전송 실패: ${amount} XRP to ${destination}`, error);
      throw error;
    }
  }

  /**
   * 컨트랙트 메서드 호출 (읽기 전용)
   * @param contractAddress 컨트랙트 주소
   * @param abi 컨트랙트 ABI
   * @param method 호출할 메서드 이름
   * @param args 메서드 인자들
   */
  async callContractMethod(
    contractAddress: string, 
    abi: any[], 
    method: string, 
    args: any[] = []
  ): Promise<any> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      return await contract[method](...args);
    } catch (error) {
      logger.error(`컨트랙트 메서드 호출 실패: ${contractAddress}.${method}`, error);
      throw error;
    }
  }

  /**
   * 컨트랙트 메서드 실행 (쓰기)
   * @param contractAddress 컨트랙트 주소
   * @param abi 컨트랙트 ABI
   * @param method 실행할 메서드 이름
   * @param args 메서드 인자들
   * @param value 전송할 ETH 값 (옵션)
   */
  async executeContractMethod(
    contractAddress: string, 
    abi: any[], 
    method: string, 
    args: any[] = [], 
    value: string = '0'
  ): Promise<ethers.TransactionResponse> {
    if (!this.bridgeWallet) {
      throw new Error('EVM 브릿지 지갑이 설정되지 않았습니다');
    }

    try {
      const contract = new ethers.Contract(contractAddress, abi, this.bridgeWallet);
      const tx = await contract[method](...args, { value: ethers.parseEther(value) });

      logger.info(`컨트랙트 메서드 실행 트랜잭션 전송됨: ${contractAddress}.${method}, 해시: ${tx.hash}`);
      
      // 트랜잭션 확인 대기
      const receipt = await tx.wait();
      logger.info(`컨트랙트 메서드 실행 확인됨: ${contractAddress}.${method}, 블록: ${receipt?.blockNumber}`);
      
      return tx;
    } catch (error) {
      logger.error(`컨트랙트 메서드 실행 실패: ${contractAddress}.${method}`, error);
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
    } catch (error) {
      logger.error(`트랜잭션 상태 확인 실패: ${txHash}`, error);
      throw error;
    }
  }
}

export default new EVMService(); 