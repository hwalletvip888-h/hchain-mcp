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
    "链上-Swap | 获取 DEX 聚合器支持的链及 Router 授权地址【场景:查哪些链支持DEX兑换/Router地址】",
    { chainIndex: z.string().optional().describe("链ID(字符串)。不传返回所有链。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.supportedChain(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_all_tokens",
    "链上-Swap | 获取链上 DEX 可交易代币列表【场景:查链上所有可交易的代币】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '137'=Polygon '8453'=Base '501'=Solana '784'=Sui。⚠️ 不确定先调 onchainos_dex_supported_chain") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.allTokens(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_liquidity",
    "链上-Swap | 获取链上流动性源列表【场景:查可用的DEX流动性池】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_dex_supported_chain") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await tradeApi.liquidity(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_dex_quote",
    "链上-Swap | 获取最优兑换报价及价格影响分析【场景:查兑换报价/最优价格/滑点影响】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      amount: z.string().describe(
        "卖出数量(最小单位, 含精度 decimals)。" +
        "⚠️ 不同代币精度不同: USDT(decimals=6) '1'=1000000, ETH(decimals=18) '1'=1000000000000000000, SOL(decimals=9) '1'=1000000000。" +
        "公式: amount = 人类可读数量 × 10^decimals。不确定 decimals 先调 onchainos_token_basic_info"
      ),
      swapMode: z.enum(["exactIn","exactOut"]).optional().default("exactIn").describe("exactIn=按卖出数量报价 exactOut=按买入数量报价。exactOut仅ETH/Base/BSC/Arbitrum支持UniV2/V3"),
      fromTokenAddress: z.string().describe("卖出代币合约地址(小写)。⚠️ 不知道地址 → 先调 onchainos_token_search。主链币传 '' 或原生地址(如SOL:11111111111111111111111111111111)"),
      toTokenAddress: z.string().describe("买入代币合约地址(小写)。⚠️ 不知道地址 → 先调 onchainos_token_search。主链币传 '' 或原生地址"),
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
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
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
    "链上-Swap | 构建 ERC-20 代币授权交易 calldata【场景:授权DEX合约使用代币】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      approveAmount: z.string().describe(
        "授权数量(最小单位, 含精度 decimals)。" +
        "⚠️ 精度说明: USDT(decimals=6) '1' USDT=1000000, DAI(decimals=18) '1' DAI=1000000000000000000。" +
        "公式: amount = 人类可读数量 × 10^decimals。不确定 decimals 先调 onchainos_token_basic_info"
      ),
    },
    { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
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
    "链上-Swap | 构建兑换交易 calldata【场景:构建交易/准备签名数据/获取calldata】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      amount: z.string().describe(
        "卖出数量(最小单位, 含精度 decimals)。" +
        "⚠️ 不同代币精度不同: USDT(decimals=6) '1'=1000000, ETH(decimals=18) '1'=1000000000000000000。" +
        "公式: amount = 人类可读数量 × 10^decimals"
      ),
      swapMode: z.enum(["exactIn","exactOut"]).optional().default("exactIn").describe("exactIn=按卖出 exactOut=按买入(仅ETH/Base/BSC/Arbitrum的UniV2/V3支持)"),
      fromTokenAddress: z.string().describe("卖出代币合约地址(小写)。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索。主链币传 '' 或原生地址"),
      toTokenAddress: z.string().describe("买入代币合约地址(小写)。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索"),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().describe("滑点百分比。EVM:0-100, Solana:0-<100"),
      approveTransaction: z.boolean().optional().describe("true=一并返回授权calldata(signatureData), 省去单独调approve"),
      approveAmount: z.string().optional().describe(
        "授权数量(最小单位, 含精度 decimals)。" +
        "approveTransaction=true时使用。精度说明同 amount 参数"
      ),
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
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
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
    "链上-Swap | 获取 Solana 兑换指令(高级)【场景:Solana高级兑换/获取交易指令】",
    {
      chainIndex: z.string().describe("链ID。此工具仅支持 Solana('501')。固定传 '501'"),
      amount: z.string().describe(
        "卖出数量(最小单位, 含精度 decimals)。" +
        "⚠️ Solana 代币精度不同: USDC(decimals=6), SOL(decimals=9)。" +
        "公式: amount = 人类可读数量 × 10^decimals"
      ),
      fromTokenAddress: z.string().describe("卖出代币Mint地址(Solana)。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索。SOL原生=11111111111111111111111111111111"),
      toTokenAddress: z.string().describe("买入代币Mint地址(Solana)。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索"),
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
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
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
    "链上-Swap | 查询兑换交易状态及详情【场景:查兑换是否成功/交易状态】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      txHash: z.string().describe("交易哈希"),
      isFromMyProject: z.boolean().optional().describe("true=仅查本API Key订单 false=查任意OKX DEX订单"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, txHash, isFromMyProject }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await tradeApi.swapHistory(auth, chainIndex, txHash, isFromMyProject)); } catch(e) { return toError(e); }
    },
  );

}
