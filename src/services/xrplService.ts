import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import config from '../config';
import logger from '../utils/logger';

/**
 * XRPL 서비스 클래스
 * XRPL과 상호작용하는 기능 제공
 */
class XRPLService {
  private client: Client;
  private bridgeWallet: Wallet | null = null;

  constructor() {
    this.client = new Client(config.xrpl.nodeUrl);
  }

  /**
   * XRPL 클라이언트 연결
   */
  async connect(): Promise<void> {
    try {
      logger.info('XRPL 노드에 연결 중...');
      await this.client.connect();
      
      // 브릿지 지갑 설정
      if (config.xrpl.bridgeWalletSeed) {
        this.bridgeWallet = Wallet.fromSeed(config.xrpl.bridgeWalletSeed);
        logger.info(`브릿지 지갑 주소: ${this.bridgeWallet.address}`);
        
        // 지갑 잔액 조회 및 로그 출력
        try {
          const balance = await this.getXRPBalance(this.bridgeWallet.address);
          logger.info(`XRPL 브릿지 지갑 잔액: ${balance} XRP`);
        } catch (balanceError: any) {
          logger.warn(`XRPL 브릿지 지갑 잔액 조회 실패: ${balanceError.message}`);
        }
      } else {
        logger.warn('브릿지 지갑 시드가 설정되지 않았습니다. 읽기 전용 모드로 실행합니다.');
      }
      
      logger.info('XRPL 노드 연결 성공');
    } catch (error) {
      logger.error('XRPL 노드 연결 실패', error);
      throw error;
    }
  }

