/**
 * Trade 模块 — CAT:[链上-Swap]
 * DEX 聚合器经典兑换: 8 tools, 参数来源官方 API 参考
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tradeApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerTradeTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_dex_supported_chain",
    "CAT:[链上-Swap] | ## 功能: 获取 DEX 聚合器支持的链, 返回 chainIndex/chainName/dexTokenApproveAddress\n## 场景: 兑换前确认链 + 获取 DEX Router 授权地址\n## 关键词: DEX, 链列表, chainIndex, router, approve\n## 参数:\n##   - chainIndex: 可选过滤\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: dexTokenApproveAddress -> onchainos_dex_approve_transaction",
    { chainIndex: z.string().optional().describe("链索引, 可选过滤。不传返回所有链") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.supportedChain(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_all_tokens",
    "CAT:[链上-Swap] | ## 功能: 获取链上 DEX 可交易代币列表, 返回 decimals/tokenContractAddress/tokenName/tokenSymbol/tokenLogoUrl\n## 场景: 查找代币合约地址和精度\n## 关键词: 代币列表, tokens, decimals\n## 参数:\n##   - chainIndex: 链索引(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 大 ~100KB\n## 关联: onchainos_dex_supported_chain -> 本工具 -> onchainos_dex_quote",
    { chainIndex: z.string().describe("链索引。'1'=ETH '56'=BSC '137'=Polygon '8453'=Base '501'=Solana '784'=Sui") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.allTokens(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_liquidity",
    "CAT:[链上-Swap] | ## 功能: 获取链上流动性源列表, 返回 id/name/logo\n## 场景: 了解 DEX 覆盖范围, 用于 quote 的 dexIds/excludeDexIds 参数\n## 关键词: 流动性, liquidity, DEX列表, dexId\n## 参数:\n##   - chainIndex: 链索引(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: 本工具选流动性 -> onchainos_dex_quote (传 dexIds/excludeDexIds)",
    { chainIndex: z.string().describe("链索引") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.liquidity(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_quote",
    "CAT:[链上-Swap] | ## 功能: 获取最优兑换报价, 返回 toTokenAmount/priceImpactPercent/dexRouterList/estimateGasFee/tradeFee\n## 场景: 交易前比价。返回 fromToken/toToken 含 isHoneyPot(貔貅检测)/taxRate(税率)\n## 关键词: 报价, quote, 价格影响, 路由, swapMode, exactIn, exactOut\n## 参数:\n##   - chainIndex/amount/fromTokenAddress/toTokenAddress(必填)\n##   - swapMode: exactIn(默认)/exactOut(必填)\n##   - dexIds/excludeDexIds: 流动性过滤(可选)\n##   - priceImpactProtectionPercent: 价格影响保护(可选, 默认90%)\n##   - feePercent/directRoute/singleRouteOnly/singlePoolPerHop/assetAwareRouting(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_dex_all_tokens -> 本工具 -> onchainos_dex_swap / onchainos_dex_approve_transaction",
    {
      chainIndex: z.string().describe("链索引"),
      amount: z.string().describe("交易数量, 含精度(最小单位)。如 1 USDT=1000000, 1 DAI=1000000000000000000"),
      swapMode: z.enum(["exactIn","exactOut"]).optional().default("exactIn").describe("exactIn=按卖出数量报价 exactOut=按买入数量报价。exactOut仅ETH/Base/BSC/Arbitrum支持UniV2/V3"),
      fromTokenAddress: z.string().describe("卖出代币合约地址"),
      toTokenAddress: z.string().describe("买入代币合约地址"),
      dexIds: z.string().optional().describe("限定流动性池 dexId, 逗号分隔。从 onchainos_dex_liquidity 获取"),
      excludeDexIds: z.string().optional().describe("排除流动性池 dexId, 逗号分隔"),
      priceImpactProtectionPercent: z.string().optional().describe("价格影响保护百分比(0-100)。超此值报价被拒。默认90, 设100禁用"),
      feePercent: z.string().optional().describe("分佣百分比。Solana最大10%,其他链最大3%"),
      excludePoolAddresses: z.string().optional().describe("过滤池子地址, 逗号分隔, 最多20个"),
      directRoute: z.boolean().optional().describe("true=限制单一流动性池。仅Solana"),
      singleRouteOnly: z.boolean().optional().describe("true=单路径(允许多跳多池,不并行)"),
      singlePoolPerHop: z.boolean().optional().describe("true=每跳单池"),
      assetAwareRouting: z.boolean().optional().describe("true=仅使用匹配资产类型的路由(U-U/U-Native)"),
      forJitoBundle: z.boolean().optional().describe("true=排除不兼容Jito的DEX"),
    },
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const q: Record<string, string> = {};
        for (const [k, v] of Object.entries(params)) { if (v !== undefined) q[k] = typeof v === "boolean" ? String(v) : v; }
        return toResult(await tradeApi.quote(auth, q), {
          nextSteps: [
            { action: "如为ERC20, 先授权", tool: "onchainos_dex_approve_transaction", condition: "非原生代币需要" },
            { action: "构建兑换交易", tool: "onchainos_dex_swap" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_dex_approve_transaction",
    "CAT:[链上-Swap] | ## 功能: 构建 ERC-20 授权交易 calldata, 返回 data/dexContractAddress/gasLimit/gasPrice\n## 场景: ERC20 Swap 前授权 DEX Router 动用代币\n## 关键词: approve, 授权, ERC20, calldata, dexContractAddress\n## 参数:\n##   - chainIndex/tokenContractAddress/approveAmount(必填)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 返回 calldata\n## 返回量: 微小 ~1KB\n## 关联: onchainos_dex_quote -> 本工具 -> onchainos_gateway_broadcast",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      approveAmount: z.string().describe("授权数量, 含精度。如授权1 USDT=1000000, 1 DAI=1000000000000000000"),
    },
    { destructiveHint: true, idempotentHint: true },
    async ({ chainIndex, tokenContractAddress, approveAmount }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        return toResult(await tradeApi.approveTransaction(auth, chainIndex, tokenContractAddress, approveAmount), {
          nextSteps: [{ action: "签名后广播", tool: "onchainos_gateway_broadcast" }],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_dex_swap",
    "CAT:[链上-Swap] | ## 功能: 构建兑换交易 calldata, 返回 tx(from/to/data/value/gas/gasPrice/maxPriorityFeePerGas/minReceiveAmount/maxSpendAmount/signatureData)\n## 场景: 授权后构建 swap。approveTransaction=true可一并返回授权calldata省去单独调approve\n## 关键词: swap, 兑换, calldata, 交易构建, MEV, Jito\n## 参数:\n##   - chainIndex/amount/fromTokenAddress/toTokenAddress/userWalletAddress/slippagePercent(必填)\n##   - swapMode/approveTransaction/approveAmount/feePercent/swapReceiverAddress(可选)\n##   - autoSlippage/maxAutoslippagePercent/priceImpactProtectionPercent(可选)\n##   - dexIds/excludeDexIds/excludePoolAddresses/disableRFQ/directRoute(可选)\n##   - computeUnitPrice/computeUnitLimit/tips: Solana参数(可选)\n##   - gaslimit/gasLevel: EVM gas参数(可选)\n##   - positiveSlippagePercent/positiveSlippageFeeAddress: 正滑点分佣(可选,白名单)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 返回 calldata\n## 返回量: 中等 ~5KB\n## 关联: onchainos_dex_quote -> 本工具 -> onchainos_gateway_simulate -> onchainos_gateway_broadcast",
    {
      chainIndex: z.string().describe("链索引"),
      amount: z.string().describe("交易数量, 含精度(最小单位)。如1 USDT=1000000"),
      swapMode: z.enum(["exactIn","exactOut"]).optional().default("exactIn").describe("exactIn=按卖出 exactOut=按买入(仅ETH/Base/BSC/Arbitrum的UniV2/V3支持)"),
      fromTokenAddress: z.string().describe("卖出代币地址"),
      toTokenAddress: z.string().describe("买入代币地址"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().describe("滑点百分比。EVM:0-100, Solana:0-<100"),
      approveTransaction: z.boolean().optional().describe("true=一并返回授权calldata(signatureData), 省去单独调approve"),
      approveAmount: z.string().optional().describe("授权数量, 含精度。approveTransaction=true时使用"),
      autoSlippage: z.boolean().optional().describe("true=自动滑点覆盖slippagePercent"),
      maxAutoslippagePercent: z.string().optional().describe("自动滑点上限百分比"),
      feePercent: z.string().optional().describe("分佣百分比。Solana最大10%, 其他链最大3%"),
      fromTokenReferrerWalletAddress: z.string().optional().describe("fromToken分佣地址"),
      toTokenReferrerWalletAddress: z.string().optional().describe("toToken分佣地址"),
      swapReceiverAddress: z.string().optional().describe("接收代币地址, 默认=userWalletAddress"),
      priceImpactProtectionPercent: z.string().optional().describe("价格影响保护(0-100,默认90)"),
      dexIds: z.string().optional().describe("限定流动性池,逗号分隔"),
      excludeDexIds: z.string().optional().describe("排除流动性池,逗号分隔"),
      excludePoolAddresses: z.string().optional().describe("过滤池子地址,逗号分隔,最多20"),
      disableRFQ: z.boolean().optional().describe("true=禁用RFQ"),
      directRoute: z.boolean().optional().describe("true=单跳模式。Solana和EVM均支持"),
      singleRouteOnly: z.boolean().optional().describe("true=单路径(允许多跳多池)"),
      singlePoolPerHop: z.boolean().optional().describe("true=每跳单池"),
      assetAwareRouting: z.boolean().optional().describe("true=仅匹配资产类型的路由"),
      gaslimit: z.string().optional().describe("EVM gas限额(wei)。过低会导致报价失败"),
      gasLevel: z.enum(["average","fast","slow"]).optional().describe("EVM gas等级,默认average"),
      computeUnitPrice: z.string().optional().describe("Solana compute unit price"),
      computeUnitLimit: z.string().optional().describe("Solana compute unit limit"),
      tips: z.string().optional().describe("Jito tips(SOL)。0.0000000001~2。指定后signatureData返回Jito转账calldata"),
      forJitoBundle: z.boolean().optional().describe("true=排除不兼容Jito的DEX"),
      positiveSlippagePercent: z.string().optional().describe("正滑点分佣比例(0-10,白名单)"),
      positiveSlippageFeeAddress: z.string().optional().describe("正滑点分佣地址(白名单)"),
      callDataMemo: z.string().optional().describe("自定义calldata上链数据(64bytes hex,如'0x...')"),
      maxCalldataSize: z.string().optional().describe("最大calldata大小估计值"),
      maxAccounts: z.string().optional().describe("最大账户数估计值"),
    },
    { destructiveHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const q: Record<string, string> = {};
        for (const [k, v] of Object.entries(params)) { if (v !== undefined) q[k] = typeof v === "boolean" ? String(v) : v; }
        return toResult(await tradeApi.swap(auth, q), {
          nextSteps: [
            { action: "如有 signatureData, 先执行授权 calldata", tool: "onchainos_gateway_broadcast", condition: "signatureData 存在时包含 approveContract+approveTxCalldata" },
            { action: "模拟交易", tool: "onchainos_gateway_simulate", condition: "广播前建议模拟" },
            { action: "签名后广播", tool: "onchainos_gateway_broadcast" },
            { action: "查交易状态", tool: "onchainos_dex_swap_history" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_dex_swap_instruction",
    "CAT:[链上-Swap] | ## 功能: 获取 Solana 兑换指令(高级), 返回 instructionLists/addressLookupTableAccount/tx/routerResult\n## 场景: Solana 自定义交易组装, 可加自己的指令\n## 关键词: Solana, swap instruction, 高级, lookup table\n## 参数:\n##   - chainIndex/amount/fromTokenAddress/toTokenAddress/userWalletAddress/slippagePercent(必填)\n##   - autoSlippage/maxAutoSlippagePercent/feePercent/useTokenLedger/swapReceiverAddress(可选)\n##   - priceImpactProtectionPercent/dexIds/excludeDexIds/disableRFQ/directRoute(可选)\n##   - computeUnitPrice/computeUnitLimit: Solana gas(可选)\n##   - positiveSlippagePercent/positiveSlippageFeeAddress: 正滑点分佣(可选,白名单)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 大 ~30KB\n## 关联: Solana场景: onchainos_dex_quote -> 本工具 -> 自行签名广播",
    {
      chainIndex: z.string().describe("Solana固定'501'"),
      amount: z.string().describe("卖出数量, 含精度"),
      fromTokenAddress: z.string().describe("卖出代币Mint地址"),
      toTokenAddress: z.string().describe("买入代币Mint地址"),
      userWalletAddress: z.string().describe("Solana钱包地址"),
      slippagePercent: z.string().describe("滑点百分比。Solana:0-<100"),
      autoSlippage: z.boolean().optional().describe("true=自动滑点"),
      maxAutoSlippagePercent: z.string().optional().describe("自动滑点上限"),
      feePercent: z.string().optional().describe("分佣百分比。Solana最大10%"),
      fromTokenReferrerWalletAddress: z.string().optional().describe("fromToken分佣地址"),
      toTokenReferrerWalletAddress: z.string().optional().describe("toToken分佣地址"),
      swapReceiverAddress: z.string().optional().describe("接收代币地址"),
      useTokenLedger: z.boolean().optional().describe("true=执行前记录代币余额"),
      priceImpactProtectionPercent: z.string().optional().describe("价格影响保护(0-100)"),
      dexIds: z.string().optional().describe("限定流动性池,逗号分隔"),
      excludeDexIds: z.string().optional().describe("排除流动性池,逗号分隔"),
      disableRFQ: z.boolean().optional().describe("true=禁用RFQ"),
      directRoute: z.boolean().optional().describe("true=单池路由。仅Solana"),
      computeUnitPrice: z.string().optional().describe("Solana compute unit price"),
      computeUnitLimit: z.string().optional().describe("Solana compute unit limit"),
      positiveSlippagePercent: z.string().optional().describe("正滑点分佣比例(0-10,白名单)"),
      positiveSlippageFeeAddress: z.string().optional().describe("正滑点分佣地址"),
      forJitoBundle: z.boolean().optional().describe("true=排除不兼容Jito的DEX"),
      excludePoolAddresses: z.string().optional().describe("过滤池子地址,逗号分隔,最多20"),
    },
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const q: Record<string, string> = {};
        for (const [k, v] of Object.entries(params)) { if (v !== undefined) q[k] = typeof v === "boolean" ? String(v) : v; }
        return toResult(await tradeApi.swapInstruction(auth, q));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_dex_swap_history",
    "CAT:[链上-Swap] | ## 功能: 查询兑换交易详情(状态/fromToken/toToken/txFee)\n## 场景: 广播后确认交易状态\n## 关键词: swap history, 交易状态, txHash\n## 参数:\n##   - chainIndex: 链索引(必填)\n##   - txHash: 交易哈希(必填)\n##   - isFromMyProject: 是否本项目(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: onchainos_gateway_broadcast -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      txHash: z.string().describe("交易哈希"),
      isFromMyProject: z.boolean().optional().describe("true=仅查本API Key订单 false=查任意OKX DEX订单"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, txHash, isFromMyProject }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await tradeApi.swapHistory(auth, chainIndex, txHash, isFromMyProject)); } catch(e) { return toError(e); }
    },
  );

}
