/**
 * 交易模块 — CAT:[链上-Swap]
 * DEX聚合器 + Swap + Solana + 跨链 + 限价单
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tradeApi, crossChainApi, limitOrderApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerTradeTools(server: McpServer, auth: Auth | null): void {

  // ═════════════════════════════════════════════════════════
  // 2.1 DEX 聚合器 (7)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_dex_supported_chain",
    "CAT:[链上-Swap] | ## 功能：获取DEX聚合器支持的链列表\n## 场景：交易前确认目标链可用\n## 关键词：链列表, DEX, supported chain\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具确认链 → onchainos_dex_all_tokens 获取代币",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_all_tokens",
    "CAT:[链上-Swap] | ## 功能：获取指定链上DEX可交易代币列表\n## 场景：发现可交易代币\n## 关键词：代币列表, tokens\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_dex_supported_chain → 本工具 → onchainos_dex_quote 报价",
    { chainIndex: z.number().int().describe("链索引。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.allTokens(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_liquidity",
    "CAT:[链上-Swap] | ## 功能：获取指定链的流动性源列表\n## 场景：了解聚合器覆盖的流动性\n## 关键词：流动性, liquidity\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_dex_all_tokens → 本工具 → onchainos_dex_quote",
    { chainIndex: z.number().int().describe("链索引") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.liquidity(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_quote",
    "CAT:[链上-Swap] | ## 功能：获取最优Swap报价（输出金额/价格影响/路由）\n## 场景：交易前比价。不构造交易\n## 关键词：报价, quote, swap, 路由\n## 参数：\n##   - chainIndex: 链索引\n##   - fromTokenAddress: 卖出代币合约地址\n##   - toTokenAddress: 买入代币合约地址\n##   - amount: 卖出数量（人类可读）\n##   - slippagePercent: 滑点百分比，默认0.5\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_dex_all_tokens → 本工具 → onchainos_dex_approve_transaction",
    {
      chainIndex: z.number().int().describe("链索引"),
      fromTokenAddress: z.string().describe("卖出代币合约地址"),
      toTokenAddress: z.string().describe("买入代币合约地址"),
      amount: z.string().describe("卖出数量（人类可读）"),
      slippagePercent: z.string().optional().describe("滑点百分比，默认'0.5'"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, fromTokenAddress, toTokenAddress, amount, slippagePercent }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await tradeApi.quote(auth, { chainIndex, fromTokenAddress, toTokenAddress, amount, slippagePercent: slippagePercent ?? "0.5" })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_dex_approve_transaction",
    "CAT:[链上-Swap] | ## 功能：构建代币授权交易（Approve），不广播\n## 场景：Swap前必须授权\n## 关键词：approve, 授权, ERC20\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n##   - approveAmount: 授权数量\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作\n## 返回量：微小 ~2KB\n## 关联：onchainos_dex_quote → 本工具 → onchainos_gateway_broadcast",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      approveAmount: z.string().describe("授权数量（人类可读）"),
    },
    { destructiveHint: true, idempotentHint: true },
    async ({ chainIndex, tokenContractAddress, approveAmount }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try { return toResult(await tradeApi.approveTransaction(auth, { chainIndex, tokenContractAddress, approveAmount })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_swap_execute",
    "CAT:[链上-Swap] | ## 功能：构建Swap交易，不广播\n## 场景：授权完成后构建Swap\n## 关键词：swap, 交易, 换币\n## 参数：\n##   - chainIndex: 链索引\n##   - fromTokenAddress: 卖出代币\n##   - toTokenAddress: 买入代币\n##   - amount: 卖出数量\n##   - userWalletAddress: 用户钱包地址\n##   - slippagePercent: 滑点\n##   - approveTransaction: 是否一并构建授权\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作\n## 返回量：中等 ~10KB\n## 关联：onchainos_dex_quote → onchainos_dex_approve_transaction → 本工具 → onchainos_gateway_broadcast",
    {
      chainIndex: z.number().int().describe("链索引"),
      fromTokenAddress: z.string().describe("卖出代币合约地址"),
      toTokenAddress: z.string().describe("买入代币合约地址"),
      amount: z.string().describe("卖出数量"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().optional().describe("滑点百分比"),
      approveTransaction: z.boolean().optional().describe("是否一并构建授权"),
    },
    { destructiveHint: true },
    async ({ chainIndex, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent, approveTransaction }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try { return toResult(await tradeApi.swap(auth, { chainIndex, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent: slippagePercent ?? "0.5", approveTransaction: approveTransaction ? "true" : "false" })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_swap_history",
    "CAT:[链上-Swap] | ## 功能：根据txHash查询Swap交易状态\n## 场景：确认交易是否成功\n## 关键词：swap status, 交易状态, txHash\n## 参数：\n##   - chainIndex: 链索引\n##   - txHash: 交易哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_swap_execute → onchainos_gateway_broadcast → 本工具查状态",
    { chainIndex: z.number().int().describe("链索引"), txHash: z.string().describe("交易哈希") },
    { readOnlyHint: true },
    async ({ chainIndex, txHash }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.swapHistory(auth, chainIndex, txHash)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 2.2 Solana Swap Instruction (1)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_swap_instruction",
    "CAT:[链上-Swap] | ## 功能：获取Solana链的Swap指令（高级控制）\n## 场景：Solana上需要自定义费用/TokenLedger等高级场景\n## 关键词：Solana, swap instruction, 高级\n## 参数：\n##   - chainIndex: 501(Solana)\n##   - fromTokenAddress: 卖出代币Mint地址\n##   - toTokenAddress: 买入代币Mint地址\n##   - amount: 卖出数量\n##   - userWalletAddress: 用户钱包地址\n##   - slippagePercent: 滑点\n##   - feePercent: 费用百分比（可选）\n##   - useTokenLedger: 使用TokenLedger（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_dex_quote → 本工具（Solana场景）→ onchainos_swap_execute",
    {
      chainIndex: z.number().int().describe("链索引。Solana=501"),
      fromTokenAddress: z.string().describe("卖出代币Mint地址"),
      toTokenAddress: z.string().describe("买入代币Mint地址"),
      amount: z.string().describe("卖出数量"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().optional().describe("滑点百分比"),
      feePercent: z.string().optional().describe("费用百分比"),
      useTokenLedger: z.boolean().optional().describe("是否使用TokenLedger"),
    },
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const q: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(params)) { if (v !== undefined) q[k] = typeof v === "boolean" ? String(v) : v as string | number; }
        return toResult(await tradeApi.swapInstruction(auth, q));
      } catch(e) { return toError(e); }
    },
  );

  // ═════════════════════════════════════════════════════════
  // 2.3 跨链 Cross-chain (7)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_cross_chain_supported_chain",
    "CAT:[链上-Swap] | ## 功能：获取跨链桥接支持的链列表\n## 场景：跨链交易前确认链可用\n## 关键词：跨链, cross-chain, bridge, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_cross_chain_supported_tokens 查看支持的代币",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await crossChainApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_cross_chain_supported_tokens",
    "CAT:[链上-Swap] | ## 功能：获取跨链支持的代币列表\n## 场景：确认哪些代币可跨链\n## 关键词：跨链, 代币, cross-chain, tokens\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_cross_chain_supported_chain → 本工具 → onchainos_cross_chain_quote 报价",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await crossChainApi.supportedTokens(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_cross_chain_supported_bridges",
    "CAT:[链上-Swap] | ## 功能：获取支持的跨链桥列表\n## 场景：选择跨链桥\n## 关键词：跨链桥, bridge, 列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具选桥 → onchainos_cross_chain_bridge_tokens_pairs 查看代币对",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await crossChainApi.supportedBridges(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_cross_chain_bridge_tokens_pairs",
    "CAT:[链上-Swap] | ## 功能：获取跨链桥支持的代币对\n## 场景：确认代币对是否可跨链\n## 关键词：跨链, bridge, 代币对, token pairs\n## 参数：\n##   - fromChainId: 源链ID\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_cross_chain_supported_bridges → 本工具 → onchainos_cross_chain_quote",
    { fromChainId: z.number().int().describe("源链ID") },
    { readOnlyHint: true },
    async ({ fromChainId }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await crossChainApi.bridgeTokensPairs(auth, fromChainId)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_cross_chain_quote",
    "CAT:[链上-Swap] | ## 功能：获取跨链报价\n## 场景：跨链交易前比价\n## 关键词：跨链报价, cross-chain quote\n## 参数：\n##   - fromChainId: 源链ID\n##   - toChainId: 目标链ID\n##   - fromTokenAddress: 卖出代币地址\n##   - toTokenAddress: 买入代币地址\n##   - amount: 卖出数量\n##   - slippage: 滑点（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_cross_chain_bridge_tokens_pairs → 本工具 → onchainos_cross_chain_build_tx",
    {
      fromChainId: z.number().int().describe("源链ID"),
      toChainId: z.number().int().describe("目标链ID"),
      fromTokenAddress: z.string().describe("卖出代币地址"),
      toTokenAddress: z.string().describe("买入代币地址"),
      amount: z.string().describe("卖出数量"),
      slippage: z.string().optional().describe("滑点"),
    },
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await crossChainApi.quote(auth, params as Record<string, string | number>)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_cross_chain_build_tx",
    "CAT:[链上-Swap] | ## 功能：构建跨链交易\n## 场景：获取跨链交易calldata\n## 关键词：跨链, build, 构建交易\n## 参数：\n##   - fromChainId/ toChainId/ fromTokenAddress/ toTokenAddress/ amount/ userWalletAddress\n##   - slippage/ feePercent/ referrerAddress（可选）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造写操作\n## 返回量：中等 ~10KB\n## 关联：onchainos_cross_chain_quote → 本工具 → onchainos_gateway_broadcast",
    {
      fromChainId: z.number().int().describe("源链ID"),
      toChainId: z.number().int().describe("目标链ID"),
      fromTokenAddress: z.string().describe("卖出代币地址"),
      toTokenAddress: z.string().describe("买入代币地址"),
      amount: z.string().describe("卖出数量"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippage: z.string().optional().describe("滑点"),
      feePercent: z.string().optional().describe("费用百分比"),
      referrerAddress: z.string().optional().describe("推荐地址"),
    },
    { destructiveHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try { return toResult(await crossChainApi.buildTx(auth, params as Record<string, string | number>)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_cross_chain_status",
    "CAT:[链上-Swap] | ## 功能：查询跨链交易状态\n## 场景：跨链后确认状态\n## 关键词：跨链状态, cross-chain status\n## 参数：\n##   - hash: 交易哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_cross_chain_build_tx → onchainos_gateway_broadcast → 本工具",
    { hash: z.string().describe("交易哈希") },
    { readOnlyHint: true },
    async ({ hash }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await crossChainApi.status(auth, hash)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 2.4 限价单 Limit Order (5)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_limit_order_supported_chain",
    "CAT:[链上-Swap] | ## 功能：获取限价单支持的链列表\n## 场景：下限价单前确认链可用\n## 关键词：限价单, limit order, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_limit_order_all 查看所有限价单",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await limitOrderApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_limit_order_all",
    "CAT:[链上-Swap] | ## 功能：获取所有限价单列表\n## 场景：查看当前限价单\n## 关键词：限价单列表, limit order, 所有\n## 参数：\n##   - chainIndex: 链索引\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_limit_order_supported_chain → 本工具 → onchainos_limit_order_detail 详情",
    { chainIndex: z.number().int().describe("链索引") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await limitOrderApi.all(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_limit_order_detail",
    "CAT:[链上-Swap] | ## 功能：查询限价单详情\n## 场景：查看特定限价单状态\n## 关键词：限价单详情, limit order detail\n## 参数：\n##   - orderHash: 限价单哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_limit_order_all → 本工具 → onchainos_limit_order_cancel_calldata 取消",
    { orderHash: z.string().describe("限价单哈希") },
    { readOnlyHint: true },
    async ({ orderHash }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await limitOrderApi.detail(auth, orderHash)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_limit_order_save",
    "CAT:[链上-Swap] | ## 功能：创建/保存限价单\n## 场景：设置限价买入/卖出\n## 关键词：限价单, save, create, 创建\n## 参数：\n##   - orderData: 限价单数据（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 创建订单\n## 返回量：微小 ~2KB\n## 关联：onchainos_limit_order_supported_chain → 本工具创建限价单",
    { orderData: z.string().describe("限价单数据（JSON字符串）") },
    { destructiveHint: true },
    async ({ orderData }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try { let b: Record<string, unknown>; try { b = JSON.parse(orderData); } catch { b = { raw: orderData }; } return toResult(await limitOrderApi.save(auth, b)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_limit_order_cancel_calldata",
    "CAT:[链上-Swap] | ## 功能：获取取消限价单的calldata\n## 场景：取消限价单\n## 关键词：限价单, cancel, 取消, calldata\n## 参数：\n##   - orderHash: 要取消的限价单哈希\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询（仅返回calldata，不执行）\n## 返回量：微小 ~1KB\n## 关联：onchainos_limit_order_detail → 本工具获取取消calldata → onchainos_gateway_broadcast",
    { orderHash: z.string().describe("要取消的限价单哈希") },
    { readOnlyHint: true },
    async ({ orderHash }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await limitOrderApi.cancelCalldata(auth, orderHash)); } catch(e) { return toError(e); } },
  );
}
