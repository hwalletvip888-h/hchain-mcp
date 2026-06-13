/**
 * 网关模块 — CAT:[链上-网关]
 * 命名: onchainos_<模块>_<操作>
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { gatewayApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerGatewayTools(server: McpServer, auth: Auth | null): void {

  // ── 支持的链 ───────────────────────────────────────────
  server.tool(
    "onchainos_gateway_supported_chain",
    "CAT:[链上-网关] | ## 功能：获取 Gateway API 支持的链列表\n## 场景：广播交易前确认目标链是否可用\n## 关键词：网关, gateway, 链列表, supported chain\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_gateway_gas_price 查询 Gas",
    {},
    { readOnlyHint: true },
    async () => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await gatewayApi.supportedChain(auth); return toResult(data); } catch (e) { return toError(e); }
    },
  );

  // ── Gas 价格 ──────────────────────────────────────────
  server.tool(
    "onchainos_gateway_gas_price",
    "CAT:[链上-网关] | ## 功能：获取指定链的当前 Gas 价格\n## 场景：交易前估算 Gas 成本\n## 关键词：gas, gas price, 手续费, 燃料\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：本工具获取 gas price → onchainos_gateway_gas_limit 估算 limit → onchainos_gateway_simulate 模拟",
    {
      chainIndex: z.number().int().describe("链索引"),
    },
    { readOnlyHint: true },
    async ({ chainIndex }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await gatewayApi.gasPrice(auth, chainIndex);
        return toResult(data, {
          nextSteps: [
            { action: "估算 Gas Limit", tool: "onchainos_gateway_gas_limit", params: { chainIndex } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── Gas Limit ──────────────────────────────────────────
  server.tool(
    "onchainos_gateway_gas_limit",
    "CAT:[链上-网关] | ## 功能：估算交易的 Gas Limit\n## 场景：交易前精确估算燃料消耗\n## 关键词：gas limit, 燃料限制, 估算\n## 参数：\n##   - chainIndex: 链索引\n##   - from: 发送地址\n##   - to: 接收地址\n##   - value: 发送金额（可选）\n##   - data: calldata（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_gateway_gas_price 获取价格 → 本工具估算 limit → onchainos_gateway_simulate 模拟",
    {
      chainIndex: z.number().int().describe("链索引"),
      from: z.string().describe("发送地址"),
      to: z.string().describe("接收地址"),
      value: z.string().optional().describe("发送的原生代币数量"),
      data: z.string().optional().describe("calldata"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, from, to, value, data }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const body: Record<string, unknown> = { chainIndex, from, to };
        if (value) body.value = value;
        if (data) body.data = data;
        const result = await gatewayApi.gasLimit(auth, body);
        return toResult(result);
      } catch (e) { return toError(e); }
    },
  );

  // ── 模拟交易 ──────────────────────────────────────────
  server.tool(
    "onchainos_gateway_simulate",
    "CAT:[链上-网关] | ## 功能：模拟执行交易，不真正上链\n## 场景：交易前验证是否会失败、查看预期状态变化\n## 关键词：模拟, simulate, 预执行, dry run\n## 参数：\n##   - chainIndex: 链索引\n##   - fromAddress: 发送地址\n##   - toAddress: 接收地址\n##   - value: 发送金额（可选）\n##   - data: calldata（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询（模拟不消耗Gas）\n## 返回量：中等 ~10KB\n## 关联：onchainos_swap_execute 构建交易 → 本工具模拟 → onchainos_gateway_broadcast 广播",
    {
      chainIndex: z.number().int().describe("链索引"),
      fromAddress: z.string().describe("交易发送地址"),
      toAddress: z.string().describe("交易接收地址"),
      value: z.string().optional().describe("发送的原生代币数量"),
      data: z.string().optional().describe("calldata"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, fromAddress, toAddress, value, data }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const body: Record<string, unknown> = { chainIndex, fromAddress, toAddress };
        if (value) body.value = value;
        if (data) body.data = data;
        const result = await gatewayApi.simulate(auth, body);
        return toResult(result, {
          nextSteps: [{ action: "广播交易", tool: "onchainos_gateway_broadcast", condition: "模拟成功后" }],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 广播交易 ──────────────────────────────────────────
  server.tool(
    "onchainos_gateway_broadcast",
    "CAT:[链上-网关] | ## 功能：将签名好的交易广播到链上\n## 场景：签名完成后发送交易上链\n## 关键词：广播, broadcast, 发送交易, 上链\n## 参数：\n##   - chainIndex: 链索引\n##   - signedTx: 已签名的交易 hex 数据\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 写操作，真正上链\n## 返回量：微小 ~1KB\n## 关联：onchainos_gateway_simulate 模拟 → 用户签名 → 本工具广播 → onchainos_transaction_orders 查状态",
    {
      chainIndex: z.number().int().describe("链索引"),
      signedTx: z.string().describe("已签名的交易 hex 数据"),
    },
    { destructiveHint: true },
    async ({ chainIndex, signedTx }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await gatewayApi.broadcast(auth, { chainIndex, signedTx });
        return toResult(data, {
          nextSteps: [{ action: "查询订单状态", tool: "onchainos_transaction_orders" }],
        });
      } catch (e) { return toError(e); }
    },
  );
}
