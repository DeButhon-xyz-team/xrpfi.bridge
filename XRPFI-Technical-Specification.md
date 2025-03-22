# XRPFI: XRPL 스테이킹 솔루션

## 프로젝트 개요

XRPFI(도메인: xrpfi.xyz)는 기본적으로 스테이킹 기능이 없는 XRP Ledger 사용자들에게 스테이킹 경험과 수익을 제공하는 혁신적인 서비스입니다. Axelar 네트워크를 활용하여 XRP를 EVM 호환 체인으로 브릿지하고, 해당 체인에서 스테이킹 수익을 창출한 후 다시 XRPL로 가져오는 방식을 구현합니다.

## 문제 정의

- XRP Ledger는 기본적으로 스테이킹 메커니즘을 제공하지 않음
- XRP 홀더들은 자산을 단순 보유하는 것 외에 추가 수익 창출 기회가 제한적
- 다른 암호화폐 대비 수익 창출 옵션 부족으로 인한 사용자 이탈 가능성

## 솔루션

XRPFI는 Axelar 네트워크를 통해 크로스체인 기능을 활용하여 XRP 보유자들에게 스테이킹 유사 경험을 제공합니다. 사용자의 XRP를 EVM 호환 체인으로 안전하게 브릿지하여 DeFi 프로토콜에서 수익을 창출하고, 그 이익을 XRPL 네이티브 토큰인 RLUSD 형태로 사용자에게 돌려줍니다.

## 기술 아키텍처

### 워크플로우

1. **XRP 수집**: XRPL에서 사용자의 XRP를 수집
2. **브릿징**: Axelar를 통해 XRP를 EVM 사이드체인으로 브릿지
3. **자산 스왑**: EVM 사이드체인에서 XRP를 WBTC로 스왑 (Uniswap 활용)
4. **예치**: WBTC를 Aave V3에 담보로 예치하여 수익 창출
5. **수익 회수**: 발생한 수익(WBTC)을 XRP로 재스왑
6. **리브릿징**: Axelar를 통해 XRP를 XRPL 메인넷으로 브릿지 백
7. **안정화폐 스왑**: XRPL 내장 DEX에서 XRP를 RLUSD로 스왑
8. **보상 분배**: 스테이킹 사용자에게 RLUSD 형태로 수익 분배

```
┌─────────────┐    ┌───────────────┐    ┌──────────────┐    ┌────────────┐
│             │    │               │    │              │    │            │
│  사용자 XRP  │───▶│ Axelar 브릿지 │───▶│ EVM 사이드체인│───▶│ WBTC 스왑  │
│             │    │               │    │              │    │            │
└─────────────┘    └───────────────┘    └──────────────┘    └─────┬──────┘
                                                                  │
┌─────────────┐    ┌───────────────┐    ┌──────────────┐    ┌─────▼──────┐
│             │    │               │    │              │    │            │
│ RLUSD 보상  │◀───│   XRP 스왑    │◀───│ Axelar 브릿지 │◀───│  Aave 예치 │
│             │    │               │    │              │    │            │
└─────────────┘    └───────────────┘    └──────────────┘    └────────────┘
```

### 기술 스택
**전부 타입스크립트로 짤것.**

- **프론트엔드**: 
  - React.js / Next.js
  - TailwindCSS
  - ethers.js (웹3 통합)
  - xrpl.js (XRPL 통합)

- **백엔드**: 
  - Node.js
  - Express
  - MongoDB (사용자 데이터 및 트랜잭션 기록)

- **블록체인 연결**:
  - XRPL: xrpl.js
  - EVM: ethers.js
  - Axelar: Axelar SDK

- **스마트 컨트랙트**: 
  - Solidity (EVM 사이드체인용)
  - Hardhat (개발 환경)

- **지갑 통합**: 
  - FuturePass
  - Xaman (구 XUMM)

## 주요 기능

### 1. 사용자 인터페이스

#### 홈 대시보드
- 총 스테이킹 금액 표시
- 누적 수익 표시
- 자산 추이 그래프 (시간별/일별/주별/월별)
- 현재 APY 표시
- 스테이킹/언스테이킹 바로가기 버튼

#### 지갑 연결
- FuturePass 지갑 연결
- Xaman 지갑 연결
- 연결된 지갑 주소 표시
- 지갑 잔액 표시

#### 스테이킹 페이지
- 스테이킹 금액 입력 폼
- 최소/최대 스테이킹 금액 표시
- 예상 수익률 계산기
- 가스비 추정
- 확인 및 실행 버튼

