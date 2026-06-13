/**
 * Wallet 模块 — 余额/交易历史
 *
 * 全部需要 API Key
 * CAT: [链上-账户]
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosPrivateApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerWalletTools(server: McpServer, auth: Auth | null): void {

  // ── 查询余额 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_balance",
    "CAT:[链上-账户] | ## 功能：查询指定地址在指定链上的代币余额\n## 场景：用于查看持仓、检查余额是否足够交易、资产查询\n## 关键词：余额, balance, 持仓, portfolio\n## 参数：\n##   - address: 钱包地址\n##   - chainId: 链 ID\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_get_token_info 查代币 → 本工具查余额 → onchainos_get_transaction_history 查历史",
    {
      address: z.string().describe("钱包地址"),
      chainId: z.number().int().describe("链 ID"),
    },
    async ({ address, chainId }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getBalance(auth, address, chainId);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 交易历史 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_transaction_history",
    "CAT:[链上-账户] | ## 功能：查询指定地址的交易历史记录\n## 场景：用于查看交易记录、追踪链上活动、对账\n## 关键词：交易历史, transaction history, tx, 记录\n## 参数：\n##   - address: 钱包地址\n##   - chainId: 链 ID\n##   - limit: 返回条数（默认 50，最大 100）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_get_balance 查看余额 → 本工具查历史 → onchainos_get_transaction_detail 查详情",
    {
      address: z.string().describe("钱包地址"),
      chainId: z.number().int().describe("链 ID"),
      limit: z.number().int().min(1).max(100).optional().describe("返回条数，默认 50，最大 100"),
    },
    async ({ address, chainId, limit }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getTransactionHistory(auth, address, chainId, limit);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 交易详情 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_transaction_detail",
    "CAT:[链上-账户] | ## 功能：根据交易哈希查询交易详情\n## 场景：用于确认交易状态、查看交易细节、调试\n## 关键词：交易详情, tx detail, transaction hash, 确认\n## 参数：\n##   - txHash: 交易哈希\n##   - chainId: 链 ID\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_get_transaction_history 查历史 → 本工具查详情",
    {
      txHash: z.string().describe("交易哈希（txHash / transaction hash）"),
      chainId: z.number().int().describe("链 ID"),
    },
    async ({ txHash, chainId }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosPrivateApi.getTransactionDetail(auth, txHash, chainId);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );
}