  /**
   * XRPL 클라이언트 연결 해제
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
    logger.info('XRPL 노드 연결 해제');
  }

  /**
   * 계정 정보 조회
   * @param address XRPL 주소
   */
  async getAccountInfo(address: string): Promise<any> {
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error) {
      logger.error(`계정 정보 조회 실패: ${address}`, error);
      throw error;
    }
  }

  /**
   * XRP 잔액 조회
   * @param address XRPL 주소
   */
  async getXRPBalance(address: string): Promise<string> {
    try {
      const accountInfo = await this.getAccountInfo(address);
      return dropsToXrp(accountInfo.account_data.Balance);
    } catch (error) {
      logger.error(`XRP 잔액 조회 실패: ${address}`, error);
      throw error;
    }
  }

  /**
   * XRP 전송
   * @param destination 받는 주소
   * @param amount 전송할 XRP 양
   */
  async sendXRP(destination: string, amount: string): Promise<any> {
    if (!this.bridgeWallet) {
      throw new Error('브릿지 지갑이 설정되지 않았습니다');
    }

    try {
      const prepared = await this.client.autofill({
        TransactionType: 'Payment',
        Account: this.bridgeWallet.address,
        Amount: xrpToDrops(amount),
        Destination: destination
      });

      const signed = this.bridgeWallet.sign(prepared);
      logger.info(`XRP 전송 트랜잭션 서명 완료: ${signed.hash}`);

      const result = await this.client.submitAndWait(signed.tx_blob);
      logger.info(`XRP 전송 완료: ${amount} XRP 전송 to ${destination}`);
      
      return result;
    } catch (error) {
      logger.error(`XRP 전송 실패: ${amount} XRP to ${destination}`, error);
      throw error;
    }
  }

  /**
   * 사용자로부터 XRP를 브릿지 지갑으로 수신했는지 확인
   * @param userAddress 사용자 XRPL 주소
   * @param expectedAmount 예상 수신 금액
   * @param fromLedger 시작 렛저 인덱스
   */
  async monitorIncomingPayment(userAddress: string, expectedAmount: string, fromLedger?: number): Promise<any> {
    if (!this.bridgeWallet) {
      throw new Error('브릿지 지갑이 설정되지 않았습니다');
    }

    try {
      // 현재 검증된 렛저 인덱스 가져오기
      const ledgerResponse = await this.client.request({
        command: 'ledger_current'
      });
      
      // 타입 오류 수정: ledger_current_index 사용
      const currentLedgerIndex = ledgerResponse.result.ledger_current_index;
      
      // 트랜잭션 모니터링 시작 포인트 설정
      const startLedger = fromLedger || currentLedgerIndex - 10; // 기본적으로 최근 10개 렛저만 확인
      
      const txResponse = await this.client.request({
        command: 'account_tx',
        account: this.bridgeWallet.address,
        ledger_index_min: startLedger,
        ledger_index_max: -1,
        binary: false
      });

      // 예상된 트랜잭션 찾기 (타입 안전성 개선)
      const expectedTx = txResponse.result.transactions.find(tx => {
        // tx.tx가 undefined인 경우 체크
        if (!tx.tx) return false;
        
        // Payment 트랜잭션인지 확인
        if (tx.tx.TransactionType !== 'Payment') return false;
        
        // 송신자가 예상한 사용자인지 확인
        if (tx.tx.Account !== userAddress) return false;
        
        // 수신자가 브릿지 지갑인지 확인
        if (!tx.tx.Destination || tx.tx.Destination !== this.bridgeWallet?.address) return false;
        
        // 금액이 예상한 금액과 일치하는지 확인
        if (!tx.tx.Amount) return false;
        
        return dropsToXrp(tx.tx.Amount.toString()) === expectedAmount;
      });

      return expectedTx;
    } catch (error) {
      logger.error(`입금 확인 실패: ${expectedAmount} XRP from ${userAddress}`, error);
      throw error;
    }
  }

  /**
   * 사용자 지갑에서 브릿지 지갑으로 XRP 전송
   * @param sourceSeed 사용자 XRPL 지갑 시드
   * @param amount 전송할 XRP 양
   */
  async transferFromUserToBridge(sourceSeed: string, amount: string): Promise<any> {
    try {
      // 사용자 지갑 생성
      const userWallet = Wallet.fromSeed(sourceSeed);
      logger.info(`사용자 지갑 주소: ${userWallet.address}`);
      
      if (!this.bridgeWallet) {
        throw new Error('브릿지 지갑이 설정되지 않았습니다');
      }

      // 사용자 지갑 잔액 확인
      const balance = await this.getXRPBalance(userWallet.address);
      if (parseFloat(balance) < parseFloat(amount)) {
        throw new Error(`사용자 지갑 잔액 부족: ${balance} XRP (필요: ${amount} XRP)`);
      }

      // 사용자 지갑에서 브릿지 지갑으로 전송
      const prepared = await this.client.autofill({
        TransactionType: 'Payment',
        Account: userWallet.address,
        Amount: xrpToDrops(amount),
        Destination: this.bridgeWallet.address
      });

      const signed = userWallet.sign(prepared);
      logger.info(`사용자 지갑에서 XRP 전송 트랜잭션 서명 완료: ${signed.hash}`);

      const result = await this.client.submitAndWait(signed.tx_blob);
      logger.info(`사용자 지갑에서 브릿지 지갑으로 전송 완료: ${amount} XRP`);
      
      return result;
    } catch (error) {
      logger.error(`사용자 지갑에서 브릿지 지갑으로 전송 실패: ${amount} XRP`, error);
      throw error;
    }
  }

  /**
   * 트랜잭션 해시로 지불 확인
   * @param txHash 트랜잭션 해시
   */
  async confirmPayment(txHash: string): Promise<any> {
    try {
      const txInfo = await this.client.request({
        command: 'tx',
        transaction: txHash
      });

      // txInfo의 결과가 유효한지 확인
      if (txInfo.result.validated) {
        // meta가 존재하고 거래가 성공했는지 확인
        const meta = txInfo.result.meta;
        const transactionResult = typeof meta === 'object' && meta && 'TransactionResult' in meta
          ? meta.TransactionResult
          : null;
        
        if (transactionResult === 'tesSUCCESS') {
          return {
            hash: txHash,
            tx: txInfo.result
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`트랜잭션 확인 실패: ${txHash}`, error);
      throw error;
    }
  }
}

export default new XRPLService(); 