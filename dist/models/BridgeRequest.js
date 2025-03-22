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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeDirection = exports.BridgeRequestStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * 브릿지 요청 상태 열거형
 */
var BridgeRequestStatus;
(function (BridgeRequestStatus) {
    BridgeRequestStatus["PENDING"] = "pending";
    BridgeRequestStatus["COMPLETED"] = "completed";
    BridgeRequestStatus["FAILED"] = "failed";
    BridgeRequestStatus["REFUNDED"] = "refunded"; // 환불됨
})(BridgeRequestStatus || (exports.BridgeRequestStatus = BridgeRequestStatus = {}));
/**
 * 브릿지 방향 열거형
 */
var BridgeDirection;
(function (BridgeDirection) {
    BridgeDirection["XRPL_TO_EVM"] = "xrpl_to_evm";
    BridgeDirection["EVM_TO_XRPL"] = "evm_to_xrpl";
})(BridgeDirection || (exports.BridgeDirection = BridgeDirection = {}));
/**
 * 브릿지 요청 스키마
 */
const BridgeRequestSchema = new mongoose_1.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    sourceAddress: {
        type: String,
        required: true
    },
    destinationAddress: {
        type: String,
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    direction: {
        type: String,
        enum: Object.values(BridgeDirection),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(BridgeRequestStatus),
        default: BridgeRequestStatus.PENDING
    },
    sourceTxHash: {
        type: String,
        required: false
    },
    destinationTxHash: {
        type: String,
        required: false
    },
    completedAt: {
        type: Date,
        required: false
    },
    errorMessage: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});
// 인덱스 정의
BridgeRequestSchema.index({ requestId: 1 });
BridgeRequestSchema.index({ sourceAddress: 1 });
BridgeRequestSchema.index({ status: 1 });
BridgeRequestSchema.index({ createdAt: 1 });
const BridgeRequest = mongoose_1.default.model('BridgeRequest', BridgeRequestSchema);
exports.default = BridgeRequest;
