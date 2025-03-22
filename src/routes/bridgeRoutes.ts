import { Router } from 'express';
import { bridgeXrplToEvm, bridgeEvmToXrpl, getBridgeStatus } from '../controllers/bridgeController';

const router = Router();

/**
 * @route   POST /api/bridge/xrpl-to-evm
 * @desc    XRPL에서 EVM 사이드체인으로 XRP 브릿지
 * @access  Public
 */
router.post('/xrpl-to-evm', bridgeXrplToEvm);

/**
 * @route   POST /api/bridge/evm-to-xrpl
 * @desc    EVM 사이드체인에서 XRPL로 XRP 브릿지
 * @access  Public
 */
router.post('/evm-to-xrpl', bridgeEvmToXrpl);

/**
 * @route   GET /api/bridge/status/:requestId
 * @desc    브릿지 요청 상태 조회
 * @access  Public
 */
router.get('/status/:requestId', getBridgeStatus);

export default router; 