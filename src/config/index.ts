import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
  
  // 스왑 컨트랙트 설정
  swap: {
    contractAddress: process.env.SWAP_CONTRACT_ADDRESS || '',
    privateKey: process.env.SWAP_PRIVATE_KEY || '',
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
  
  if (!config.swap.contractAddress) {
    throw new Error('SWAP_CONTRACT_ADDRESS 환경 변수가 설정되지 않았습니다');
  }
  
  if (!config.swap.privateKey) {
    throw new Error('SWAP_PRIVATE_KEY 환경 변수가 설정되지 않았습니다');
  }
};

// 개발환경이 아니면 설정 검증
if (config.server.nodeEnv !== 'development') {
  validateConfig();
}

export default config; 