#### 언스테이킹 페이지
- 언스테이킹 금액 입력 폼
- 현재 스테이킹 중인 금액 표시
- 출금 가능 시간 안내
- 확인 및 실행 버튼

#### 트랜잭션 히스토리
- 스테이킹/언스테이킹 기록
- 보상 수령 기록
- 트랜잭션 상태 표시
- 블록 익스플로러 링크

### 2. 백엔드 서비스

#### XRPL 인터페이스
- 지갑 연결 및 인증
- XRP 트랜잭션 생성 및 제출
- 계정 잔액 및 트랜잭션 모니터링
- XRPL 네트워크 상태 확인

#### Axelar 브릿지 모듈
- XRP → EVM 브릿지 요청 처리
- EVM → XRPL 브릿지 요청 처리
- 브릿지 상태 모니터링
- 트랜잭션 확인 및 검증

#### EVM 인터페이스
- WBTC 스왑 로직
- Aave V3 예치 로직
- 수익 계산 및 회수 로직
- 가스비 최적화

#### 스테이킹 로직
- 사용자별 스테이킹 금액 추적
- 수익 계산 및 분배 알고리즘
- 스테이킹/언스테이킹 요청 처리
- 리워드 풀 관리

#### 보안 모듈
- 트랜잭션 서명 검증
- 브릿지 검증
- 오라클 데이터 검증
- 이상 거래 탐지

### 3. 스마트 컨트랙트

#### XRPStakingPool.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract XRPStakingPool is Ownable, ReentrancyGuard {
    IERC20 public xrpToken;
    IERC20 public wbtcToken;
    
    address public aavePoolAddress;
    address public uniswapRouterAddress;
    
    uint256 public totalStaked;
    mapping(address => uint256) public stakedAmount;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsHarvested(uint256 amount);
    
    constructor(
        address _xrpToken,
        address _wbtcToken,
        address _aavePool,
        address _uniswapRouter
    ) {
        xrpToken = IERC20(_xrpToken);
        wbtcToken = IERC20(_wbtcToken);
        aavePoolAddress = _aavePool;
        uniswapRouterAddress = _uniswapRouter;
    }
    
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        xrpToken.transferFrom(msg.sender, address(this), amount);
        
        // 스왑 및 예치 로직
        swapXRPToWBTC(amount);
        depositToAave();
        
        stakedAmount[msg.sender] += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedAmount[msg.sender] >= amount, "Insufficient staked amount");
        
        // Aave에서 인출 및 스왑 로직
        withdrawFromAave(amount);
        swapWBTCToXRP();
        
        xrpToken.transfer(msg.sender, amount);
        
        stakedAmount[msg.sender] -= amount;
        totalStaked -= amount;
        
        emit Unstaked(msg.sender, amount);
    }
    
    function harvestRewards() external onlyOwner {
        // 수익 수확 로직
        // ...
        
        emit RewardsHarvested(rewardsAmount);
    }
    
    function swapXRPToWBTC(uint256 amount) internal {
        // Uniswap 스왑 로직
        // ...
    }
    
    function depositToAave() internal {
        // Aave 예치 로직
        // ...
    }
    
    function withdrawFromAave(uint256 amount) internal {
        // Aave 인출 로직
        // ...
    }
    
    function swapWBTCToXRP() internal {
        // Uniswap 스왑 로직
        // ...
    }
}
```

#### RewardDistributor.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RewardDistributor is Ownable, ReentrancyGuard {
    IERC20 public rewardToken;
    address public stakingPool;
    
    mapping(address => uint256) public userRewards;
    uint256 public totalRewards;
    
    event RewardsDistributed(uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor(address _rewardToken, address _stakingPool) {
        rewardToken = IERC20(_rewardToken);
        stakingPool = _stakingPool;
    }
    
    function distributeRewards(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        require(users.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < users.length; i++) {
            userRewards[users[i]] += amounts[i];
            totalAmount += amounts[i];
        }
        
        totalRewards += totalAmount;
        
        emit RewardsDistributed(totalAmount);
    }
    
    function claimRewards() external nonReentrant {
        uint256 amount = userRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        
        userRewards[msg.sender] = 0;
        rewardToken.transfer(msg.sender, amount);
        
        emit RewardsClaimed(msg.sender, amount);
    }
}
```

