"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axelarjs_sdk_1 = require("@axelar-network/axelarjs-sdk");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const xrplService_1 = __importDefault(require("./xrplService"));
const evmService_1 = __importDefault(require("./evmService"));
/**
 * Axelar 브릿지 서비스 클래스
 * XRPL과 XRP EVM 사이드체인 간의 브릿지 기능 제공
 */
class AxelarBridgeService {
    constructor() {
        this.XRPL_CHAIN = 'xrpl';
        this.EVM_CHAIN = 'xrpl-evm'; // Axelar에서 정의된 XRP EVM 체인 이름
        this.TOKEN = 'XRP';
        // Axelar 쿼리 API 초기화 - 테스트넷 사용
        this.axelarQuery = new axelarjs_sdk_1.AxelarQueryAPI({
            environment: axelarjs_sdk_1.Environment.TESTNET, // 테스트넷 사용
        });
        // API 헤더 설정
        this.headers = {};
        if (config_1.default.axelar.apiKey) {
            this.headers['x-allthatnode-api-key'] = config_1.default.axelar.apiKey;
        }
    }
    /**
     * XRPL에서 EVM 사이드체인으로 XRP 전송
     * @param amount 전송할 XRP 양
     * @param sourceAddress XRPL 소스 주소
     * @param destinationAddress EVM 목적지 주소
     * @param sourceSeed XRPL 소스 지갑 시드 (옵션 - 자동 전송 시 필요)
     */
    async bridgeXrplToEvm(amount, sourceAddress, destinationAddress, sourceSeed) {
        try {
            logger_1.default.info(`XRP 브릿지 요청: ${amount} XRP from ${sourceAddress} (XRPL) to ${destinationAddress} (EVM)`);
            let receivedTx;
            // 소스 시드가 제공된 경우 자동으로 XRP 전송
            if (sourceSeed) {
                logger_1.default.info(`자동 모드: 사용자 지갑에서 브릿지 지갑으로 자동 전송 시작...`);
                const transferResult = await xrplService_1.default.transferFromUserToBridge(sourceSeed, amount);
                logger_1.default.info(`사용자 지갑에서 브릿지 지갑으로 전송 완료: ${transferResult.result.hash}`);
                // 짧은 대기 시간 후 입금 확인
                await new Promise(resolve => setTimeout(resolve, 5000));
                // 입금 확인 (자동 전송 후)
                receivedTx = await xrplService_1.default.confirmPayment(transferResult.result.hash);
            }
            else {
                // 기존 방식: 사용자가 직접 송금한 경우 모니터링
                logger_1.default.info(`수동 모드: XRPL에서 입금 확인 중...`);
                receivedTx = await xrplService_1.default.monitorIncomingPayment(sourceAddress, amount);
            }
            if (!receivedTx) {
                throw new Error(`XRPL에서 ${amount} XRP 입금이 확인되지 않았습니다.`);
            }
            logger_1.default.info(`XRPL에서 입금 확인됨: 트랜잭션 해시 ${receivedTx.tx?.hash || receivedTx.hash || 'unknown'}`);
            // 2. 가스 요금 예측
            const gasFee = await this.estimateGasFee(this.XRPL_CHAIN, this.EVM_CHAIN, this.TOKEN);
            logger_1.default.info(`예상 가스 비용: ${gasFee}`);
            // 3. EVM 사이드체인으로 XRP 전송
            const evmTx = await evmService_1.default.sendXRP(destinationAddress, amount);
            logger_1.default.info(`EVM 사이드체인으로 XRP 전송됨: 트랜잭션 해시 ${evmTx.hash}`);
            // 4. 트랜잭션 완료 대기 및 확인
            const receipt = await evmService_1.default.checkTransactionStatus(evmTx.hash);
            if (!receipt || receipt.status === 0) {
                throw new Error(`EVM 사이드체인 트랜잭션 실패: ${evmTx.hash}`);
            }
            return {
                txHash: evmTx.hash,
                status: 'completed',
            };
        }
        catch (error) {
            logger_1.default.error('XRPL에서 EVM으로 브릿지 실패', error);
            throw error;
        }
    }
    /**
     * EVM 사이드체인에서 XRPL로 XRP 전송
     * @param amount 전송할 XRP 양
     * @param sourceAddress EVM 소스 주소
     * @param destinationAddress XRPL 목적지 주소
     */
    async bridgeEvmToXrpl(amount, sourceAddress, destinationAddress) {
        try {
            logger_1.default.info(`XRP 브릿지 요청: ${amount} XRP from ${sourceAddress} (EVM) to ${destinationAddress} (XRPL)`);
            // 1. 브릿지 컨트랙트에 자금이 입금되었는지 확인
            // 실제 구현에서는 여기에 추가 검증 로직이 필요합니다
            // 2. 가스 요금 예측
            const gasFee = await this.estimateGasFee(this.EVM_CHAIN, this.XRPL_CHAIN, this.TOKEN);
            logger_1.default.info(`예상 가스 비용: ${gasFee}`);
            // 3. XRPL로 XRP 전송
            const xrplTx = await xrplService_1.default.sendXRP(destinationAddress, amount);
            logger_1.default.info(`XRPL로 XRP 전송됨: 트랜잭션 해시 ${xrplTx.result.hash}`);
            return {
                txHash: xrplTx.result.hash,
                status: 'completed',
            };
        }
        catch (error) {
            logger_1.default.error('EVM에서 XRPL로 브릿지 실패', error);
            throw error;
        }
    }
    /**
     * 가스 요금 예측
     * @param sourceChain 소스 체인
     * @param destinationChain 목적지 체인
     * @param token 토큰 유형
     */
    async estimateGasFee(sourceChain, destinationChain, token) {
        try {
            // 실제 구현에서는 Axelar API를 통해 가스 요금 예측
            // 현재는 더미 값 반환
            return '0.001';
        }
        catch (error) {
            logger_1.default.error('가스 요금 예측 실패', error);
            throw error;
        }
    }
    /**
     * 브릿지 트랜잭션 상태 확인
     * @param txHash 트랜잭션 해시
     * @param sourceChain 소스 체인
     */
    async getTransferStatus(txHash, sourceChain) {
        try {
            if (sourceChain === 'xrpl') {
                // XRPL 트랜잭션 상태 확인
                // 실제 구현에서는 XRPL API를 통해 트랜잭션 상태 확인
                return 'completed';
            }
            else {
                // EVM 트랜잭션 상태 확인
                const receipt = await evmService_1.default.checkTransactionStatus(txHash);
                return receipt && receipt.status === 1 ? 'completed' : 'failed';
            }
        }
        catch (error) {
            logger_1.default.error(`브릿지 트랜잭션 상태 확인 실패: ${txHash}`, error);
            throw error;
        }
    }
}
exports.default = new AxelarBridgeService();
