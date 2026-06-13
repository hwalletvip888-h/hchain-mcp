/**
 * 账户模块 — CAT:[链上-账户]
 * 命名: onchainos_<模块>_<操作>
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { balanceApi, postTxApi, walletApi } from "../adapters/onchainos.js";
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

  // ═════════════════════════════════════════════════════════
  // 3.3 Wallet v5 补充 (9)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_wallet_supported_chains",
    "CAT:[链上-账户] | ## 功能：获取Wallet API支持的链列表(v5)\n## 场景：钱包操作前确认链\n## 关键词：钱包, wallet, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_balance_total_value 查余额",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.supportedChains(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_token_price",
    "CAT:[链上-账户] | ## 功能：获取代币当前价格(v5)\n## 场景：查询代币币价\n## 关键词：价格, token, price, wallet\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_wallet_supported_chains → 本工具查价",
    { chainIndex: z.number().int().describe("链索引"), tokenAddress: z.string().describe("代币地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.tokenCurrentPrice(auth, { chainIndex, tokenAddress })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_token_realtime_price",
    "CAT:[链上-账户] | ## 功能：获取代币实时价格(v5)\n## 场景：查询实时币价\n## 关键词：实时价格, realtime, token\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_wallet_token_price → 本工具实时价",
    { chainIndex: z.number().int().describe("链索引"), tokenAddress: z.string().describe("代币地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.tokenRealtimePrice(auth, { chainIndex, tokenAddress })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_token_historical_price",
    "CAT:[链上-账户] | ## 功能：获取代币历史价格(v5)\n## 场景：历史价格回测\n## 关键词：历史价格, historical, token\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币地址\n##   - period: 周期（可选）\n##   - limit: 条数（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_wallet_token_price → 本工具历史价",
    { chainIndex: z.number().int().describe("链索引"), tokenAddress: z.string().describe("代币地址"), period: z.string().optional().describe("周期"), limit: z.number().int().optional().describe("返回条数") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress, period, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.tokenHistoricalPrice(auth, chainIndex, tokenAddress, period, limit)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_token_detail",
    "CAT:[链上-账户] | ## 功能：获取代币详细信息(v5)\n## 场景：查看代币元数据\n## 关键词：代币详情, token detail\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_wallet_supported_chains → 本工具",
    { chainIndex: z.number().int().describe("链索引") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.tokenDetail(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_approvals",
    "CAT:[链上-账户] | ## 功能：查询地址的授权记录(v5)\n## 场景：安全审计，查看授权\n## 关键词：授权, approval, 安全\n## 参数：\n##   - address: 钱包地址\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_balance_total_value → 本工具查授权",
    { address: z.string().describe("钱包地址"), chainIndex: z.number().int().describe("链索引") },
    { readOnlyHint: true },
    async ({ address, chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.approvals(auth, address, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_utxos",
    "CAT:[链上-账户] | ## 功能：查询UTXO模型的未花费输出\n## 场景：BTC网络查询UTXO\n## 关键词：UTXO, BTC, 未花费\n## 参数：\n##   - chainIndex: 链索引\n##   - address: 钱包地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_balance_total_value → 本工具查UTXO",
    { chainIndex: z.number().int().describe("链索引"), address: z.string().describe("钱包地址") },
    { readOnlyHint: true },
    async ({ chainIndex, address }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.utxos(auth, chainIndex, address)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_utxo_detail",
    "CAT:[链上-账户] | ## 功能：查询UTXO详情\n## 场景：查看UTXO具体信息\n## 关键词：UTXO, detail, BTC\n## 参数：\n##   - chainIndex: 链索引\n##   - txHash: 交易哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_wallet_utxos → 本工具UTXO详情",
    { chainIndex: z.number().int().describe("链索引"), txHash: z.string().describe("交易哈希") },
    { readOnlyHint: true },
    async ({ chainIndex, txHash }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.utxoDetail(auth, chainIndex, txHash)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_wallet_validate_address",
    "CAT:[链上-账户] | ## 功能：验证钱包地址格式(v5)\n## 场景：发交易前校验地址有效性\n## 关键词：验证, validate, address\n## 参数：\n##   - chainIndex: 链索引\n##   - address: 钱包地址\n##   - addressType: 地址类型（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_swap_execute 前 → 本工具验证地址",
    { chainIndex: z.number().int().describe("链索引"), address: z.string().describe("钱包地址"), addressType: z.number().int().optional().describe("地址类型") },
    { readOnlyHint: true },
    async ({ chainIndex, address, addressType }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await walletApi.validateAddress(auth, chainIndex, address, addressType)); } catch(e) { return toError(e); } },
  );
}
