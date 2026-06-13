/**
 * Payments 模块 — x402 支付/验证/结算
 *
 * 全部需 API Key · CAT: [链上-支付] · 工具数: 4
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosPrivateApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerPaymentsTools(server: McpServer, auth: Auth | null): void {

  // ── 支持的支付信息 ─────────────────────────────────────────

  server.tool(
    "onchainos_get_supported_payments",
    "CAT:[链上-支付] | ## 功能：获取支持的网络和支付方案列表\n## 场景：Agent 付款前确认目标链和支付方式是否可用\n## 关键词：支付, payment, x402, 网络, scheme\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认支付可用 → onchainos_verify_payment 验证 → onchainos_settle_payment 结算",
    {},
    { readOnlyHint: true },
    async () => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getSupportedPaymentInfo(auth);
        return toResult(data, {
          nextSteps: [{ action: "验证支付请求", tool: "onchainos_verify_payment" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 验证支付 ──────────────────────────────────────────────

  server.tool(
    "onchainos_verify_payment",
    "CAT:[链上-支付] | ## 功能：验证支付请求的有效性（签名/金额/收款方）\n## 场景：收到支付请求后，校验其合法性再决定是否付款\n## 关键词：支付验证, verify payment, 校验, 签名验证\n## 参数：\n##   - paymentRequest: 支付请求原始数据（JSON 字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_get_supported_payments 确认网络 → 本工具验证 → onchainos_settle_payment 结算",
    {
      paymentRequest: z.string().describe("支付请求数据（JSON 字符串）"),
    },
    { readOnlyHint: true },
    async ({ paymentRequest }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        let body: Record<string, unknown>;
        try { body = JSON.parse(paymentRequest); } catch { body = { raw: paymentRequest }; }
        const data = await onchainosPrivateApi.verifyPayment(auth, body);
        return toResult(data, {
          nextSteps: [{ action: "执行结算", tool: "onchainos_settle_payment", condition: "验证通过后" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 结算支付 ──────────────────────────────────────────────

  server.tool(
    "onchainos_settle_payment",
    "CAT:[链上-支付] | ## 功能：执行支付结算，完成链上付款\n## 场景：验证通过后，执行实际的支付交易\n## 关键词：结算, settle, 付款, execute payment\n## 参数：\n##   - settlementData: 结算数据，包含支付方案、金额、收款方等信息\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 写操作，真正付款，不可逆\n## 返回量：微小 ~2KB\n## 关联：onchainos_verify_payment 验证通过 → 本工具执行结算 → onchainos_get_settlement_status 查状态",
    {
      settlementData: z.string().describe("结算数据（JSON 字符串），含支付方案/金额/收款地址等"),
    },
    { destructiveHint: true },
    async ({ settlementData }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        let body: Record<string, unknown>;
        try { body = JSON.parse(settlementData); } catch { body = { raw: settlementData }; }
        const data = await onchainosPrivateApi.settlePayment(auth, body);
        return toResult(data, {
          nextSteps: [{ action: "查询结算状态", tool: "onchainos_get_settlement_status" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 查询结算状态 ──────────────────────────────────────────

  server.tool(
    "onchainos_get_settlement_status",
    "CAT:[链上-支付] | ## 功能：查询支付结算的处理状态\n## 场景：结算后跟踪付款是否完成、确认到账\n## 关键词：结算状态, settlement status, 付款确认, payment status\n## 参数：\n##   - txHash: 结算交易哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_settle_payment 结算 → 本工具查询状态",
    {
      txHash: z.string().describe("结算交易哈希（txHash）"),
    },
    { readOnlyHint: true },
    async ({ txHash }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getSettlementStatus(auth, txHash);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );
}
