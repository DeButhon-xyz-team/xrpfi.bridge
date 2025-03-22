# XRPL-XRP EVM 사이드체인 브릿지

이 프로젝트는 XRPL(XRP Ledger)과 XRP EVM 사이드체인 간의 XRP 토큰 브릿지 기능을 제공하는 서비스입니다. Axelar Network를 활용하여 크로스체인 자산 전송을 구현합니다.

## 주요 기능

- XRPL에서 XRP EVM 사이드체인으로 XRP 전송
- XRP EVM 사이드체인에서 XRPL로 XRP 전송
- 브릿지 요청 상태 조회 및 추적

## 기술 스택

- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: xrpl.js (XRPL 연동), ethers.js (EVM 연동)
- **크로스체인**: Axelar Network SDK
- **데이터베이스**: MongoDB
- **기타**: Winston(로깅), UUID(고유 ID 생성)

## 시작하기

### 사전 요구사항

- Node.js v16 이상
- MongoDB
- XRPL 지갑 (테스트넷 또는 메인넷)
- XRP EVM 사이드체인 지갑

### 설치 방법

1. 저장소 클론
```
git clone https://github.com/yourusername/xrpl-bridge.git
cd xrpl-bridge
```

2. 의존성 설치
```
npm install
```

3. 환경 변수 설정
```
cp .env.example .env
```
`.env` 파일을 편집하여 필요한 설정값 입력

4. 서버 실행
```
npm run dev  # 개발 모드
npm run build && npm start  # 프로덕션 모드
```

## API 엔드포인트

### XRPL에서 EVM으로 브릿지
```
POST /api/bridge/xrpl-to-evm

요청 본문:
{
  "sourceAddress": "rXRPLAddress...",
  "destinationAddress": "0xEVMAddress...",
  "amount": "10.0"
}

응답:
{
  "success": true,
  "message": "브릿지 요청이 접수되었습니다",
  "data": {
    "requestId": "uuid...",
    "status": "pending",
    "sourceAddress": "rXRPLAddress...",
    "destinationAddress": "0xEVMAddress...",
    "amount": "10.0"
  }
}
```

### EVM에서 XRPL로 브릿지
```
POST /api/bridge/evm-to-xrpl

요청 본문:
{
  "sourceAddress": "0xEVMAddress...",
  "destinationAddress": "rXRPLAddress...",
  "amount": "10.0"
}
```

### 브릿지 상태 조회
```
GET /api/bridge/status/:requestId

응답:
{
  "success": true,
  "data": {
    "requestId": "uuid...",
    "status": "completed",
    "sourceAddress": "rXRPLAddress...",
    "destinationAddress": "0xEVMAddress...",
    "amount": "10.0",
    "direction": "xrpl_to_evm",
    "sourceTxHash": "hash...",
    "destinationTxHash": "hash...",
    "createdAt": "2023-01-01T00:00:00Z",
    "completedAt": "2023-01-01T00:01:00Z"
  }
}
```

## 브릿지 작동 방식

1. 사용자가 XRPL에서 브릿지 지갑으로 XRP를 보냅니다.
2. 브릿지 서비스가 이 트랜잭션을 감지합니다.
3. 브릿지 서비스가 XRP EVM 사이드체인에서 동일한 금액의 XRP를 사용자의 목적지 주소로 전송합니다.
4. 브릿지 서비스가 트랜잭션 상태를 추적하고 데이터베이스에 기록합니다.

## 라이센스

MIT 