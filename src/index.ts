import express from 'express';
import cors from 'cors';
import config from './config';
import connectDB from './config/database';
import logger from './utils/logger';
import bridgeRoutes from './routes/bridgeRoutes';
import xrplService from './services/xrplService';
import evmService from './services/evmService';

// Express 앱 초기화
const app = express();

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// API 라우트 설정
app.use('/api/bridge', bridgeRoutes);

// 기본 라우트
app.get('/', (_req, res) => {
  res.json({ message: 'XRPL - XRP EVM Sidechain Bridge API' });
});

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 연결
    await connectDB();
    
    // XRPL 서비스 초기화
    await xrplService.connect();
    
    // EVM 서비스 초기화
    await evmService.initialize();
    
    // Express 서버 시작
    app.listen(config.server.port, () => {
      logger.info(`서버가 시작됨: http://localhost:${config.server.port}`);
    });
  } catch (error) {
    logger.error('서버 시작 실패', error);
    process.exit(1);
  }
};

// 프로세스 종료 처리
process.on('SIGINT', async () => {
  try {
    // XRPL 연결 종료
    await xrplService.disconnect();
    
    logger.info('서버가 정상적으로 종료됨');
    process.exit(0);
  } catch (error) {
    logger.error('서버 종료 중 오류 발생', error);
    process.exit(1);
  }
});

// 서버 시작
startServer(); 