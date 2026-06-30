/**
 * Payments 模块 — CAT:[链上-支付]
 * Agent Payments Protocol: Agent端 A2A (单次支付) + HTTP端 x402
 *
 * 路径来源: https://web3.okx.com API 参考
 *   Agent端: /api/v6/pay/a2a/payment/create | /p/{id} | /p/{id}/credential | /p/{id}/status
 *   HTTP端:  /api/v6/pay/x402/supported | verify | settle | settle/status
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { paymentsApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerPaymentsTools(server: McpServer, auth: Auth | null): void {

  // ── Agent 端 A2A 单次支付 ─────────────────────────────

  server.tool("onchainos_payment_create",
    "链上-支付 | 创建单次付款(charge)【场景:收款/创建支付订单】",
    {
      amount: z.string().describe("收款金额, 人类可读(如'0.1'=0.1 USDT0)"),
      symbol: z.enum(["USD₮0","USDC","USDG"]).describe("代币符号: USD_T0/USDC/USDG"),
      recipient: z.string().describe("Seller 收款钱包地址"),
      description: z.string().optional().describe("付款描述, 如'翻译服务-3000字'"),
      externalId: z.string().optional().describe("Seller 业务订单号, 用于幂等"),
      expiresIn: z.number().int().optional().describe("有效期(秒), 默认1800=30分钟"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ amount, symbol, recipient, description, externalId, expiresIn }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await paymentsApi.create(auth, {
          type: "charge", amount, symbol, recipient,
          ...(description ? { description } : {}),
          ...(externalId ? { externalId } : {}),
          ...(expiresIn ? { expiresIn } : {}),
          deliveries: { includeUrl: true },
        });
        return toResult(data, {
          nextSteps: [
            { action: "把付款链接发给买家", tool: "onchainos_payment_detail", condition: "通过消息通道或对话发送 https://pay.okx.com/p/{paymentId}" },
            { action: "买家拉取详情", tool: "onchainos_payment_detail", params: { paymentId: "{{data.paymentId}}" }, condition: "买家侧操作" },
            { action: "买家签名后提交", tool: "onchainos_payment_submit", params: { paymentId: "{{data.paymentId}}" }, condition: "买家侧操作" },
            { action: "轮询结算结果", tool: "onchainos_payment_status", params: { paymentId: "{{data.paymentId}}" }, condition: "提交后轮询" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_payment_detail",
    "链上-支付 | 拉取付款详情(challenge)【场景:买家查看付款信息/challenge】",
    {
      paymentId: z.string().describe("付款ID。格式 a2a_XXXX。从付款链接 https://pay.okx.com/p/{paymentId} 或卖家消息获取"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ paymentId }) => {
      try { return toResult(await paymentsApi.detail(paymentId)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_payment_submit",
    "链上-支付 | 提交 EIP-3009 签名凭证【场景:买家签名付款/提交支付凭证】",
    {
      paymentId: z.string().describe("付款ID"),
      authorization: z.string().describe("EIP-3009 授权 JSON。格式: {\"type\":\"eip-3009\",\"from\":\"0x买家地址\",\"to\":\"0x卖家地址\",\"value\":\"100000\",\"validAfter\":\"0\",\"validBefore\":\"1714521600\",\"nonce\":\"0x...\"}。value 必须与 challenge 中 amount 一致"),
      signature: z.string().describe("EIP-712 签名(0x前缀, 65字节 hex)。用买家钱包对 authorization 签名得到"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ paymentId, authorization, signature }) => {
      try {
        let auth: unknown; try { auth = JSON.parse(authorization); } catch { return toError(new Error("authorization 格式错误")); }
        return toResult(await paymentsApi.submit(paymentId, {
          payload: { type: "transaction", signature, authorization: auth },
        }), {
          nextSteps: [
            { action: "查询结算状态", tool: "onchainos_payment_status", params: { paymentId } },
            { action: "交易确认后 Seller 交付资源", tool: "onchainos_payment_status", condition: "status=completed 时" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_payment_status",
    "链上-支付 | 查询支付状态【场景:查支付是否到账/结算状态】",
    {
      paymentId: z.string().describe("付款ID"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ paymentId }) => {
      try { return toResult(await paymentsApi.status(paymentId)); } catch(e) { return toError(e); }
    },
  );

  // ── HTTP 端基础设施 ───────────────────────────────────

  server.tool("onchainos_payment_supported",
    "链上-支付 | 获取支付支持的网络/代币列表【场景:查支付支持哪些链和代币】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await paymentsApi.supported(auth)); } catch(e) { return toError(e); } },
  );

  // ── x402 协议（Agent-to-Agent 支付验证+链上结算）────────

  server.tool("onchainos_payment_x402_verify",
    "链上-支付 | x402验签 — 验证 EIP-3009 授权签名是否合法【场景:支付前校验买家签名有效性】",
    {
      authorization: z.string().describe("EIP-3009 授权 JSON 字符串"),
      signature: z.string().describe("EIP-712 签名(0x前缀 hex)"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ authorization, signature }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        let authObj: unknown; try { authObj = JSON.parse(authorization); } catch { return toError(new Error("authorization 格式错误")); }
        return toResult(await paymentsApi.verify(auth, { authorization: authObj, signature }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_payment_x402_settle",
    "链上-支付 | x402链上结算 — 将验证通过的支付提交到链上【场景:买家签名验证通过后执行链上转账】",
    {
      authorization: z.string().describe("已验证的 EIP-3009 授权 JSON"),
      signature: z.string().describe("EIP-712 签名"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ authorization, signature }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        let authObj: unknown; try { authObj = JSON.parse(authorization); } catch { return toError(new Error("authorization 格式错误")); }
        return toResult(await paymentsApi.settle(auth, { authorization: authObj, signature }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_payment_x402_settle_status",
    "链上-支付 | x402结算状态轮询 — 查询链上结算是否确认【场景:结算后确认链上到账】",
    {
      settleId: z.string().describe("结算ID, 从 settle 返回结果获取"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ settleId }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await paymentsApi.settleStatus(auth, settleId)); } catch(e) { return toError(e); }
    },
  );

}
