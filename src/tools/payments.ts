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
    "CAT:[链上-支付] | ## 功能: Seller Agent 创建单次付款(charge), 返回 paymentId+challenge+付款链接\n## 场景: Agent 卖家在对话中需要收费时调此工具, 拿到付款链接发给买家\n## 关键词: payment, create, charge, seller, 收款, a2a\n## 参数:\n##   - amount: 收款金额, 人类可读(必填, 如'0.1'=0.1 USDT0)\n##   - symbol: 代币符号(必填, USD_T0/USDC/USDG)\n##   - recipient: 收款钱包地址(必填)\n##   - description: 付款描述(可选)\n##   - externalId: 业务订单号(可选, 幂等用)\n##   - expiresIn: 有效期秒数(可选, 默认1800=30分钟)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 创建付款订单\n## 返回量: 微小 ~2KB\n## 关联: 本工具创建 -> 把 paymentId/付款链接发给买家 -> 买家调 onchainos_payment_detail -> onchainos_payment_submit -> onchainos_payment_status",
    {
      amount: z.string().describe("收款金额, 人类可读(如'0.1'=0.1 USDT0)"),
      symbol: z.enum(["USD₮0","USDC","USDG"]).describe("代币符号: USD_T0/USDC/USDG"),
      recipient: z.string().describe("Seller 收款钱包地址"),
      description: z.string().optional().describe("付款描述, 如'翻译服务-3000字'"),
      externalId: z.string().optional().describe("Seller 业务订单号, 用于幂等"),
      expiresIn: z.number().int().optional().describe("有效期(秒), 默认1800=30分钟"),
    },
    { destructiveHint: true },
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
    "CAT:[链上-支付] | ## 功能: Buyer 拉取付款详情(challenge), 含金额/收款方/代币/过期时间\n## 场景: 买家拿到 paymentId 或付款链接后查看付款信息\n## 关键词: payment, detail, challenge, buyer, a2a\n## 参数:\n##   - paymentId: 付款ID(必填, 从付款链接或卖家消息获取)\n## 鉴权: PUBLIC - 公开接口, 无需 API Key\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 卖家发 paymentId -> 本工具 -> onchainos_payment_submit",
    {
      paymentId: z.string().describe("付款ID。格式 a2a_XXXX。从付款链接 https://pay.okx.com/p/{paymentId} 或卖家消息获取"),
    },
    { readOnlyHint: true },
    async ({ paymentId }) => {
      try { return toResult(await paymentsApi.detail(paymentId)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_payment_submit",
    "CAT:[链上-支付] | ## 功能: Buyer 提交 EIP-3009 签名凭证, Broker 验签后上链结算\n## 场景: 买家签名后提交支付, 资金直接从买家转给卖家\n## 关键词: payment, submit, credential, EIP-3009, 签名, a2a\n## 参数:\n##   - paymentId: 付款ID(必填)\n##   - authorization: EIP-3009 授权 JSON 字符串(必填)\n##     {type:\"eip-3009\",from,to,value,validAfter,validBefore,nonce}\n##   - signature: EIP-712 签名 hex(必填, 65字节)\n## 鉴权: PUBLIC - 公开接口, 无需 API Key\n## 风险: WRITE - 触发链上结算\n## 返回量: 微小 ~1KB\n## 关联: onchainos_payment_detail -> 买家签名 -> 本工具 -> onchainos_payment_status",
    {
      paymentId: z.string().describe("付款ID"),
      authorization: z.string().describe("EIP-3009 授权 JSON。格式: {\"type\":\"eip-3009\",\"from\":\"0x买家地址\",\"to\":\"0x卖家地址\",\"value\":\"100000\",\"validAfter\":\"0\",\"validBefore\":\"1714521600\",\"nonce\":\"0x...\"}。value 必须与 challenge 中 amount 一致"),
      signature: z.string().describe("EIP-712 签名(0x前缀, 65字节 hex)。用买家钱包对 authorization 签名得到"),
    },
    { destructiveHint: true },
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
    "CAT:[链上-支付] | ## 功能: 查询支付状态(pending/settling/completed/failed/expired)\n## 场景: 提交凭证后轮询确认结算结果, 拿到 txHash\n## 关键词: payment, status, 状态, txHash, a2a\n## 参数:\n##   - paymentId: 付款ID(必填)\n## 鉴权: PUBLIC - 公开接口, 无需 API Key\n## 风险: READ - 只读查询\n## 返回量: 微小 ~1KB\n## 关联: onchainos_payment_submit -> 本工具",
    {
      paymentId: z.string().describe("付款ID"),
    },
    { readOnlyHint: true },
    async ({ paymentId }) => {
      try { return toResult(await paymentsApi.status(paymentId)); } catch(e) { return toError(e); }
    },
  );

  // ── HTTP 端基础设施 ───────────────────────────────────

  server.tool("onchainos_payment_supported",
    "CAT:[链上-支付] | ## 功能: 获取支付支持的网络/代币/scheme 列表\n## 场景: 发起支付前确认目标链和代币是否支持\n## 关键词: x402, payment, 支持列表, network, token\n## 参数: 无\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_payment_create / onchainos_payment_verify",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await paymentsApi.supported(auth)); } catch(e) { return toError(e); } },
  );

}
