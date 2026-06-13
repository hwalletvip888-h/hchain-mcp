/**
 * 账户模块 — CAT:[链上-账户]
 * 命名: onchainos_<模块>_<操作>
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { balanceApi, postTxApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerBalanceTools(server: McpServer, auth: Auth | null): void {

  // ── 支持的链 ───────────────────────────────────────────
  server.tool(
    "onchainos_balance_supported_chain",
    "CAT:[链上-账户] | ## 功能：获取余额 API 支持的链列表\n## 场景：查询余额前确认目标链是否可用\n## 关键词：余额, 链列表, balance, supported chain\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_balance_total_value 查询总余额",
    {},
    { readOnlyHint: true },
    async () => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await balanceApi.supportedChain(auth); return toResult(data); } catch (e) { return toError(e); }
    },
  );

  // ── 总价值 ────────────────────────────────────────────
  server.tool(
    "onchainos_balance_total_value",
    "CAT:[链上-账户] | ## 功能：查询地址在多链上的总资产价值\n## 场景：查看持仓总览\n## 关键词：余额, 总价值, total value, portfolio\n## 参数：\n##   - address: 钱包地址\n##   - chains: 链索引，逗号分隔（如 \"1,56\"），不填查所有支持的链\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_balance_supported_chain 确认链 → 本工具查总价值 → onchainos_balance_all_tokens 查代币明细",
    {
      address: z.string().describe("钱包地址"),
      chains: z.string().optional().describe("链索引列表，逗号分隔（如 '1,56,137'）。不填查所有支持的链"),
    },
    { readOnlyHint: true },
    async ({ address, chains }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await balanceApi.totalValue(auth, address, chains ?? "1,56,137,8453,501");
        return toResult(data, {
          nextSteps: [
            { action: "查看代币明细", tool: "onchainos_balance_all_tokens", params: { address, chains } },
            { action: "查看交易历史", tool: "onchainos_transaction_history", params: { address, chains } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 所有代币余额 ──────────────────────────────────────
  server.tool(
    "onchainos_balance_all_tokens",
    "CAT:[链上-账户] | ## 功能：查询地址的所有代币余额明细\n## 场景：查看持仓明细\n## 关键词：余额, 代币, token balance, 持仓\n## 参数：\n##   - address: 钱包地址\n##   - chains: 链索引，逗号分隔\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_balance_total_value 总览 → 本工具查看明细 → onchainos_balance_specific_token 查特定代币",
    {
      address: z.string().describe("钱包地址"),
      chains: z.string().optional().describe("链索引列表，逗号分隔"),
    },
    { readOnlyHint: true },
    async ({ address, chains }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await balanceApi.allTokenBalances(auth, address, chains ?? "1,56,137,8453,501");
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 特定代币余额 ──────────────────────────────────────
  server.tool(
    "onchainos_balance_specific_token",
    "CAT:[链上-账户] | ## 功能：查询地址的特定代币余额\n## 场景：精确查询某个代币的持仓数量\n## 关键词：余额, 特定代币, specific token\n## 参数：\n##   - address: 钱包地址\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_balance_all_tokens 查看明细 → 本工具查特定代币",
    {
      address: z.string().describe("钱包地址"),
      chainIndex: z.number().int().describe("链索引"),
      tokenAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ address, chainIndex, tokenAddress }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await balanceApi.specificTokenBalance(auth, { address, chainIndex, tokenAddress });
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 交易历史 ──────────────────────────────────────────
  server.tool(
    "onchainos_transaction_history",
    "CAT:[链上-账户] | ## 功能：查询地址的交易历史记录\n## 场景：追踪链上活动、对账\n## 关键词：交易历史, transaction, history, tx\n## 参数：\n##   - address: 钱包地址\n##   - chains: 链索引，逗号分隔\n##   - limit: 返回条数（默认 50，最大 100）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_balance_total_value 查看余额 → 本工具查历史 → onchainos_transaction_detail 查详情",
    {
      address: z.string().describe("钱包地址"),
      chains: z.string().optional().describe("链索引列表，逗号分隔"),
      limit: z.number().int().min(1).max(100).optional().describe("返回条数，默认 50"),
    },
    { readOnlyHint: true },
    async ({ address, chains, limit }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await postTxApi.transactions(auth, address, chains ?? "1,56,137,8453,501", limit);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 交易详情 ──────────────────────────────────────────
  server.tool(
    "onchainos_transaction_detail",
    "CAT:[链上-账户] | ## 功能：根据 txHash 查询交易详情\n## 场景：确认交易状态、查看交易细节\n## 关键词：交易详情, tx detail, transaction, txHash\n## 参数：\n##   - txHash: 交易哈希\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_transaction_history 查历史 → 本工具查详情",
    {
      txHash: z.string().describe("交易哈希"),
      chainIndex: z.number().int().describe("链索引"),
    },
    { readOnlyHint: true },
    async ({ txHash, chainIndex }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await postTxApi.detail(auth, txHash, chainIndex); return toResult(data); } catch (e) { return toError(e); }
    },
  );

  // ── 订单列表 ──────────────────────────────────────────
  server.tool(
    "onchainos_transaction_orders",
    "CAT:[链上-账户] | ## 功能：查询地址在指定链上的订单列表\n## 场景：查看通过 Gateway 广播的交易状态\n## 关键词：订单, orders, 交易列表\n## 参数：\n##   - address: 钱包地址\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_gateway_broadcast 广播 → 本工具查看订单状态",
    {
      address: z.string().describe("钱包地址"),
      chainIndex: z.number().int().describe("链索引"),
    },
    { readOnlyHint: true },
    async ({ address, chainIndex }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await postTxApi.orders(auth, address, chainIndex); return toResult(data); } catch (e) { return toError(e); }
    },
  );
}
