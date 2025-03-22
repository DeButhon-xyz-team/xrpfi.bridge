"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * MongoDB 데이터베이스 연결 함수
 */
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(index_1.default.db.uri);
        logger_1.default.info(`MongoDB 연결 성공: ${conn.connection.host}`);
    }
    catch (error) {
        logger_1.default.error('MongoDB 연결 실패', error);
        process.exit(1);
    }
};
exports.default = connectDB;
