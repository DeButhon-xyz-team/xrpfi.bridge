"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = __importDefault(require("./config"));
const database_1 = __importDefault(require("./config/database"));
const logger_1 = __importDefault(require("./utils/logger"));
const bridgeRoutes_1 = __importDefault(require("./routes/bridgeRoutes"));
const xrplService_1 = __importDefault(require("./services/xrplService"));
const evmService_1 = __importDefault(require("./services/evmService"));
// Express 앱 초기화
const app = (0, express_1.default)();
// 미들웨어 설정
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
// API 라우트 설정
app.use('/api/bridge', bridgeRoutes_1.default);
// 기본 라우트
app.get('/', (_req, res) => {
    res.json({ message: 'XRPL - XRP EVM Sidechain Bridge API' });
});
// 서버 시작
const startServer = async () => {
    try {
        // 데이터베이스 연결
        await (0, database_1.default)();
        // XRPL 서비스 초기화
        await xrplService_1.default.connect();
        // EVM 서비스 초기화
        await evmService_1.default.initialize();
        // Express 서버 시작
        app.listen(config_1.default.server.port, () => {
            logger_1.default.info(`서버가 시작됨: http://localhost:${config_1.default.server.port}`);
        });
    }
    catch (error) {
        logger_1.default.error('서버 시작 실패', error);
        process.exit(1);
    }
};
// 프로세스 종료 처리
process.on('SIGINT', async () => {
    try {
        // XRPL 연결 종료
        await xrplService_1.default.disconnect();
        logger_1.default.info('서버가 정상적으로 종료됨');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('서버 종료 중 오류 발생', error);
        process.exit(1);
    }
});
// 서버 시작
startServer();
