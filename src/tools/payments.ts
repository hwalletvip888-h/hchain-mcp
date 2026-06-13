/**
 * 支付模块 — CAT:[链上-Swap]（x402 支付，暂归 Swap 分类）
 * 命名: onchainos_<模块>_<操作>
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { paymentsApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerPaymentsTools(server: McpServer, auth: Auth | null): void {

  // ── 支持的支付信息 ────────────────────────────────────
  server.tool(
    "onchainos_payment_supported",
    "CAT:[链上-Swap] | ## 功能：获取支持的网络和 x402 支付方案列表\n## 场景：付款前确认目标链和支付方式是否可用\n## 关键词：支付, payment, x402, 网络\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认支付可用 → onchainos_payment_verify 验证 → onchainos_payment_settle 结算",
    {},
    { readOnlyHint: true },
    async () => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await paymentsApi.supported(auth);
        return toResult(data, {
          nextSteps: [{ action: "验证支付请求", tool: "onchainos_payment_verify" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 验证支付 ──────────────────────────────────────────
  server.tool(
    "onchainos_payment_verify",
    "CAT:[链上-Swap] | ## 功能：验证支付请求的有效性（签名/金额/收款方）\n## 场景：收到支付请求后校验合法性\n## 关键词：支付验证, verify, 校验, 签名\n## 参数：\n##   - paymentRequest: 支付请求数据（JSON 字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_payment_supported 确认网络 → 本工具验证 → onchainos_payment_settle 结算",
    {
      paymentRequest: z.string().describe("支付请求数据（JSON 字符串）"),
    },
    { readOnlyHint: true },
    async ({ paymentRequest }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        let body: Record<string, unknown>;
        try { body = JSON.parse(paymentRequest); } catch { body = { raw: paymentRequest }; }
        const data = await paymentsApi.verify(auth, body);
        return toResult(data, {
          nextSteps: [{ action: "执行结算", tool: "onchainos_payment_settle", condition: "验证通过后" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 结算支付 ──────────────────────────────────────────
  server.tool(
    "onchainos_payment_settle",
    "CAT:[链上-Swap] | ## 功能：执行支付结算，完成链上付款\n## 场景：验证通过后执行实际支付交易\n## 关键词：结算, settle, 付款, execute payment\n## 参数：\n##   - settlementData: 结算数据（JSON 字符串）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 写操作，真正付款\n## 返回量：微小 ~2KB\n## 关联：onchainos_payment_verify 验证通过 → 本工具结算 → onchainos_payment_status 查状态",
    {
      settlementData: z.string().describe("结算数据（JSON 字符串），含支付方案/金额/收款地址"),
    },
    { destructiveHint: true },
    async ({ settlementData }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        let body: Record<string, unknown>;
        try { body = JSON.parse(settlementData); } catch { body = { raw: settlementData }; }
        const data = await paymentsApi.settle(auth, body);
        return toResult(data, {
          nextSteps: [{ action: "查询结算状态", tool: "onchainos_payment_status" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 结算状态 ──────────────────────────────────────────
  server.tool(
    "onchainos_payment_status",
    "CAT:[链上-Swap] | ## 功能：查询支付结算的处理状态\n## 场景：结算后跟踪付款是否完成\n## 关键词：结算状态, settlement, 付款确认\n## 参数：\n##   - txHash: 结算交易哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_payment_settle 结算 → 本工具查询状态",
    {
      txHash: z.string().describe("结算交易哈希（txHash）"),
    },
    { readOnlyHint: true },
    async ({ txHash }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await paymentsApi.settleStatus(auth, txHash); return toResult(data); } catch (e) { return toError(e); }
    },
  );
}
