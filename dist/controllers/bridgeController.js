"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBridgeStatus = exports.bridgeEvmToXrpl = exports.bridgeXrplToEvm = void 0;
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
const axelarBridgeService_1 = __importDefault(require("../services/axelarBridgeService"));
const BridgeRequest_1 = __importStar(require("../models/BridgeRequest"));
/**
 * XRPL에서 EVM 사이드체인으로 브릿지 요청
 */
const bridgeXrplToEvm = async (req, res) => {
    try {
        const { amount, sourceAddress, sourceSeed } = req.body;
        // 필수 파라미터 체크
        if (!amount || !sourceAddress) {
            return res.status(400).json({
                success: false,
                message: '필수 파라미터가 누락되었습니다: amount, sourceAddress'
            });
        }
        // 브릿지 요청 ID 생성
        const requestId = (0, uuid_1.v4)();
        // 새 브릿지 요청 생성 및 저장
        const bridgeRequest = new BridgeRequest_1.default({
            requestId,
            userId: req.user?._id || 'anonymous',
            sourceChain: 'XRPL',
            destinationChain: 'EVM',
            sourceAddress,
            // destinationAddress는 백엔드에서 자동 생성됨
            amount,
            status: BridgeRequest_1.BridgeRequestStatus.PENDING,
            createdAt: new Date()
        });
        await bridgeRequest.save();
        // 비동기 브릿지 처리 시작
        processXrplToEvmBridge(requestId, amount, sourceAddress, sourceSeed).catch(error => {
            logger_1.default.error(`브릿지 요청 처리 실패: ${requestId}`, error);
        });
        // 즉시 브릿지 요청 ID 응답
        return res.status(201).json({
            success: true,
            requestId,
            message: '브릿지 요청이 시작되었습니다'
        });
    }
    catch (error) {
        logger_1.default.error('XRPL에서 EVM으로 브릿지 요청 처리 중 오류 발생', error);
        return res.status(500).json({
            success: false,
            message: '브릿지 요청 처리 중 오류가 발생했습니다',
            error: error.message
        });
    }
};
exports.bridgeXrplToEvm = bridgeXrplToEvm;
/**
 * EVM 사이드체인에서 XRPL로 브릿지 요청 처리
 */
const bridgeEvmToXrpl = async (req, res) => {
    try {
        const { amount, sourceAddress, destinationAddress } = req.body;
        // 입력값 검증
        if (!amount || !sourceAddress || !destinationAddress) {
            return res.status(400).json({
                success: false,
                message: '필수 입력값이 누락되었습니다 (amount, sourceAddress, destinationAddress)'
            });
        }
        // 요청 ID 생성
        const requestId = (0, uuid_1.v4)();
        // DB에 브릿지 요청 저장
        const bridgeRequest = new BridgeRequest_1.default({
            requestId,
            amount,
            sourceAddress,
            destinationAddress,
            direction: BridgeRequest_1.BridgeDirection.EVM_TO_XRPL,
            status: BridgeRequest_1.BridgeRequestStatus.PENDING
        });
        await bridgeRequest.save();
        logger_1.default.info(`새로운 브릿지 요청 생성: ${requestId}`);
        // 비동기로 브릿지 처리 시작 (DB에 저장 후 응답 반환)
        processEvmToXrplBridge(requestId, amount, sourceAddress, destinationAddress).catch(error => {
            logger_1.default.error(`브릿지 처리 실패: ${requestId}`, error);
        });
        return res.status(201).json({
            success: true,
            message: '브릿지 요청이 접수되었습니다',
            data: {
                requestId,
                status: BridgeRequest_1.BridgeRequestStatus.PENDING,
                sourceAddress,
                destinationAddress,
                amount
            }
        });
    }
    catch (error) {
        logger_1.default.error('브릿지 요청 처리 실패', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다',
            error: error.message
        });
    }
};
exports.bridgeEvmToXrpl = bridgeEvmToXrpl;
/**
 * 브릿지 요청 상태 조회
 */
const getBridgeStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: '요청 ID가 필요합니다'
            });
        }
        const bridgeRequest = await BridgeRequest_1.default.findOne({ requestId });
        if (!bridgeRequest) {
            return res.status(404).json({
                success: false,
                message: '요청 ID에 해당하는 브릿지 요청을 찾을 수 없습니다'
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                requestId: bridgeRequest.requestId,
                status: bridgeRequest.status,
                sourceAddress: bridgeRequest.sourceAddress,
                destinationAddress: bridgeRequest.destinationAddress,
                amount: bridgeRequest.amount,
                direction: bridgeRequest.direction,
                sourceTxHash: bridgeRequest.sourceTxHash,
                destinationTxHash: bridgeRequest.destinationTxHash,
                createdAt: bridgeRequest.createdAt,
                completedAt: bridgeRequest.completedAt
            }
        });
    }
    catch (error) {
        logger_1.default.error('브릿지 상태 조회 실패', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다',
            error: error.message
        });
    }
};
exports.getBridgeStatus = getBridgeStatus;
/**
 * XRPL에서 EVM 사이드체인으로 브릿지 처리 (비동기)
 */
const processXrplToEvmBridge = async (requestId, amount, sourceAddress, sourceSeed) => {
    try {
        // Axelar 브릿지 서비스를 통해 브릿지 실행
        const result = await axelarBridgeService_1.default.bridgeXrplToEvm(amount, sourceAddress, sourceSeed);
        // 브릿지 요청 정보 업데이트
        await BridgeRequest_1.default.findOneAndUpdate({ requestId }, {
            status: BridgeRequest_1.BridgeRequestStatus.COMPLETED,
            destinationTxHash: result.txHash,
            destinationAddress: result.destinationAddress,
            completedAt: new Date()
        });
        logger_1.default.info(`브릿지 요청 완료: ${requestId}`);
    }
    catch (error) {
        // 에러 발생 시 브릿지 요청 상태 업데이트
        await BridgeRequest_1.default.findOneAndUpdate({ requestId }, {
            status: BridgeRequest_1.BridgeRequestStatus.FAILED,
            errorMessage: error.message
        });
        logger_1.default.error(`브릿지 요청 실패: ${requestId}`, error);
        throw error;
    }
};
/**
 * EVM 사이드체인에서 XRPL로 브릿지 처리 (비동기)
 */
const processEvmToXrplBridge = async (requestId, amount, sourceAddress, destinationAddress) => {
    try {
        // Axelar 브릿지 서비스를 통해 브릿지 실행
        const result = await axelarBridgeService_1.default.bridgeEvmToXrpl(amount, sourceAddress, destinationAddress);
        // 브릿지 요청 정보 업데이트
        await BridgeRequest_1.default.findOneAndUpdate({ requestId }, {
            status: BridgeRequest_1.BridgeRequestStatus.COMPLETED,
            destinationTxHash: result.txHash,
            completedAt: new Date()
        });
        logger_1.default.info(`브릿지 요청 완료: ${requestId}`);
    }
    catch (error) {
        // 에러 발생 시 브릿지 요청 상태 업데이트
        await BridgeRequest_1.default.findOneAndUpdate({ requestId }, {
            status: BridgeRequest_1.BridgeRequestStatus.FAILED,
            errorMessage: error.message
        });
        logger_1.default.error(`브릿지 요청 실패: ${requestId}`, error);
        throw error;
    }
};
