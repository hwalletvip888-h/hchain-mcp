/**
 * DeFi 模块 — CAT:[链上-DeFi]
 * 投资品查询: 链列表 + 协议 + 搜索 + 详情
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defiApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerDefiTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_defi_supported_chains",
    "链上-分析 | 获取 DeFi 投资品覆盖的链列表【场景:查哪些链有DeFi投资品】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.supportedChains(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_supported_platforms",
    "链上-分析 | 获取支持的 DeFi 协议列表【场景:查有哪些DeFi协议/Aave等】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.supportedPlatforms(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_search_products",
    "链上-分析 | 按代币/协议/链搜索 DeFi 投资品【场景:搜理财/赚币/质押产品】",
    {
      tokenKeywordList: z.array(z.string()).min(1).describe("代币关键词, 如 ['USDC','ETH']。支持传名称或符号"),
      platformKeywordList: z.array(z.string()).optional().describe("协议关键词过滤, 如 ['Aave V3']。从 onchainos_defi_supported_platforms 获取可用协议名"),
      pageNum: z.number().int().min(1).optional().describe("页码, 最小1, 每页20条。默认1"),
      chainIndex: z.string().optional().describe("链ID(字符串)。如 '1'=ETH '8453'=Base。不传查所有链。不确定先调 onchainos_defi_supported_chains"),
      productGroup: z.enum(["SINGLE_EARN","DEX_POOL","LENDING"]).optional().describe("投资类型: SINGLE_EARN=单币赚币 DEX_POOL=流动性池 LENDING=借贷"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokenKeywordList, platformKeywordList, pageNum, chainIndex, productGroup }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await defiApi.searchProducts(auth, { tokenKeywordList, platformKeywordList, pageNum, chainIndex, productGroup }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_product_detail",
    "链上-分析 | 获取投资品详情(APY/资产/状态)【场景:看理财产品详情/收益率】",
    {
      investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值的 investmentId 字段获取"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ investmentId }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.productDetail(auth, investmentId)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_rate_chart",
    "链上-分析 | 获取投资品历史 APY 走势【场景:看APY收益率历史曲线】",
    {
      investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值获取"),
      timeRange: z.enum(["WEEK","MONTH","SEASON","YEAR"]).optional().describe("时间范围: WEEK=一周 MONTH=一月 SEASON=三月 YEAR=一年。默认WEEK"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ investmentId, timeRange }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.rateChart(auth, investmentId, timeRange)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_tvl_chart",
    "链上-分析 | 获取投资品历史 TVL 走势【场景:看TVL/锁仓量历史曲线】",
    {
      investmentId: z.string().describe("投资品ID"),
      timeRange: z.enum(["WEEK","MONTH","SEASON","YEAR"]).optional().describe("时间范围。默认WEEK"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ investmentId, timeRange }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.tvlChart(auth, investmentId, timeRange)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_depth_price_chart",
    "链上-分析 | 获取 V3 Pool 流动性深度/价格图【场景:看V3池的深度图/价格分布】",
    {
      investmentId: z.string().describe("投资品ID"),
      chartType: z.enum(["DEPTH","PRICE"]).optional().describe("图表类型: DEPTH=深度图(默认) PRICE=价格历史图"),
      timeRange: z.enum(["DAY","WEEK"]).optional().describe("时间范围(仅chartType=PRICE时生效): DAY=24h WEEK=1周。默认DAY"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ investmentId, chartType, timeRange }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.depthPriceChart(auth, investmentId, chartType, timeRange)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_prepare_transaction",
    "链上-分析 | 申购/赎回前的参数准备【场景:申购前查准备参数/支持哪些代币】",
    { investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值获取") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ investmentId }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.prepareTransaction(auth, investmentId)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_calc_enter_info",
    "链上-分析 | V3 Pool 双币分配计算【场景:算V3池双币投入分配】",
    {
      inputAmount: z.string().describe("单币金额, 人类可读(如'0.05')"),
      inputTokenAddress: z.string().describe("输入的代币合约地址。可以是 V3 Pool 的 token0 或 token1"),
      tokenDecimal: z.string().describe("输入代币精度(如'18','6')"),
      investmentId: z.string().describe("投资品ID"),
      address: z.string().describe("用户钱包地址"),
      tickLower: z.string().describe("V3 tick 下限(如'-33500')"),
      tickUpper: z.string().describe("V3 tick 上限(如'-30450')"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.calcEnterInfo(auth, params)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_enter",
    "链上-分析 | DeFi 申购/存款，返回 calldata 列表【场景:买入理财/存款/质押】",
    {
      investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值获取"),
      address: z.string().describe("用户钱包地址"),
      userInputList: z.array(z.object({
        tokenAddress: z.string().describe("代币合约地址(小写)"),
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH"),
        coinAmount: z.string().describe("投入数量(人类可读, 如 '0.05')"),
      })).describe("投入代币列表。从 onchainos_defi_prepare_transaction 返回的 investWithTokenList 获取"),
      tickLower: z.string().optional().describe("V3 tick 下限。仅 Dex Pool 新建仓位时需要"),
      tickUpper: z.string().optional().describe("V3 tick 上限。仅 Dex Pool 新建仓位时需要"),
      tokenId: z.string().optional().describe("V3 NFT position token ID。向已有仓位追加时必传"),
      slippage: z.string().optional().describe("滑点。'0.01'=1% '0.1'=10%。默认'0.01'"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ investmentId, address, userInputList, tickLower, tickUpper, tokenId, slippage }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const data = await defiApi.enter(auth, {
          investmentId, address, userInputList,
          ...(tickLower ? { tickLower } : {}), ...(tickUpper ? { tickUpper } : {}),
          ...(tokenId ? { tokenId } : {}), slippage,
        });
        return toResult(data, {
          nextSteps: [
            { action: "按 dataList 顺序执行: APPROVE->签名->广播, 然后 DEPOSIT->签名->广播", tool: "onchainos_gateway_broadcast", condition: "dataList 中每个元素是一个交易步骤" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_exit",
    "链上-分析 | DeFi 赎回/还款，返回 calldata 列表【场景:赎回理财/还款/取回资金】",
    {
      investmentId: z.string().describe("投资品ID"),
      address: z.string().describe("用户钱包地址"),
      redeemPercent: z.string().optional().describe("赎回比例, 建议必传。'1'=100% '0.5'=50%。不传可能导致 aToken 动态余额 revert"),
      userInputList: z.array(z.object({
        tokenAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串"),
        chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana。不确定先调 onchainos_defi_supported_chains"),
        coinAmount: z.string().optional().describe("数量"),
      })).optional().describe("输入代币列表。Farm/v2pool 传 LP Token, 其他情况传目标接收 token"),
      tokenId: z.string().optional().describe("V3 NFT position token ID。V3 Pool 赎回必传"),
      slippage: z.string().optional().describe("滑点。默认'0.01'"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ investmentId, address, redeemPercent, userInputList, tokenId, slippage }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const body: Record<string, unknown> = { investmentId, address };
        if (redeemPercent) body.redeemPercent = redeemPercent;
        if (userInputList) body.userInputList = userInputList;
        if (tokenId) body.tokenId = tokenId;
        if (slippage) body.slippage = slippage;
        return toResult(await defiApi.exit(auth, body), {
          nextSteps: [{ action: "按 dataList 顺序签名并广播", tool: "onchainos_gateway_broadcast" }],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_claim",
    "链上-分析 | 领取 DeFi 协议奖励【场景:领矿币奖励/协议分红/手续费】",
    {
      address: z.string().describe("用户钱包地址"),
      rewardType: z.enum(["REWARD_INVESTMENT","REWARD_PLATFORM","V3_FEE","REWARD_OKX_BONUS","REWARD_MERKLE_BONUS","UNLOCKED_PRINCIPAL"]).describe("奖励类型: REWARD_INVESTMENT=矿币奖励 REWARD_PLATFORM=协议奖励 V3_FEE=V3手续费 REWARD_OKX_BONUS=OKX Bonus REWARD_MERKLE_BONUS=Merkle Bonus UNLOCKED_PRINCIPAL=到期本金"),
      investmentId: z.string().optional().describe("投资品ID。除 REWARD_PLATFORM 外都需传"),
      analysisPlatformId: z.string().optional().describe("协议ID。REWARD_PLATFORM 时填写"),
      tokenId: z.string().optional().describe("V3 仓位 tokenId。V3_FEE 时填写"),
      principalIndex: z.string().optional().describe("到期订单 index。UNLOCKED_PRINCIPAL 时填写"),
      expectOutputList: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana。不确定先调 onchainos_defi_supported_chains"),
        tokenAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串"),
        coinAmount: z.string().describe("数量"),
      })).optional().describe("预期输出列表。仅 REWARD_MERKLE_BONUS 时填写"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ address, rewardType, investmentId, analysisPlatformId, tokenId, principalIndex, expectOutputList }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const body: Record<string, unknown> = { address, rewardType };
        if (investmentId) body.investmentId = investmentId;
        if (analysisPlatformId) body.analysisPlatformId = analysisPlatformId;
        if (tokenId) body.tokenId = tokenId;
        if (principalIndex) body.principalIndex = principalIndex;
        if (expectOutputList) body.expectOutputList = expectOutputList;
        return toResult(await defiApi.claim(auth, body));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_user_platform_list",
    "链上-分析 | 查询用户在各 DeFi 协议的持仓概览【场景:查我的DeFi持仓/存了哪些理财】",
    {
      walletAddressList: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana。⚠️ 不确定钱包在哪些链有 DeFi 持仓 → 每个主流链都传一个: '1','56','501','8453','42161'"),
        walletAddress: z.string().describe("钱包地址"),
        pubKey: z.string().optional().describe("公钥(某些链需要)"),
      })).min(1).describe("钱包地址列表。支持多链多钱包, 每个元素指定链ID和钱包地址"),
      tag: z.string().optional().describe("自定义标签, 用于标记查询"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ walletAddressList, tag }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await defiApi.userPlatformList(auth, { walletAddressList, ...(tag ? { tag } : {}) }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_user_platform_detail",
    "链上-分析 | 查询用户在某协议的详细持仓【场景:查某个协议里的具体持仓明细】",
    {
      walletAddressList: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana。不确定先调 onchainos_defi_supported_chains"),
        walletAddress: z.string().describe("钱包地址"),
      })).min(1).describe("钱包地址列表"),
      platformList: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana。不确定先调 onchainos_defi_supported_chains"),
        analysisPlatformId: z.string().describe("协议ID。从 onchainos_defi_user_platform_list 返回值获取"),
      })).min(1).describe("协议列表。analysisPlatformId 从 onchainos_defi_user_platform_list 返回值获取"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ walletAddressList, platformList }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await defiApi.userPlatformDetail(auth, { walletAddressList, platformList }));
      } catch(e) { return toError(e); }
    },
  );

}
