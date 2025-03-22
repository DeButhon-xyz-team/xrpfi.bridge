"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAxelarAminoConverters = void 0;
const encoding_1 = require("@cosmjs/encoding");
const utils_1 = require("@cosmjs/stargate/build/queryclient/utils");
const const_1 = require("../const");
const long_1 = __importDefault(require("long"));
const createAxelarAminoConverters = () => ({
    // nexus module
    "/axelar.nexus.v1beta1.SetTransferRateLimitRequest": {
        aminoType: "nexus/SetTransferRateLimit",
        toAmino: ({ sender, chain, limit: { amount, denom }, window: { seconds, nanos } }) => ({
            sender: (0, encoding_1.toBech32)(const_1.AXELAR_PREFIX, sender),
            chain,
            window: long_1.default.fromValue(seconds).multiply(1000000000).add(nanos).toString(),
            limit: {
                amount,
                denom,
            },
        }),
        fromAmino: ({ sender, chain, limit: { amount, denom }, window }) => ({
            sender: (0, utils_1.toAccAddress)(sender),
            chain,
            window: {
                seconds: long_1.default.fromNumber(Number(window) / 1000000000),
                nanos: Number(window) % 1000000000,
            },
            limit: {
                amount,
                denom,
            },
        }),
    },
    "/axelar.nexus.v1beta1.ActivateChainRequest": {
        aminoType: "nexus/ActivateChain",
        toAmino: ({ sender, chains }) => ({
            sender: (0, encoding_1.toBech32)(const_1.AXELAR_PREFIX, sender),
            chains,
        }),
        fromAmino: ({ sender, chains }) => ({
            sender: (0, utils_1.toAccAddress)(sender),
            chains,
        }),
    },
    "/axelar.nexus.v1beta1.DeactivateChainRequest": {
        aminoType: "nexus/DeactivateChain",
        toAmino: ({ sender, chains }) => ({
            sender: (0, encoding_1.toBech32)(const_1.AXELAR_PREFIX, sender),
            chains,
        }),
        fromAmino: ({ sender, chains }) => ({
            sender: (0, utils_1.toAccAddress)(sender),
            chains,
        }),
    },
});
exports.createAxelarAminoConverters = createAxelarAminoConverters;
//# sourceMappingURL=index.js.map