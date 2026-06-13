/**
 * Gateway 模块 — Gas/模拟/广播/查询
 *
 * 全部需要 API Key
 * CAT: [链上-网关]
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosPrivateApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerGatewayTools(server: McpServer, auth: Auth | null): void {

  // ── Gas 价格 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_gas_price",
    "CAT:[链上-网关] | ## 功能：获取指定链的当前 Gas 价格\n## 场景：用于交易前估算 Gas 成本、选择合适 Gas 时机\n## 关键词：gas, 手续费, gas price, 成本估算\n## 参数：\n##   - chainId: 链 ID\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：本工具获取 gas → onchainos_get_gas_limit 获取 gas limit → onchainos_simulate_transaction 模拟",
    {
      chainId: z.number().int().describe("链 ID"),
    },
    async ({ chainId }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getGasPrice(auth, chainId);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── Gas 限制 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_gas_limit",
    "CAT:[链上-网关] | ## 功能：估算交易的 Gas Limit\n## 场景：用于交易前精确估算 Gas 消耗，避免 gas 不足或浪费\n## 关键词：gas limit, 燃料限制, 估算\n## 参数：\n##   - chainId: 链 ID\n##   - from: 发送地址\n##   - to: 接收地址（合约地址）\n##   - value: 发送金额（可选）\n##   - data: calldata（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_get_gas_price 获取 gas 价格 → 本工具估算 gas limit → onchainos_simulate_transaction 模拟",
    {
      chainId: z.number().int().describe("链 ID"),
      from: z.string().describe("交易发送地址"),
      to: z.string().describe("交易接收地址（通常是合约地址）"),
      value: z.string().optional().describe("发送的原生代币数量"),
      data: z.string().optional().describe("交易的 calldata"),
    },
    async ({ chainId, from, to, value, data }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const result = await onchainosPrivateApi.getGasLimit(auth, { chainId, from, to, value, data });
        return toResult(result);
      } catch (e) { return toError(e); }
    },
  );

  // ── 模拟交易 ──────────────────────────────────────────────

  server.tool(
    "onchainos_simulate_transaction",
    "CAT:[链上-网关] | ## 功能：模拟执行交易，不真正上链，返回执行结果\n## 场景：用于交易前验证是否会失败、查看预期状态变化\n## 关键词：模拟, simulate, 交易模拟, 预执行, dry run\n## 参数：\n##   - chainId: 链 ID\n##   - from: 发送地址\n##   - to: 接收地址\n##   - value: 发送金额\n##   - data: calldata\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询（模拟不消耗 Gas）\n## 返回量：中等 ~10KB\n## 关联：onchainos_build_swap / onchainos_approve_transaction 构建交易 → 本工具模拟 → onchainos_broadcast_transaction 广播",
    {
      chainId: z.number().int().describe("链 ID"),
      from: z.string().describe("交易发送地址"),
      to: z.string().describe("交易接收地址"),
      value: z.string().optional().describe("发送的原生代币数量"),
      data: z.string().optional().describe("交易的 calldata"),
    },
    async ({ chainId, from, to, value, data }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const result = await onchainosPrivateApi.simulateTransaction(auth, { chainId, from, to, value, data });
        return toResult(result);
      } catch (e) { return toError(e); }
    },
  );

  // ── 广播交易 ──────────────────────────────────────────────

  server.tool(
    "onchainos_broadcast_transaction",
    "CAT:[链上-网关] | ## 功能：将签名好的交易广播到链上\n## 场景：签名完成后，将交易发送到链上，返回 txHash\n## 关键词：广播, broadcast, 发送交易, send transaction, 上链\n## 参数：\n##   - chainId: 链 ID\n##   - signedTx: 已签名的交易数据（hex 编码）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 写操作，真正上链\n## 返回量：微小 ~1KB\n## 关联：onchainos_simulate_transaction 模拟 → 用户签名 → 本工具广播 → onchainos_get_order_status 查状态",
    {
      chainId: z.number().int().describe("链 ID"),
      signedTx: z.string().describe("已签名的交易 hex 数据"),
    },
    async ({ chainId, signedTx }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await onchainosPrivateApi.broadcastTransaction(auth, { chainId, signedTx });
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 查询订单 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_order_status",
    "CAT:[链上-网关] | ## 功能：查询已广播交易的状态\n## 场景：广播后确认交易是否上链、成功或失败\n## 关键词：订单状态, order status, 交易确认, tx status\n## 参数：\n##   - orderId: 订单 ID（广播交易返回的 ID）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_broadcast_transaction 广播 → 本工具查询状态",
    {
      orderId: z.string().describe("订单 ID，广播交易时返回的标识符"),
    },
    async ({ orderId }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getOrderStatus(auth, orderId);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );
}
