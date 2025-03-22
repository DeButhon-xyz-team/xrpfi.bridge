import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';

// 지갑 정보와 전송할 금액 설정 (이 정보를 실제 지갑 정보로 수정하세요)
const walletSeed = 'sEdSuQ3uHMecWcVMRB56yxjyxK5dNQ5'; // 이것은 예시입니다. 실제 시드로 교체하세요
const amountToSend = '5'; // 5 XRP
const bridgeWalletAddress = 'r4Hq9CM2RGKKQ3xg3rdT49nEC9ixmoNbYG';

// XRP 전송 함수
const sendXRP = async () => {
  console.log('XRPL 테스트넷에 연결 중...');
  
  // 테스트넷에 연결
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  
  console.log('테스트넷 연결 성공');
  
  try {
    // 지갑 생성
    const wallet = Wallet.fromSeed(walletSeed);
    console.log(`지갑 주소: ${wallet.address}`);
    
    // 잔액 확인
    const accountInfo = await client.request({
      command: 'account_info',
      account: wallet.address,
      ledger_index: 'validated'
    });
    
    const balance = dropsToXrp(accountInfo.result.account_data.Balance);
    console.log(`현재 잔액: ${balance} XRP`);
    
    if (parseFloat(balance) < parseFloat(amountToSend) + 10) { // 최소 준비금(10 XRP)도 고려
      console.error('잔액이 충분하지 않습니다.');
      return;
    }
    
    // 브릿지 지갑으로 XRP 전송
    console.log(`${amountToSend} XRP를 ${bridgeWalletAddress}로 전송 중...`);
    
    // 전송 트랜잭션 준비
    const prepared = await client.autofill({
      TransactionType: 'Payment',
      Account: wallet.address,
      Amount: xrpToDrops(amountToSend),
      Destination: bridgeWalletAddress
    });
    
    // 트랜잭션 서명
    const signed = wallet.sign(prepared);
    console.log(`트랜잭션 서명됨: ${signed.hash}`);
    
    // 트랜잭션 제출
    console.log('서명된 트랜잭션 제출 중...');
    const submitResult = await client.submitAndWait(signed.tx_blob);
    
    console.log('트랜잭션 제출 결과:');
    if (submitResult.result.meta && typeof submitResult.result.meta !== 'string') {
      console.log(`결과: ${submitResult.result.meta.TransactionResult}`);
    }
    console.log(`해시: ${submitResult.result.hash}`);
    console.log(`${amountToSend} XRP가 ${bridgeWalletAddress}로 전송되었습니다.`);
    
    // 새 잔액 확인
    const newAccountInfo = await client.request({
      command: 'account_info',
      account: wallet.address,
      ledger_index: 'validated'
    });
    
    console.log(`새 잔액: ${dropsToXrp(newAccountInfo.result.account_data.Balance)} XRP`);
    
    // API 호출 제안
    console.log('\n브릿지 API 호출을 위한 curl 명령어:');
    console.log(`curl -X POST http://localhost:3000/api/bridge/xrpl-to-evm \\
  -H "Content-Type: application/json" \\
  -d '{"sourceAddress": "${wallet.address}", "destinationAddress": "0xFE8d94b2605EE277b74aFdF1C8820eb3287388d3", "amount": "${amountToSend}"}'`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
  
  // 연결 종료
  await client.disconnect();
};

// 실행
sendXRP().catch(console.error); 