#### AxelarGateway.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AxelarGateway is AxelarExecutable, Ownable {
    IAxelarGasService public immutable gasService;
    string public constant SOURCE_CHAIN = "XRPL";
    string public constant DESTINATION_CHAIN = "EVM_SIDECHAIN";
    
    event MessageSent(string destinationChain, string destinationAddress, bytes payload);
    event MessageExecuted(string sourceChain, string sourceAddress, bytes payload);
    
    constructor(address gateway_, address gasService_) AxelarExecutable(gateway_) {
        gasService = IAxelarGasService(gasService_);
    }
    
    function sendMessage(
        string calldata destinationAddress,
        bytes calldata payload
    ) external payable {
        gasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            DESTINATION_CHAIN,
            destinationAddress,
            payload,
            msg.sender
        );
        
        gateway.callContract(
            DESTINATION_CHAIN,
            destinationAddress,
            payload
        );
        
        emit MessageSent(DESTINATION_CHAIN, destinationAddress, payload);
    }
    
    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        // 메시지 처리 로직
        // ...
        
        emit MessageExecuted(sourceChain, sourceAddress, payload);
    }
}
```

## API 명세

### 사용자 API

#### 지갑 연결
```
POST /api/wallet/connect
Request: {
  "walletType": "futurePass" | "xaman",
  "address": "string"
}
Response: {
  "success": true,
  "userId": "string",
  "address": "string",
  "balance": "number"
}
```

#### 스테이킹
```
POST /api/staking/stake
Request: {
  "userId": "string",
  "amount": "number"
}
Response: {
  "success": true,
  "transactionId": "string",
  "amount": "number",
  "timestamp": "number"
}
```

#### 언스테이킹
```
POST /api/staking/unstake
Request: {
  "userId": "string",
  "amount": "number"
}
Response: {
  "success": true,
  "transactionId": "string",
  "amount": "number",
  "timestamp": "number"
}
```

#### 대시보드 정보
```
GET /api/user/dashboard?userId=string
Response: {
  "totalStaked": "number",
  "totalRewards": "number",
  "currentAPY": "number",
  "assetHistory": [
    {
      "timestamp": "number",
      "totalValue": "number",
      "stakedAmount": "number",
      "rewardsAmount": "number"
    }
  ]
}
```

#### 트랜잭션 조회
```
GET /api/user/transactions?userId=string&page=number&limit=number
Response: {
  "transactions": [
    {
      "id": "string",
      "type": "stake" | "unstake" | "reward",
      "amount": "number",
      "status": "pending" | "completed" | "failed",
      "timestamp": "number",
      "txHash": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### 수익률 정보
```
GET /api/market/apy
Response: {
  "currentAPY": "number",
  "historicalAPY": [
    {
      "timestamp": "number",
      "apy": "number"
    }
  ],
  "projectedAPY": "number"
}
```

### 내부 서비스 API

#### XRP → EVM 브릿지
```
POST /api/bridge/xrp-to-evm
Request: {
  "userId": "string",
  "amount": "number",
  "sourceAddress": "string",
  "destinationAddress": "string"
}
Response: {
  "bridgeId": "string",
  "status": "pending",
  "sourceTxHash": "string"
}
```

#### EVM → XRP 브릿지
```
POST /api/bridge/evm-to-xrp
Request: {
  "userId": "string",
  "amount": "number",
  "sourceAddress": "string",
  "destinationAddress": "string"
}
Response: {
  "bridgeId": "string",
  "status": "pending",
  "sourceTxHash": "string"
}
```

#### XRP → WBTC 스왑
```
POST /api/swap/xrp-to-wbtc
Request: {
  "amount": "number",
  "minAmountOut": "number"
}
Response: {
  "swapId": "string",
  "inputAmount": "number",
  "outputAmount": "number",
  "txHash": "string"
}
```

#### WBTC → XRP 스왑
```
POST /api/swap/wbtc-to-xrp
Request: {
  "amount": "number",
  "minAmountOut": "number"
}
Response: {
  "swapId": "string",
  "inputAmount": "number",
  "outputAmount": "number",
  "txHash": "string"
}
```

#### Aave 예치
```
POST /api/aave/deposit
Request: {
  "asset": "string",
  "amount": "number"
}
Response: {
  "depositId": "string",
  "asset": "string",
  "amount": "number",
  "aToken": "string",
  "aTokenAmount": "number",
  "txHash": "string"
}
```

#### Aave 인출
```
POST /api/aave/withdraw
Request: {
  "asset": "string",
  "amount": "number"
}
Response: {
  "withdrawId": "string",
  "asset": "string",
  "amount": "number",
  "txHash": "string"
}
```

#### XRP → RLUSD 스왑
```
POST /api/xrpl/swap-to-rlusd
Request: {
  "amount": "number",
  "destinationAddress": "string"
}
Response: {
  "swapId": "string",
  "inputAmount": "number",
  "outputAmount": "number",
  "txHash": "string"
}
```

## 데이터베이스 스키마

### User 스키마
```javascript
{
  userId: String,
  walletAddress: String,
  walletType: String,
  totalStaked: Number,
  totalRewards: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction 스키마
```javascript
{
  transactionId: String,
  userId: String,
  type: String,
  amount: Number,
  status: String,
  txHash: String,
  sourceChain: String,
  destinationChain: String,
  createdAt: Date,
  completedAt: Date
}
```

### StakingPool 스키마
```javascript
{
  totalStaked: Number,
  totalUsers: Number,
  currentAPY: Number,
  lastHarvestTime: Date,
  totalHarvested: Number
}
```

## 개발 로드맵

### MVP 단계 (해커톤용)

1. **기본 인프라 설정**
   - 리포지토리 설정
   - 개발 환경 구성
   - CI/CD 파이프라인

2. **프론트엔드 코어 기능**
   - 기본 UI 컴포넌트
   - 지갑 연결 모듈 (FuturePass, Xaman)
   - 스테이킹/언스테이킹 UI

3. **백엔드 코어 기능**
   - 사용자 인증 및 세션 관리
   - 트랜잭션 처리 로직
   - 데이터베이스 연결

4. **블록체인 통합**
   - XRPL 노드 연결
   - Axelar 브릿지 통합
   - EVM 사이드체인 연결

5. **스마트 컨트랙트 배포**
   - 스테이킹 풀 컨트랙트
   - 리워드 분배 컨트랙트
   - Axelar 게이트웨이 컨트랙트

6. **테스트 및 디버깅**
   - 단위 테스트
   - 통합 테스트
   - E2E 테스트

### 구현 단계별 우선순위

1. **Phase 1: 지갑 연결 및 기본 UI**
   - 지갑 연결 모듈
   - 기본 대시보드 UI
   - 세션 관리

2. **Phase 2: XRPL 통합**
   - XRP 트랜잭션 생성
   - 계정 잔액 조회
   - 트랜잭션 모니터링

3. **Phase 3: Axelar 브릿지**
   - 브릿지 컨트랙트 배포
   - XRP → EVM 브릿지 로직
   - EVM → XRP 브릿지 로직

4. **Phase 4: EVM 사이드체인 로직**
   - WBTC 스왑 로직
   - Aave 예치 로직
   - 수익 수확 로직

5. **Phase 5: 리워드 시스템**
   - 수익 계산 알고리즘
   - RLUSD 스왑 로직
   - 리워드 분배 시스템

6. **Phase 6: 모니터링 및 분석**
   - 트랜잭션 모니터링
   - 수익 분석
   - 사용자 활동 추적

## 테스트 전략

1. **단위 테스트**
   - 개별 함수 및 모듈 테스트
   - 스마트 컨트랙트 함수 테스트
   - API 엔드포인트 테스트

2. **통합 테스트**
   - 모듈 간 상호작용 테스트
   - 블록체인 네트워크 통합 테스트
   - 데이터 흐름 검증

3. **E2E 테스트**
   - 사용자 시나리오 테스트
   - UI/UX 테스트
   - 성능 테스트

4. **테스트넷 검증**
   - XRPL 테스트넷 검증
   - EVM 테스트넷 검증
   - Axelar 테스트넷 검증

## 보안 고려사항

1. **스마트 컨트랙트 보안**
   - 코드 감사
   - 알려진 취약점 검사
   - 접근 제어 검증

2. **트랜잭션 보안**
   - 서명 검증
   - 이중 지불 방지
   - 트랜잭션 타임아웃

3. **브릿지 보안**
   - 크로스체인 검증
   - 릴레이어 검증
   - 슬래싱 메커니즘

4. **서버 보안**
   - 액세스 제어
   - 입력 검증
   - DoS 방어

5. **사용자 자금 보호**
   - 멀티시그 지갑
   - 출금 제한
   - 이상 거래 탐지

## 결론

XRPFI는 XRP Ledger에 스테이킹과 유사한 기능을 도입하여 XRP 홀더들에게 추가 수익 창출 기회를 제공합니다. Axelar 네트워크를 활용한 크로스체인 브릿지를 통해 XRP를 EVM 호환 체인으로 이동시키고, DeFi 프로토콜을 활용해 수익을 창출한 후 다시 XRPL로 가져오는 혁신적인 모델을 구현합니다.

해커톤을 위한 MVP 버전은 핵심 기능에 집중하여 개발되며, 이후 단계적으로 기능을 확장해 나갈 예정입니다. 보안과 사용자 경험을 최우선으로 고려하여 안전하고 사용하기 쉬운 서비스를 제공하는 것이 XRPFI의 목표입니다. 