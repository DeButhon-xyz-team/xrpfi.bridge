# XRPFI 프로젝트 구조

## 폴더 구조

```
xrpfi/
├── frontend/                  # 프론트엔드 애플리케이션
│   ├── public/                # 정적 파일
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── images/
│   ├── src/
│   │   ├── assets/            # 이미지, 폰트 등
│   │   ├── components/        # 재사용 가능한 컴포넌트
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   ├── staking/
│   │   │   └── wallet/
│   │   ├── contexts/          # React Context
│   │   ├── hooks/             # 커스텀 훅
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── services/          # API 서비스
│   │   ├── utils/             # 유틸리티 함수
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── routes.js
│   ├── .env
│   ├── package.json
│   └── README.md
│
├── backend/                   # 백엔드 서버
│   ├── config/                # 설정 파일
│   ├── controllers/           # 컨트롤러
│   ├── middleware/            # 미들웨어
│   ├── models/                # 데이터 모델
│   ├── routes/                # API 라우트
│   ├── services/              # 비즈니스 로직 서비스
│   │   ├── aave/
│   │   ├── axelar/
│   │   ├── xrpl/
│   │   └── evm/
│   ├── utils/                 # 유틸리티 함수
│   ├── .env
│   ├── package.json
│   ├── server.js
│   └── README.md
│
├── contracts/                 # 스마트 컨트랙트
│   ├── src/
│   │   ├── XRPStakingPool.sol
│   │   ├── RewardDistributor.sol
│   │   └── AxelarGateway.sol
│   ├── scripts/
│   │   ├── deploy.js
│   │   └── test-bridge.js
│   ├── test/
│   ├── hardhat.config.js
│   ├── package.json
│   └── README.md
│
├── docs/                      # 문서
│   ├── api-docs.md
│   ├── architecture.md
│   ├── XRPFI-Technical-Specification.md
│   └── presentation.pptx
│
├── .gitignore
├── docker-compose.yml
├── package.json
└── README.md
```

## 주요 컴포넌트 설명

### 프론트엔드 컴포넌트

1. **WalletConnect**: 지갑 연결 컴포넌트 (FuturePass, Xaman)
2. **DashboardSummary**: 스테이킹 및 수익 요약 표시
3. **AssetChart**: 자산 추이 그래프
4. **StakingForm**: 스테이킹 금액 입력 및 실행
5. **UnstakingForm**: 언스테이킹 금액 입력 및 실행
6. **TransactionHistory**: 거래 내역 표시
7. **APYCalculator**: 예상 수익률 계산기

### 백엔드 서비스

1. **WalletService**: 지갑 연결 및 인증 관리
2. **XRPLService**: XRP Ledger와의 통신
3. **AxelarBridgeService**: Axelar 브릿지 통합
4. **EVMService**: EVM 사이드체인 통신
5. **AaveService**: Aave V3 통합
6. **SwapService**: 토큰 스왑 서비스
7. **StakingService**: 스테이킹 관리 및 보상 계산

### 스마트 컨트랙트

1. **XRPStakingPool**: 스테이킹 자금 관리
2. **RewardDistributor**: 리워드 분배 로직
3. **AxelarGateway**: Axelar 연동 게이트웨이

## API 엔드포인트

### 사용자 API

1. `/api/wallet/connect`: 지갑 연결
2. `/api/staking/stake`: 스테이킹 실행
3. `/api/staking/unstake`: 언스테이킹 실행
4. `/api/user/dashboard`: 대시보드 정보 조회
5. `/api/user/transactions`: 트랜잭션 내역 조회
6. `/api/market/apy`: 수익률 정보 조회

### 내부 서비스 API

1. `/api/bridge/xrp-to-evm`: XRP → EVM 브릿지
2. `/api/bridge/evm-to-xrp`: EVM → XRP 브릿지
3. `/api/swap/xrp-to-wbtc`: XRP → WBTC 스왑
4. `/api/swap/wbtc-to-xrp`: WBTC → XRP 스왑
5. `/api/aave/deposit`: Aave 예치
6. `/api/aave/withdraw`: Aave 인출
7. `/api/xrpl/swap-to-rlusd`: XRP → RLUSD 스왑

## 데이터베이스 컬렉션

1. **users**: 사용자 정보
2. **transactions**: 트랜잭션 정보
3. **stakingPool**: 스테이킹 풀 정보
4. **rewards**: 리워드 정보
5. **bridgeRequests**: 브릿지 요청 정보

## 개발 도구 및 라이브러리

1. **프론트엔드**: React, Next.js, TailwindCSS, ethers.js, xrpl.js
2. **백엔드**: Node.js, Express, MongoDB, Mongoose
3. **블록체인**: xrpl-js, ethers.js, Axelar SDK
4. **스마트 컨트랙트**: Solidity, Hardhat, OpenZeppelin
5. **테스트**: Jest, Mocha, Chai
6. **배포**: Docker, AWS/Azure/GCP 