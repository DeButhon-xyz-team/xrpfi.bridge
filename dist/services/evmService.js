"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * EVM 사이드체인 서비스 클래스
 * XRP EVM 사이드체인과 상호작용하는 기능 제공
 */
class EVMService {
    constructor() {
        this.bridgeWallet = null;
        this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.default.evm.rpcUrl);
    }
    /**
     * 서비스 초기화
     */
    async initialize() {
        try {
            logger_1.default.info('EVM 사이드체인 서비스 초기화 중...');
            // 네트워크 연결 확인
            const network = await this.provider.getNetwork();
            logger_1.default.info(`EVM 사이드체인 연결됨: 체인 ID ${network.chainId}`);
            // 브릿지 지갑 설정
            if (config_1.default.evm.bridgePrivateKey) {
                this.bridgeWallet = new ethers_1.ethers.Wallet(config_1.default.evm.bridgePrivateKey, this.provider);
                const balance = await this.provider.getBalance(this.bridgeWallet.address);
                logger_1.default.info(`EVM 브릿지 지갑 주소: ${this.bridgeWallet.address}`);
                logger_1.default.info(`EVM 브릿지 지갑 잔액: ${ethers_1.ethers.formatEther(balance)} ETH`);
            }
            else {
                logger_1.default.warn('EVM 브릿지 개인키가 설정되지 않았습니다. 읽기 전용 모드로 실행합니다.');
            }
            logger_1.default.info('EVM 사이드체인 서비스 초기화 완료');
        }
        catch (error) {
            logger_1.default.error('EVM 사이드체인 서비스 초기화 실패', error);
            throw error;
        }
    }
    /**
     * 계정 XRP 잔액 조회
     * @param address EVM 주소
     */
    async getXRPBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers_1.ethers.formatEther(balance);
        }
        catch (error) {
            logger_1.default.error(`EVM 계정 잔액 조회 실패: ${address}`, error);
            throw error;
        }
    }
    /**
     * XRP 전송
     * @param destination 받는 주소
     * @param amount 전송할 XRP 양 (ETH 단위)
     */
    async sendXRP(destination, amount) {
        if (!this.bridgeWallet) {
            throw new Error('EVM 브릿지 지갑이 설정되지 않았습니다');
        }
        try {
            // 가스 가격 추정
            const feeData = await this.provider.getFeeData();
            // 트랜잭션 생성 및 전송
            const tx = await this.bridgeWallet.sendTransaction({
                to: destination,
                value: ethers_1.ethers.parseEther(amount),
                gasPrice: feeData.gasPrice || undefined
            });
            logger_1.default.info(`EVM XRP 전송 트랜잭션 전송됨: ${tx.hash}`);
            // 트랜잭션 확인 대기
            const receipt = await tx.wait();
            logger_1.default.info(`EVM XRP 전송 확인됨: ${amount} XRP to ${destination}, 블록: ${receipt?.blockNumber}`);
            return tx;
        }
        catch (error) {
            logger_1.default.error(`EVM XRP 전송 실패: ${amount} XRP to ${destination}`, error);
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
    async callContractMethod(contractAddress, abi, method, args = []) {
        try {
            const contract = new ethers_1.ethers.Contract(contractAddress, abi, this.provider);
            return await contract[method](...args);
        }
        catch (error) {
            logger_1.default.error(`컨트랙트 메서드 호출 실패: ${contractAddress}.${method}`, error);
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
    async executeContractMethod(contractAddress, abi, method, args = [], value = '0') {
        if (!this.bridgeWallet) {
            throw new Error('EVM 브릿지 지갑이 설정되지 않았습니다');
        }
        try {
            const contract = new ethers_1.ethers.Contract(contractAddress, abi, this.bridgeWallet);
            const tx = await contract[method](...args, { value: ethers_1.ethers.parseEther(value) });
            logger_1.default.info(`컨트랙트 메서드 실행 트랜잭션 전송됨: ${contractAddress}.${method}, 해시: ${tx.hash}`);
            // 트랜잭션 확인 대기
            const receipt = await tx.wait();
            logger_1.default.info(`컨트랙트 메서드 실행 확인됨: ${contractAddress}.${method}, 블록: ${receipt?.blockNumber}`);
            return tx;
        }
        catch (error) {
            logger_1.default.error(`컨트랙트 메서드 실행 실패: ${contractAddress}.${method}`, error);
            throw error;
        }
    }
    /**
     * 트랜잭션 상태 확인
     * @param txHash 트랜잭션 해시
     */
    async checkTransactionStatus(txHash) {
        try {
            return await this.provider.getTransactionReceipt(txHash);
        }
        catch (error) {
            logger_1.default.error(`트랜잭션 상태 확인 실패: ${txHash}`, error);
            throw error;
        }
    }
}
exports.default = new EVMService();
