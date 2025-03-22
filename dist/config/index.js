"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 환경 변수 로드
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// 설정 객체 정의
const config = {
    // 서버 설정
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    // XRPL 설정
    xrpl: {
        nodeUrl: process.env.XRPL_NODE_URL || 'wss://s.altnet.rippletest.net:51233',
        bridgeWalletSeed: process.env.XRPL_BRIDGE_WALLET_SEED || '',
    },
    // EVM 사이드체인 설정
    evm: {
        rpcUrl: process.env.EVM_SIDECHAIN_RPC_URL || 'https://rpc-evm-sidechain.xrpl.org',
        chainId: parseInt(process.env.EVM_CHAIN_ID || '1440002'),
        bridgePrivateKey: process.env.EVM_BRIDGE_PRIVATE_KEY || '',
    },
    // Axelar 설정
    axelar: {
        apiUrl: process.env.AXELAR_API_URL || 'https://api.axelar.network',
        apiKey: process.env.AXELAR_API_KEY || '',
        gatewayContract: process.env.AXELAR_GATEWAY_CONTRACT || '',
    },
    // 데이터베이스 설정
    db: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/xrpl-bridge',
    },
};
// 필수 환경 변수 검증
const validateConfig = () => {
    if (!config.xrpl.bridgeWalletSeed) {
        throw new Error('XRPL_BRIDGE_WALLET_SEED 환경 변수가 설정되지 않았습니다');
    }
    if (!config.evm.bridgePrivateKey) {
        throw new Error('EVM_BRIDGE_PRIVATE_KEY 환경 변수가 설정되지 않았습니다');
    }
    if (!config.axelar.gatewayContract) {
        throw new Error('AXELAR_GATEWAY_CONTRACT 환경 변수가 설정되지 않았습니다');
    }
};
// 개발환경이 아니면 설정 검증
if (config.server.nodeEnv !== 'development') {
    validateConfig();
}
exports.default = config;
