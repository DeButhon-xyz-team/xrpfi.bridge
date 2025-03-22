"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bridgeController_1 = require("../controllers/bridgeController");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/bridge/xrpl-to-evm
 * @desc    XRPL에서 EVM 사이드체인으로 XRP 브릿지
 * @access  Public
 */
router.post('/xrpl-to-evm', bridgeController_1.bridgeXrplToEvm);
/**
 * @route   POST /api/bridge/evm-to-xrpl
 * @desc    EVM 사이드체인에서 XRPL로 XRP 브릿지
 * @access  Public
 */
router.post('/evm-to-xrpl', bridgeController_1.bridgeEvmToXrpl);
/**
 * @route   GET /api/bridge/status/:requestId
 * @desc    브릿지 요청 상태 조회
 * @access  Public
 */
router.get('/status/:requestId', bridgeController_1.getBridgeStatus);
exports.default = router;
