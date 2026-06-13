/**
 * 交易模块 — CAT:[链上-Swap]
 * 命名: onchainos_<模块>_<操作>
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tradeApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerTradeTools(server: McpServer, auth: Auth | null): void {

  // ── 支持的链 ───────────────────────────────────────────
  server.tool(
    "onchainos_dex_supported_chain",
    "CAT:[链上-Swap] | ## 功能：获取 DEX 聚合器支持的链列表\n## 场景：交易前确认目标链是否可用\n## 关键词：链列表, supported chain, DEX\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具确认链可用 → onchainos_dex_all_tokens 获取代币列表",
    {},
    { readOnlyHint: true },
    async () => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await tradeApi.supportedChain(auth); return toResult(data); } catch (e) { return toError(e); }
    },
  );

  // ── 代币列表 ──────────────────────────────────────────
  server.tool(
    "onchainos_dex_all_tokens",
    "CAT:[链上-Swap] | ## 功能：获取指定链上 DEX 可交易的代币列表\n## 场景：发现可交易代币\n## 关键词：代币列表, tokens, 可交易\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_dex_supported_chain 确认链 → 本工具获取代币 → onchainos_dex_quote 报价",
    {
      chainIndex: z.number().int().describe("链索引。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana"),
    },
    { readOnlyHint: true },
    async ({ chainIndex }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await tradeApi.allTokens(auth, chainIndex); return toResult(data); } catch (e) { return toError(e); }
    },
  );

  // ── 流动性 ────────────────────────────────────────────
  server.tool(
    "onchainos_dex_liquidity",
    "CAT:[链上-Swap] | ## 功能：获取指定链的流动性源列表\n## 场景：了解聚合器覆盖的流动性来源\n## 关键词：流动性, liquidity, 池子\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_dex_all_tokens 获取代币 → 本工具查看流动性 → onchainos_dex_quote 报价",
    {
      chainIndex: z.number().int().describe("链索引"),
    },
    { readOnlyHint: true },
    async ({ chainIndex }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await tradeApi.liquidity(auth, chainIndex); return toResult(data); } catch (e) { return toError(e); }
    },
  );

  // ── 报价 ──────────────────────────────────────────────
  server.tool(
    "onchainos_dex_quote",
    "CAT:[链上-Swap] | ## 功能：获取最优 Swap 报价，返回输出金额、价格影响、路由明细\n## 场景：交易前比价、获取最优路由。不构造交易\n## 关键词：报价, quote, swap, 路由, 价格影响\n## 参数：\n##   - chainIndex: 链索引\n##   - fromTokenAddress: 卖出代币合约地址\n##   - toTokenAddress: 买入代币合约地址\n##   - amount: 卖出数量（人类可读数）\n##   - slippagePercent: 滑点百分比，默认 0.5\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_dex_all_tokens 确认代币 → 本工具报价 → onchainos_dex_approve_transaction 授权",
    {
      chainIndex: z.number().int().describe("链索引"),
      fromTokenAddress: z.string().describe("卖出代币合约地址"),
      toTokenAddress: z.string().describe("买入代币合约地址"),
      amount: z.string().describe("卖出数量（人类可读格式，如 '1.5'）"),
      slippagePercent: z.string().optional().describe("滑点百分比，默认 '0.5'"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, fromTokenAddress, toTokenAddress, amount, slippagePercent }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await tradeApi.quote(auth, { chainIndex, fromTokenAddress, toTokenAddress, amount, slippagePercent: slippagePercent ?? "0.5" });
        return toResult(data, {
          nextSteps: [
            { action: "构建授权", tool: "onchainos_dex_approve_transaction", condition: "若 allowance 不足" },
            { action: "执行Swap", tool: "onchainos_swap_execute", condition: "授权完成后" },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 授权交易 ──────────────────────────────────────────
  server.tool(
    "onchainos_dex_approve_transaction",
    "CAT:[链上-Swap] | ## 功能：构建代币授权交易（Approve），不广播\n## 场景：Swap 前必须授权。返回待签名的 calldata\n## 关键词：approve, 授权, ERC20, allowance\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 要授权的代币合约地址\n##   - approveAmount: 授权数量（人类可读）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作\n## 返回量：微小 ~2KB\n## 关联：onchainos_dex_quote 获取报价 → 本工具构建授权 → onchainos_gateway_broadcast 广播",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      approveAmount: z.string().describe("授权数量（人类可读格式）"),
    },
    { destructiveHint: true, idempotentHint: true },
    async ({ chainIndex, tokenContractAddress, approveAmount }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await tradeApi.approveTransaction(auth, { chainIndex, tokenContractAddress, approveAmount });
        return toResult(data, {
          nextSteps: [
            { action: "广播交易", tool: "onchainos_gateway_broadcast" },
            { action: "执行Swap", tool: "onchainos_swap_execute" },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 执行 Swap ─────────────────────────────────────────
  server.tool(
    "onchainos_swap_execute",
    "CAT:[链上-Swap] | ## 功能：构建 Swap 交易，不广播。返回待签名交易数据\n## 场景：授权完成后构建Swap交易\n## 关键词：swap, 交易, 换币, execute\n## 参数：\n##   - chainIndex: 链索引\n##   - fromTokenAddress: 卖出代币合约地址\n##   - toTokenAddress: 买入代币合约地址\n##   - amount: 卖出数量\n##   - userWalletAddress: 用户钱包地址\n##   - slippagePercent: 滑点百分比\n##   - approveTransaction: 是否一并构建授权（默认 false）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作\n## 返回量：中等 ~10KB\n## 关联：onchainos_dex_quote 报价 → onchainos_dex_approve_transaction 授权 → 本工具构建 → onchainos_gateway_broadcast 广播",
    {
      chainIndex: z.number().int().describe("链索引"),
      fromTokenAddress: z.string().describe("卖出代币合约地址"),
      toTokenAddress: z.string().describe("买入代币合约地址"),
      amount: z.string().describe("卖出数量（人类可读格式）"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().optional().describe("滑点百分比，默认 '0.5'"),
      approveTransaction: z.boolean().optional().describe("是否一并构建授权交易"),
    },
    { destructiveHint: true },
    async ({ chainIndex, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent, approveTransaction }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await tradeApi.swap(auth, {
          chainIndex, fromTokenAddress, toTokenAddress, amount, userWalletAddress,
          slippagePercent: slippagePercent ?? "0.5",
          approveTransaction: approveTransaction ? "true" : "false",
        });
        return toResult(data, {
          nextSteps: [
            { action: "模拟交易", tool: "onchainos_gateway_simulate" },
            { action: "广播交易", tool: "onchainos_gateway_broadcast" },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── Swap 状态 ─────────────────────────────────────────
  server.tool(
    "onchainos_swap_history",
    "CAT:[链上-Swap] | ## 功能：根据 txHash 查询 Swap 交易状态\n## 场景：确认交易是否成功、查看交易详情\n## 关键词：swap status, 交易状态, history, txHash\n## 参数：\n##   - chainIndex: 链索引\n##   - txHash: 交易哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_swap_execute 构建 → onchainos_gateway_broadcast 广播 → 本工具查状态",
    {
      chainIndex: z.number().int().describe("链索引"),
      txHash: z.string().describe("交易哈希（txHash）"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, txHash }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try { const data = await tradeApi.swapHistory(auth, chainIndex, txHash); return toResult(data); } catch (e) { return toError(e); }
    },
  );
}
