import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

/**
 * MongoDB 데이터베이스 연결 함수
 */
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.db.uri);
    
    logger.info(`MongoDB 연결 성공: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB 연결 실패', error);
    process.exit(1);
  }
};

export default connectDB; 