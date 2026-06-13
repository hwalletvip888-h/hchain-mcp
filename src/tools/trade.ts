/**
 * Trade 模块 — Swap/报价/授权/跨链
 *
 * 报价公开，Swap/授权需 API Key · CAT: [链上-Swap]
 * 工具数: 5 (chains/tokens/quote/build_approve/build_swap)
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosApi, onchainosPrivateApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerTradeTools(server: McpServer, auth: Auth | null = null): void {

  // ── 获取支持的链 ──────────────────────────────────────────

  server.tool(
    "onchainos_get_supported_chains",
    "CAT:[链上-Swap] | ## 功能：获取 DEX 聚合器支持的链列表\n## 场景：用于 Agent 在交易前确认目标链是否可用\n## 关键词：链列表, supported chains, chainId, 网络\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具确认链可用 → onchainos_get_tokens 获取该链代币 → onchainos_get_quote 报价",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const data = await onchainosApi.getSupportedChains();
        return toResult(data, {
          nextSteps: [
            { action: "查看链上代币", tool: "onchainos_get_tokens", params: { chainId: 1 } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取链上代币列表 ──────────────────────────────────────

  server.tool(
    "onchainos_get_tokens",
    "CAT:[链上-Swap] | ## 功能：获取指定链上 DEX 可交易的代币列表\n## 场景：用于发现可交易代币、查看代币是否被聚合器收录\n## 关键词：代币列表, tokens, tradable, 可交易\n## 参数：\n##   - chainId: 链 ID\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_get_supported_chains 确认链 → 本工具获取代币 → onchainos_get_quote 报价",
    {
      chainId: z.number().int().describe("链 ID。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana"),
    },
    { readOnlyHint: true },
    async ({ chainId }) => {
      try {
        const data = await onchainosApi.getTokens(chainId);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取报价 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_quote",
    "CAT:[链上-Swap] | ## 功能：获取最优 Swap 报价，返回输出金额、价格影响、路由明细\n## 场景：用于交易前比价、获取最优路由、估计交易成本。不构造交易，不广播\n## 关键词：报价, quote, swap, 路由, 价格影响, slippage\n## 参数：\n##   - chainId: 链 ID\n##   - fromTokenAddress: 卖出代币合约地址\n##   - toTokenAddress: 买入代币合约地址\n##   - amount: 卖出数量（人类可读数，非最小单位）\n##   - slippage: 滑点容忍度，默认 0.005（0.5%）\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_get_tokens 确认代币可交易 → 本工具获取报价 → onchainos_build_approve_transaction 授权 → onchainos_build_swap 执行",
    {
      chainId: z.number().int().describe("链 ID"),
      fromTokenAddress: z.string().describe("卖出代币的合约地址"),
      toTokenAddress: z.string().describe("买入代币的合约地址"),
      amount: z.string().describe("卖出数量（人类可读格式，如 '1.5' 表示 1.5 个代币，不是 wei）"),
      slippage: z.string().optional().describe("滑点容忍度。默认 '0.005'（0.5%），如 '0.01' 表示 1%"),
    },
    { readOnlyHint: true },
    async ({ chainId, fromTokenAddress, toTokenAddress, amount, slippage }) => {
      try {
        const data = await onchainosApi.getQuote({
          chainId,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage ?? "0.005",
        });
        const quoteData = data as any;
        return toResult(data, {
          warnings: quoteData?.priceImpact && parseFloat(quoteData.priceImpact) > 5
            ? [`价格影响 ${quoteData.priceImpact}%，偏高，建议减小交易量`] : [],
          nextSteps: [
            { action: "检查授权", tool: "onchainos_build_approve_transaction", condition: "如果 allowance 不足以覆盖本次交易量" },
            { action: "执行交易", tool: "onchainos_build_swap", condition: "授权完成后" },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 构建授权交易 ──────────────────────────────────────────

  server.tool(
    "onchainos_build_approve_transaction",
    "CAT:[链上-Swap] | ## 功能：构建代币授权交易（Approve），不广播。返回待签名的构建数据\n## 场景：Swap 前必须授权。spender 地址从 get_quote 返回的 allowanceTarget 获取\n## 关键词：approve, 授权, ERC20, allowance, permit, build\n## 参数：\n##   - chainId: 链 ID\n##   - tokenAddress: 要授权的代币合约地址\n##   - spenderAddress: 被授权者的地址（从报价的 allowanceTarget 获取）\n##   - amount: 授权数量\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作，需用户确认\n## 返回量：微小 ~2KB\n## 关联：onchainos_get_quote 获取 allowanceTarget → 本工具构建授权 → onchainos_broadcast_transaction 广播",
    {
      chainId: z.number().int().describe("链 ID"),
      tokenAddress: z.string().describe("代币合约地址"),
      spenderAddress: z.string().describe("被授权者地址（报价返回的 allowanceTarget）"),
      amount: z.string().describe("授权数量（人类可读格式）"),
    },
    { destructiveHint: true, idempotentHint: true },
    async ({ chainId, tokenAddress, spenderAddress, amount }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await onchainosPrivateApi.approveTransaction(auth, {
          chainId, tokenAddress, spenderAddress, amount,
        });
        return toResult(data, {
          nextSteps: [
            { action: "广播授权交易", tool: "onchainos_broadcast_transaction", params: {} },
            { action: "确认授权后执行 Swap", tool: "onchainos_build_swap", params: { chainId, tokenAddress } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 构建 Swap ──────────────────────────────────────────────

  server.tool(
    "onchainos_build_swap",
    "CAT:[链上-Swap] | ## 功能：构建 Swap 交易，不广播。返回待签名的交易数据\n## 场景：授权完成后，构建 Swap 交易供用户签名和广播\n## 关键词：swap, 交易, 换币, build transaction, send\n## 参数：\n##   - chainId: 链 ID\n##   - fromTokenAddress: 卖出代币合约地址\n##   - toTokenAddress: 买入代币合约地址\n##   - amount: 卖出数量\n##   - userWalletAddress: 用户钱包地址\n##   - slippage: 滑点容忍度\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作，需用户确认\n## 返回量：中等 ~10KB\n## 关联：onchainos_get_quote 获取报价 → onchainos_build_approve_transaction 授权 → 本工具构建交易 → onchainos_broadcast_transaction 广播",
    {
      chainId: z.number().int().describe("链 ID"),
      fromTokenAddress: z.string().describe("卖出代币合约地址"),
      toTokenAddress: z.string().describe("买入代币合约地址"),
      amount: z.string().describe("卖出数量（人类可读格式）"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippage: z.string().optional().describe("滑点容忍度。默认 '0.005'"),
    },
    { destructiveHint: true },
    async ({ chainId, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippage }) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await onchainosPrivateApi.swap(auth, {
          chainId,
          fromTokenAddress,
          toTokenAddress,
          amount,
          userWalletAddress,
          slippage: slippage ?? "0.005",
        });
        return toResult(data, {
          nextSteps: [
            { action: "模拟交易", tool: "onchainos_simulate_transaction", params: {} },
            { action: "广播交易", tool: "onchainos_broadcast_transaction", params: {} },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );
}
