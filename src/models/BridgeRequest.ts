import mongoose, { Document, Schema } from 'mongoose';

/**
 * 브릿지 요청 상태 열거형
 */
export enum BridgeRequestStatus {
  PENDING = 'pending',    // 처리 중
  COMPLETED = 'completed', // 완료됨
  FAILED = 'failed',      // 실패
  REFUNDED = 'refunded'   // 환불됨
}

/**
 * 브릿지 방향 열거형
 */
export enum BridgeDirection {
  XRPL_TO_EVM = 'xrpl_to_evm',
  EVM_TO_XRPL = 'evm_to_xrpl'
}

/**
 * 브릿지 요청 인터페이스
 */
export interface IBridgeRequest extends Document {
  requestId: string;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  direction: BridgeDirection;
  status: BridgeRequestStatus;
  sourceTxHash: string;
  destinationTxHash: string;
  swapTxHash?: string;
  autoSwap?: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * 브릿지 요청 스키마
 */
const BridgeRequestSchema: Schema = new Schema(
  {
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
    swapTxHash: {
      type: String,
      required: false
    },
    autoSwap: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: true
  }
);

// 인덱스 정의
BridgeRequestSchema.index({ requestId: 1 });
BridgeRequestSchema.index({ sourceAddress: 1 });
BridgeRequestSchema.index({ status: 1 });
BridgeRequestSchema.index({ createdAt: 1 });

const BridgeRequest = mongoose.model<IBridgeRequest>('BridgeRequest', BridgeRequestSchema);

export default BridgeRequest; 