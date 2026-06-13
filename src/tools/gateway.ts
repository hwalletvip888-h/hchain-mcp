/**
 * Gateway 模块 — Gas/模拟/广播/查询
 *
 * 全部需 API Key · CAT: [链上-网关] · 工具数: 4
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosPrivateApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerGatewayTools(server: McpServer, auth: Auth | null): void {

  // ── Gas 配置 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_gas_config",
    "CAT:[链上-网关] | ## 功能：获取指定链的 Gas 价格和交易 Gas Limit 估算\n## 场景：用于交易前估算 Gas 成本、选择合适 Gas 时机\n## 关键词：gas, 手续费, gas price, gas limit, 成本估算\n## 参数：\n##   - chainIndex: 链索引\n##   - from: 发送地址（估算 gas limit 时选填）\n##   - to: 接收地址（估算 gas limit 时选填）\n##   - value: 发送数量（可选）\n##   - data: calldata（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具获取 gas 配置 → onchainos_simulate_transaction 模拟 → onchainos_broadcast_transaction 广播",
    {
      chainIndex: z.number().int().describe("链索引"),
      from: z.string().optional().describe("发送地址，估算 gas limit 时选填"),
      to: z.string().optional().describe("接收地址（合约地址），估算 gas limit 时选填"),
      value: z.string().optional().describe("发送的原生代币数量"),
      data: z.string().optional().describe("交易的 calldata"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, from, to, value, data }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const [gasPrice, gasLimit] = await Promise.all([
          onchainosPrivateApi.getGasPrice(auth, chainIndex),
          from && to
            ? onchainosPrivateApi.getGasLimit(auth, Object.fromEntries(
                Object.entries({ chainIndex, from: from!, to: to!, value, data }).filter(([_, v]) => v !== undefined)
              )).catch(() => null)
            : Promise.resolve(null),
        ]);
        return toResult({ gasPrice, gasLimit }, {
          nextSteps: [
            { action: "模拟交易", tool: "onchainos_simulate_transaction", condition: "from 和 to 已提供时" },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 模拟交易 ──────────────────────────────────────────────

  server.tool(
    "onchainos_simulate_transaction",
    "CAT:[链上-网关] | ## 功能：模拟执行交易，不真正上链，返回执行结果和状态变化\n## 场景：用于交易前验证是否会失败、查看预期状态变化\n## 关键词：模拟, simulate, 交易模拟, 预执行, dry run\n## 参数：\n##   - chainIndex: 链索引\n##   - fromAddress: 发送地址\n##   - toAddress: 接收地址\n##   - value: 发送金额\n##   - data: calldata\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询（模拟不消耗 Gas）\n## 返回量：中等 ~10KB\n## 关联：onchainos_build_swap 构建交易 → 本工具模拟 → onchainos_broadcast_transaction 广播",
    {
      chainIndex: z.number().int().describe("链索引"),
      fromAddress: z.string().describe("交易发送地址"),
      toAddress: z.string().describe("交易接收地址"),
      value: z.string().optional().describe("发送的原生代币数量"),
      data: z.string().optional().describe("交易的 calldata"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, fromAddress, toAddress, value, data }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const simBody: Record<string, unknown> = { chainIndex, fromAddress, toAddress };
        if (value) simBody.value = value;
        if (data) simBody.data = data;
        const result = await onchainosPrivateApi.simulateTransaction(auth, simBody);
        return toResult(result, {
          nextSteps: [{ action: "广播交易", tool: "onchainos_broadcast_transaction", condition: "模拟成功后" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 广播交易 ──────────────────────────────────────────────

  server.tool(
    "onchainos_broadcast_transaction",
    "CAT:[链上-网关] | ## 功能：将签名好的交易广播到链上，返回 txHash/orderId\n## 场景：签名完成后将交易发送到链上\n## 关键词：广播, broadcast, 发送交易, send transaction, 上链\n## 参数：\n##   - chainIndex: 链索引\n##   - signedTx: 已签名的交易数据（hex 编码）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 写操作，真正上链，不可逆\n## 返回量：微小 ~1KB\n## 关联：onchainos_simulate_transaction 模拟 → 用户签名 → 本工具广播 → onchainos_get_order_status 查状态",
    {
      chainIndex: z.number().int().describe("链索引"),
      signedTx: z.string().describe("已签名的交易 hex 数据"),
    },
    { destructiveHint: true },
    async ({ chainIndex, signedTx }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await onchainosPrivateApi.broadcastTransaction(auth, { chainIndex, signedTx });
        return toResult(data, {
          nextSteps: [{ action: "查询状态", tool: "onchainos_get_order_status" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 查询订单 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_order_status",
    "CAT:[链上-网关] | ## 功能：查询已广播交易的状态\n## 场景：广播后确认交易是否上链、成功或失败\n## 关键词：订单状态, order status, 交易确认, tx status\n## 参数：\n##   - address: 钱包地址\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_broadcast_transaction 广播 → 本工具查询状态",
    {
      address: z.string().describe("钱包地址"),
      chainIndex: z.number().int().describe("链索引"),
    },
    { readOnlyHint: true },
    async ({ address, chainIndex }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getOrders(auth, address, chainIndex);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );
}
