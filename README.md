# XRP 브릿지 서비스

XRPL과 XRP EVM 사이드체인 간의 브릿지 서비스입니다.

## 주요 기능

- XRPL에서 XRP EVM 사이드체인으로 XRP 전송
- XRP EVM 사이드체인에서 XRPL로 XRP 전송
- 브릿지 요청 상태 조회
- 자동 XRP-BTC 스왑: 브릿지로 전송된 XRP를 BTC로 자동 스왑

## 프로젝트 구조

```
xrpl-bridge/
├── src/                    # 소스 코드
│   ├── config/             # 설정 파일
│   ├── contracts/          # 컨트랙트 ABI
│   ├── controllers/        # 컨트롤러
│   ├── middleware/         # 미들웨어
│   ├── models/             # 데이터 모델
│   ├── routes/             # API 라우트
│   ├── services/           # 서비스 로직
│   │   ├── xrplService.ts  # XRPL 서비스
│   │   ├── evmService.ts   # EVM 서비스
│   │   ├── swapService.ts  # 스왑 서비스
│   │   └── axelarBridgeService.ts # 브릿지 서비스
│   ├── utils/              # 유틸리티 함수
│   └── index.ts            # 애플리케이션 엔트리포인트
├── .env                    # 환경 변수
├── package.json            # 패키지 정보
└── tsconfig.json           # TypeScript 설정
```

## 설치 및 실행

1. 의존성 설치:
```bash
npm install
```

2. `.env` 파일 설정:
```
# XRPL 연결 설정
XRPL_NODE_URL=wss://testnet.xrpl-labs.com

# XRP EVM 사이드체인 연결 설정
EVM_SIDECHAIN_RPC_URL=https://rpc-evm-sidechain.xrpl.org
EVM_CHAIN_ID=1440002

# 브릿지 관리자 지갑 설정
XRPL_BRIDGE_WALLET_SEED=your_xrpl_wallet_seed
EVM_BRIDGE_PRIVATE_KEY=your_evm_private_key

# 스왑 컨트랙트 설정
SWAP_CONTRACT_ADDRESS=your_swap_contract_address
SWAP_PRIVATE_KEY=your_swap_wallet_private_key

# 기타 설정
PORT=3000
NODE_ENV=development
```

3. 개발 서버 실행:
```bash
npm run dev
```

4. 프로덕션 빌드:
```bash
npm run build
npm start
```

## API 엔드포인트

### 브릿지 API

- `POST /api/bridge/xrpl-to-evm`: XRPL에서 EVM 사이드체인으로 XRP 전송
  ```json
  {
    "sourceAddress": "rXrpAddress...",
    "destinationAddress": "0xEvmAddress...",
    "amount": "10",
    "sourceSeed": "optional_wallet_seed",
    "autoSwap": true
  }
  ```

- `POST /api/bridge/evm-to-xrpl`: EVM 사이드체인에서 XRPL로 XRP 전송
  ```json
  {
    "sourceAddress": "0xEvmAddress...",
    "destinationAddress": "rXrpAddress...",
    "amount": "10"
  }
  ```

- `GET /api/bridge/status/:txHash`: 브릿지 요청 상태 조회
  ```
  /api/bridge/status/0x1234567890ABCDEF?sourceChain=xrpl
  ```

## 자동 XRP-BTC 스왑 기능

XRP가 XRPL에서 EVM 사이드체인으로 브릿지되면, 자동으로 브릿지된 XRP를 BTC로 스왑할 수 있습니다.

### 스왑 과정

1. 사용자가 XRPL에서 EVM 사이드체인으로 XRP를 전송합니다.
2. 브릿지 서비스가 전송된 XRP와 동일한 양의 XRP를 EVM 사이드체인에서 목적지 주소로 전송합니다.
3. 자동 스왑 옵션이 활성화된 경우, 브릿지 서비스는 스왑 컨트랙트를 호출하여 받은 XRP를 BTC로 스왑합니다.
4. 스왑 결과로 사용자는 BTC(WBTC)를 받게 됩니다.

### 스왑 설정

스왑 기능을 사용하려면 다음 설정이 필요합니다:

1. `.env` 파일에 스왑 컨트랙트 주소와 개인키 설정:
   ```
   SWAP_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
   SWAP_PRIVATE_KEY=your_private_key
   ```

2. API 호출 시 `autoSwap` 파라미터를 `true`로 설정 (기본값은 `true`):
   ```json
   {
     "sourceAddress": "rXrpAddress...",
     "destinationAddress": "0xEvmAddress...",
     "amount": "10",
     "autoSwap": true
   }
   ```

### 스왑 응답

스왑이 성공적으로 실행되면, 브릿지 API 응답에 스왑 트랜잭션 해시가 포함됩니다:

```json
{
  "success": true,
  "data": {
    "txHash": "0xBridgeTxHash...",
    "status": "completed",
    "swapTxHash": "0xSwapTxHash..."
  }
}
```

## 라이센스

[MIT](LICENSE) 