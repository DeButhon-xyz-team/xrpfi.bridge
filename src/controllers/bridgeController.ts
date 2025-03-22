import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import axelarBridgeService from '../services/axelarBridgeService';
import BridgeRequest, { BridgeDirection, BridgeRequestStatus } from '../models/BridgeRequest';

/**
 * XRPL에서 EVM 사이드체인으로 브릿지 요청 처리
 */
export const bridgeXrplToEvm = async (req: Request, res: Response) => {
  try {
    const { amount, sourceAddress, destinationAddress, sourceSeed, autoSwap = true } = req.body;

    // 입력값 검증
    if (!amount || !sourceAddress || !destinationAddress) {
      return res.status(400).json({
        success: false,
        message: '필수 입력값이 누락되었습니다 (amount, sourceAddress, destinationAddress)'
      });
    }

    // 요청 ID 생성
    const requestId = uuidv4();

    // DB에 브릿지 요청 저장
    const bridgeRequest = new BridgeRequest({
      requestId,
      amount,
      sourceAddress,
      destinationAddress,
      direction: BridgeDirection.XRPL_TO_EVM,
      status: BridgeRequestStatus.PENDING,
      autoSwap
    });

    await bridgeRequest.save();

    logger.info(`새로운 브릿지 요청 생성: ${requestId}`);

    // 비동기로 브릿지 처리 시작 (DB에 저장 후 응답 반환)
    processXrplToEvmBridge(requestId, amount, sourceAddress, destinationAddress, sourceSeed, autoSwap).catch(error => {
      logger.error(`브릿지 처리 실패: ${requestId}`, error);
    });

    return res.status(201).json({
      success: true,
      message: '브릿지 요청이 접수되었습니다',
      data: {
        requestId,
        status: BridgeRequestStatus.PENDING,
        sourceAddress,
        destinationAddress,
        amount,
        autoTransfer: !!sourceSeed,
        autoSwap
      }
    });
  } catch (error) {
    logger.error('브릿지 요청 처리 실패', error);
    
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: (error as Error).message
    });
  }
};

/**
 * EVM 사이드체인에서 XRPL로 브릿지 요청 처리
 */
export const bridgeEvmToXrpl = async (req: Request, res: Response) => {
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
    const requestId = uuidv4();

    // DB에 브릿지 요청 저장
    const bridgeRequest = new BridgeRequest({
      requestId,
      amount,
      sourceAddress,
      destinationAddress,
      direction: BridgeDirection.EVM_TO_XRPL,
      status: BridgeRequestStatus.PENDING
    });

    await bridgeRequest.save();

    logger.info(`새로운 브릿지 요청 생성: ${requestId}`);

    // 비동기로 브릿지 처리 시작 (DB에 저장 후 응답 반환)
    processEvmToXrplBridge(requestId, amount, sourceAddress, destinationAddress).catch(error => {
      logger.error(`브릿지 처리 실패: ${requestId}`, error);
    });

    return res.status(201).json({
      success: true,
      message: '브릿지 요청이 접수되었습니다',
      data: {
        requestId,
        status: BridgeRequestStatus.PENDING,
        sourceAddress,
        destinationAddress,
        amount
      }
    });
  } catch (error) {
    logger.error('브릿지 요청 처리 실패', error);
    
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: (error as Error).message
    });
  }
};

/**
 * 브릿지 요청 상태 조회
 */
export const getBridgeStatus = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: '요청 ID가 필요합니다'
      });
    }

    const bridgeRequest = await BridgeRequest.findOne({ requestId });
    
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
  } catch (error) {
    logger.error('브릿지 상태 조회 실패', error);
    
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: (error as Error).message
    });
  }
};

/**
 * XRPL에서 EVM 사이드체인으로 브릿지 처리 (비동기)
 */
const processXrplToEvmBridge = async (
  requestId: string,
  amount: string,
  sourceAddress: string,
  destinationAddress: string,
  sourceSeed?: string,
  autoSwap: boolean = true
) => {
  try {
    // Axelar 브릿지 서비스를 통해 브릿지 실행
    const result = await axelarBridgeService.bridgeXrplToEvm(
      amount,
      sourceAddress,
      destinationAddress,
      sourceSeed,
      autoSwap
    );

    // 브릿지 요청 정보 업데이트
    const updateData: any = {
      status: BridgeRequestStatus.COMPLETED,
      destinationTxHash: result.txHash,
      completedAt: new Date()
    };
    
    // 스왑 트랜잭션 해시가 있으면 추가
    if (result.swapTxHash) {
      updateData.swapTxHash = result.swapTxHash;
    }

    await BridgeRequest.findOneAndUpdate(
      { requestId },
      updateData
    );

    logger.info(`브릿지 요청 완료: ${requestId}${result.swapTxHash ? `, 스왑 완료: ${result.swapTxHash}` : ''}`);
  } catch (error) {
    // 에러 발생 시 브릿지 요청 상태 업데이트
    await BridgeRequest.findOneAndUpdate(
      { requestId },
      {
        status: BridgeRequestStatus.FAILED,
        errorMessage: (error as Error).message
      }
    );

    logger.error(`브릿지 요청 실패: ${requestId}`, error);
    throw error;
  }
};

/**
 * EVM 사이드체인에서 XRPL로 브릿지 처리 (비동기)
 */
const processEvmToXrplBridge = async (
  requestId: string,
  amount: string,
  sourceAddress: string,
  destinationAddress: string
) => {
  try {
    // Axelar 브릿지 서비스를 통해 브릿지 실행
    const result = await axelarBridgeService.bridgeEvmToXrpl(
      amount,
      sourceAddress,
      destinationAddress
    );

    // 브릿지 요청 정보 업데이트
    await BridgeRequest.findOneAndUpdate(
      { requestId },
      {
        status: BridgeRequestStatus.COMPLETED,
        destinationTxHash: result.txHash,
        completedAt: new Date()
      }
    );

    logger.info(`브릿지 요청 완료: ${requestId}`);
  } catch (error) {
    // 에러 발생 시 브릿지 요청 상태 업데이트
    await BridgeRequest.findOneAndUpdate(
      { requestId },
      {
        status: BridgeRequestStatus.FAILED,
        errorMessage: (error as Error).message
      }
    );

    logger.error(`브릿지 요청 실패: ${requestId}`, error);
    throw error;
  }
};