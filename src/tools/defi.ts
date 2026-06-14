/**
 * DeFi 模块 — CAT:[链上-分析]
 * 投资品查询: 链列表 + 协议 + 搜索 + 详情
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defiApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerDefiTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_defi_supported_chains",
    "CAT:[链上-分析] | ## 功能: 获取 DeFi 投资品覆盖的链, 返回 chainIndex(字符串)+network\n## 场景: 搜索/投资 DeFi 产品前确认目标链是否被覆盖\n## 关键词: DeFi, 链列表, chainIndex, network\n## 参数: 无\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_defi_supported_platforms / onchainos_defi_search_products",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.supportedChains(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_supported_platforms",
    "CAT:[链上-分析] | ## 功能: 获取 DeFi 协议列表+统计, 返回 analysisPlatformId/platformName/investmentCount\n## 场景: 了解支持哪些协议, 每个协议有多少投资品\n## 关键词: DeFi, 协议, platform, Aave, Lido\n## 参数: 无\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~5KB\n## 关联: onchainos_defi_supported_chains -> 本工具 -> onchainos_defi_search_products(按协议搜索)",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.supportedPlatforms(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_search_products",
    "CAT:[链上-分析] | ## 功能: 按代币/协议/链搜索 DeFi 投资品, 返回 investmentId/name/platformName/rate(APY)/tvl/feeRate\n## 场景: 用户想投 DeFi 时第一步 — 搜索可投产品\n## 关键词: DeFi, 搜索, 投资品, APY, TVL, product\n## 参数:\n##   - tokenKeywordList: 代币关键词数组(必填, 如[\"USDC\",\"ETH\"])\n##   - platformKeywordList: 协议关键词(可选)\n##   - pageNum: 页码(可选, 默认1, pageSize=20)\n##   - chainIndex: 链ID字符串(可选)\n##   - productGroup: 投资类型(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: 本工具拿到 investmentId -> onchainos_defi_product_detail(详情) -> 交易执行",
    {
      tokenKeywordList: z.string().describe("代币关键词 JSON 数组字符串。如 '[\"USDC\",\"ETH\"]'"),
      platformKeywordList: z.string().optional().describe("协议关键词 JSON 数组字符串。如 '[\"Aave V3\"]'"),
      pageNum: z.number().int().min(1).optional().describe("页码, 最小1, 每页20条。默认1"),
      chainIndex: z.string().optional().describe("链ID(字符串)。如 '1'=ETH '8453'=Base。不传查所有链"),
      productGroup: z.enum(["SINGLE_EARN","DEX_POOL","LENDING"]).optional().describe("投资类型: SINGLE_EARN=单币赚币 DEX_POOL=流动性池 LENDING=借贷"),
    },
    { readOnlyHint: true },
    async ({ tokenKeywordList, platformKeywordList, pageNum, chainIndex, productGroup }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        let tokens: string[]; try { tokens = JSON.parse(tokenKeywordList); } catch { return toError(new Error("tokenKeywordList 格式错误: 需要 JSON 数组, 如 '[\"USDC\"]'")); }
        let platforms: string[] | undefined;
        if (platformKeywordList) { try { platforms = JSON.parse(platformKeywordList); } catch { return toError(new Error("platformKeywordList 格式错误: 需要 JSON 数组")); } }
        return toResult(await defiApi.searchProducts(auth, { tokenKeywordList: tokens, platformKeywordList: platforms, pageNum, chainIndex, productGroup }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_product_detail",
    "CAT:[链上-分析] | ## 功能: 获取投资品完整信息, 含 APY 明细/底层资产/isSupportClaim/isInvestable/isSupportRedeem\n## 场景: 用户选好产品后查看详情, 判断可执行操作(投资/赎回/领取奖励)\n## 关键词: DeFi, 投资品详情, APY, TVL, underlyingToken\n## 参数:\n##   - investmentId: 投资品ID(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~5KB\n## 关联: onchainos_defi_search_products -> 本工具 -> 根据 isInvestable/isSupportRedeem 决定下一步",
    {
      investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值的 investmentId 字段获取"),
    },
    { readOnlyHint: true },
    async ({ investmentId }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.productDetail(auth, investmentId)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_rate_chart",
    "CAT:[链上-分析] | ## 功能: 获取投资品历史 APY 折线图数据, 返回 timestamp/rate/bonusRate/totalReward\n## 场景: 查看收益率走势, 判断最佳入场时机\n## 关键词: APY, 折线图, rate, 收益率, chart\n## 参数:\n##   - investmentId: 投资品ID(必填)\n##   - timeRange: 时间范围(可选, 默认WEEK)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_defi_product_detail -> 本工具",
    {
      investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值获取"),
      timeRange: z.enum(["WEEK","MONTH","SEASON","YEAR"]).optional().describe("时间范围: WEEK=一周 MONTH=一月 SEASON=三月 YEAR=一年。默认WEEK"),
    },
    { readOnlyHint: true },
    async ({ investmentId, timeRange }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.rateChart(auth, investmentId, timeRange)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_tvl_chart",
    "CAT:[链上-分析] | ## 功能: 获取投资品历史 TVL 折线图数据, 返回 chartVos[{timestamp,tvl,limitValue}]\n## 场景: 评估投资品规模变化趋势, TVL 增长=市场信心增强\n## 关键词: TVL, 折线图, 锁仓量, chart\n## 参数:\n##   - investmentId: 投资品ID(必填)\n##   - timeRange: 时间范围(可选, 默认WEEK)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_defi_product_detail -> 本工具",
    {
      investmentId: z.string().describe("投资品ID"),
      timeRange: z.enum(["WEEK","MONTH","SEASON","YEAR"]).optional().describe("时间范围。默认WEEK"),
    },
    { readOnlyHint: true },
    async ({ investmentId, timeRange }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.tvlChart(auth, investmentId, timeRange)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_depth_price_chart",
    "CAT:[链上-分析] | ## 功能: 获取 V3 Pool 流动性深度图或价格历史图。仅适用于 V3 DEX Pool\n## 场景: 分析 V3 池子流动性分布, 判断大额交易滑点\n## 关键词: V3, depth, 深度图, 价格图, liquidity\n## 参数:\n##   - investmentId: 投资品ID(必填)\n##   - chartType: 图表类型(可选, 默认DEPTH)\n##   - timeRange: 时间范围(可选, chartType=PRICE时生效)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~20KB\n## 关联: onchainos_defi_product_detail -> 本工具(仅V3 Pool)",
    {
      investmentId: z.string().describe("投资品ID"),
      chartType: z.enum(["DEPTH","PRICE"]).optional().describe("图表类型: DEPTH=深度图(默认) PRICE=价格历史图"),
      timeRange: z.enum(["DAY","WEEK"]).optional().describe("时间范围(仅chartType=PRICE时生效): DAY=24h WEEK=1周。默认DAY"),
    },
    { readOnlyHint: true },
    async ({ investmentId, chartType, timeRange }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.depthPriceChart(auth, investmentId, chartType, timeRange)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_prepare_transaction",
    "CAT:[链上-分析] | ## 功能: 申购/赎回前的参数准备, 返回可投币种(investWithTokenList)/凭证代币(receiveTokenInfo)/收益代币(gainsTokenList)\n## 场景: 调用 enter/exit 前必调, 确认可投什么币/收到什么凭证\n## 关键词: DeFi, prepare, 参数准备, investWithToken, receiveToken\n## 参数:\n##   - investmentId: 投资品ID(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~5KB\n## 关联: onchainos_defi_product_detail -> 本工具 -> onchainos_defi_enter(申购) / onchainos_defi_exit(赎回)",
    { investmentId: z.string().describe("投资品ID。从 onchainos_defi_search_products 返回值获取") },
    { readOnlyHint: true },
    async ({ investmentId }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.prepareTransaction(auth, investmentId)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_calc_enter_info",
    "CAT:[链上-分析] | ## 功能: V3 Pool 双币分配计算 - 输入单币金额+tick区间, 返回双币各需投入数量\n## 场景: V3 Pool 申购前计算 token0/token1 分配比例\n## 关键词: V3, 双币分配, calculator, tick, enter info\n## 参数:\n##   - inputAmount/inputTokenAddress/tokenDecimal/investmentId/address/tickLower/tickUpper(全部必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: onchainos_defi_prepare_transaction -> 本工具(仅V3 Pool) -> onchainos_defi_enter",
    {
      inputAmount: z.string().describe("单币金额, 人类可读(如'0.05')"),
      inputTokenAddress: z.string().describe("输入的代币合约地址。可以是 V3 Pool 的 token0 或 token1"),
      tokenDecimal: z.string().describe("输入代币精度(如'18','6')"),
      investmentId: z.string().describe("投资品ID"),
      address: z.string().describe("用户钱包地址"),
      tickLower: z.string().describe("V3 tick 下限(如'-33500')"),
      tickUpper: z.string().describe("V3 tick 上限(如'-30450')"),
    },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.calcEnterInfo(auth, params)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_enter",
    "CAT:[链上-分析] | ## 功能: DeFi 申购/存款/借款, 返回顺序执行的 calldata 列表(APPROVE->DEPOSIT)\n## 场景: 准备好参数后执行投资操作\n## 关键词: DeFi, 申购, enter, deposit, borrow, calldata\n## 参数:\n##   - investmentId/address(必填)\n##   - userInputList: 投入代币 JSON 数组(必填)\n##   - tickLower/tickUpper: V3 Pool 参数(可选)\n##   - tokenId: V3 NFT position ID(可选)\n##   - slippage: 滑点(可选, 默认0.01=1%)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 返回 calldata, 需签名后广播\n## 返回量: 中等 ~5KB\n## 关联: onchainos_defi_prepare_transaction -> 本工具 -> onchainos_gateway_broadcast",
    {
      investmentId: z.string().describe("投资品ID"),
      address: z.string().describe("用户钱包地址"),
      userInputList: z.string().describe("投入代币 JSON 数组。如 '[{\"tokenAddress\":\"0x...\",\"chainIndex\":\"1\",\"coinAmount\":\"0.05\"}]'。从 onchainos_defi_prepare_transaction 的 investWithTokenList 获取"),
      tickLower: z.string().optional().describe("V3 tick 下限。仅 Dex Pool 新建仓位时需要"),
      tickUpper: z.string().optional().describe("V3 tick 上限。仅 Dex Pool 新建仓位时需要"),
      tokenId: z.string().optional().describe("V3 NFT position token ID。向已有仓位追加时必传"),
      slippage: z.string().optional().describe("滑点。'0.01'=1% '0.1'=10%。默认'0.01'"),
    },
    { destructiveHint: true },
    async ({ investmentId, address, userInputList, tickLower, tickUpper, tokenId, slippage }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        let input: unknown; try { input = JSON.parse(userInputList); } catch { return toError(new Error("userInputList 格式错误: 需要 JSON 数组")); }
        const data = await defiApi.enter(auth, {
          investmentId, address, userInputList: input,
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
    "CAT:[链上-分析] | ## 功能: DeFi 赎回/还款, 返回顺序执行的 calldata 列表\n## 场景: 退出投资或偿还借款\n## 关键词: DeFi, 赎回, exit, withdraw, repay, calldata\n## 参数:\n##   - investmentId/address(必填)\n##   - redeemPercent: 赎回比例(建议传, \"1\"=100%)\n##   - userInputList: 输入代币 JSON(可选)\n##   - tokenId: V3 NFT position ID(V3赎回必传)\n##   - slippage: 滑点(可选)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 返回 calldata\n## 返回量: 中等 ~5KB\n## 关联: onchainos_defi_prepare_transaction -> 本工具 -> onchainos_gateway_broadcast",
    {
      investmentId: z.string().describe("投资品ID"),
      address: z.string().describe("用户钱包地址"),
      redeemPercent: z.string().optional().describe("赎回比例, 建议必传。'1'=100% '0.5'=50%。不传可能导致 aToken 动态余额 revert"),
      userInputList: z.string().optional().describe("输入代币 JSON 数组。Farm/v2pool 传 LP Token, 其他情况传目标接收 token"),
      tokenId: z.string().optional().describe("V3 NFT position token ID。V3 Pool 赎回必传"),
      slippage: z.string().optional().describe("滑点。默认'0.01'"),
    },
    { destructiveHint: true },
    async ({ investmentId, address, redeemPercent, userInputList, tokenId, slippage }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const body: Record<string, unknown> = { investmentId, address };
        if (redeemPercent) body.redeemPercent = redeemPercent;
        if (userInputList) { try { body.userInputList = JSON.parse(userInputList); } catch { return toError(new Error("userInputList 格式错误")); } }
        if (tokenId) body.tokenId = tokenId;
        if (slippage) body.slippage = slippage;
        return toResult(await defiApi.exit(auth, body), {
          nextSteps: [{ action: "按 dataList 顺序签名并广播", tool: "onchainos_gateway_broadcast" }],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_claim",
    "CAT:[链上-分析] | ## 功能: 领取 DeFi 协议奖励(矿币/手续费/Bonus/到期本金)\n## 场景: 定期领取 DeFi 投资收益\n## 关键词: DeFi, claim, 奖励, reward, bonus, 领取\n## 参数:\n##   - address(必填)\n##   - rewardType: 奖励类型(必填, 见描述)\n##   - investmentId: 投资品ID(大部分类型必传)\n##   - analysisPlatformId/tokenId/principalIndex: 按 rewardType 选填\n##   - expectOutputList: 预期输出 JSON(REWARD_MERKLE_BONUS 用)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 返回 calldata\n## 返回量: 微小 ~3KB\n## 关联: onchainos_defi_user_platform_list -> 本工具",
    {
      address: z.string().describe("用户钱包地址"),
      rewardType: z.enum(["REWARD_INVESTMENT","REWARD_PLATFORM","V3_FEE","REWARD_OKX_BONUS","REWARD_MERKLE_BONUS","UNLOCKED_PRINCIPAL"]).describe("奖励类型: REWARD_INVESTMENT=矿币奖励 REWARD_PLATFORM=协议奖励 V3_FEE=V3手续费 REWARD_OKX_BONUS=OKX Bonus REWARD_MERKLE_BONUS=Merkle Bonus UNLOCKED_PRINCIPAL=到期本金"),
      investmentId: z.string().optional().describe("投资品ID。除 REWARD_PLATFORM 外都需传"),
      analysisPlatformId: z.string().optional().describe("协议ID。REWARD_PLATFORM 时填写"),
      tokenId: z.string().optional().describe("V3 仓位 tokenId。V3_FEE 时填写"),
      principalIndex: z.string().optional().describe("到期订单 index。UNLOCKED_PRINCIPAL 时填写"),
      expectOutputList: z.string().optional().describe("预期输出 JSON 数组。REWARD_MERKLE_BONUS 时填写, 如 '[{\"chainIndex\":\"1\",\"tokenAddress\":\"0x...\",\"coinAmount\":\"0.001\"}]'"),
    },
    { destructiveHint: true },
    async ({ address, rewardType, investmentId, analysisPlatformId, tokenId, principalIndex, expectOutputList }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const body: Record<string, unknown> = { address, rewardType };
        if (investmentId) body.investmentId = investmentId;
        if (analysisPlatformId) body.analysisPlatformId = analysisPlatformId;
        if (tokenId) body.tokenId = tokenId;
        if (principalIndex) body.principalIndex = principalIndex;
        if (expectOutputList) { try { body.expectOutputList = JSON.parse(expectOutputList); } catch { return toError(new Error("expectOutputList 格式错误")); } }
        return toResult(await defiApi.claim(auth, body));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_user_platform_list",
    "CAT:[链上-分析] | ## 功能: 查询用户在各 DeFi 协议的持仓概览, 返回 platformName/analysisPlatformId/currencyAmount(USD)/investmentCount\n## 场景: 用户想看 DeFi 资产分布时第一步 - 按协议汇总\n## 关键词: DeFi, 持仓, 协议, platform, asset, portfolio\n## 参数:\n##   - walletAddressList: 钱包地址 JSON 数组(必填)\n##   - tag: 自定义标签(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~20KB\n## 关联: 本工具拿 analysisPlatformId -> onchainos_defi_user_platform_detail(明细) -> onchainos_defi_exit/claim",
    {
      walletAddressList: z.string().describe("钱包地址 JSON 数组。如 '[{\"chainIndex\":\"1\",\"walletAddress\":\"0x...\"},{\"chainIndex\":\"56\",\"walletAddress\":\"0x...\"}]'。支持多链多钱包"),
      tag: z.string().optional().describe("自定义标签, 用于标记查询"),
    },
    { readOnlyHint: true },
    async ({ walletAddressList, tag }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        let list: Array<{ chainIndex: string; walletAddress: string; pubKey?: string }>;
        try { list = JSON.parse(walletAddressList); } catch { return toError(new Error("walletAddressList 格式错误: 需要 JSON 数组")); }
        return toResult(await defiApi.userPlatformList(auth, { walletAddressList: list, ...(tag ? { tag } : {}) }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_defi_user_platform_detail",
    "CAT:[链上-分析] | ## 功能: 查询用户在某协议的详细持仓, 返回每个投资品的仓位/资产/奖励详情\n## 场景: 看某个协议的具体投资分布、可领取奖励、仓位状态\n## 关键词: DeFi, 持仓明细, position, reward, availableRewards\n## 参数:\n##   - walletAddressList: 钱包地址 JSON 数组(必填)\n##   - platformList: 协议 JSON 数组(必填, 含 chainIndex+analysisPlatformId)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 大 ~100KB\n## 关联: onchainos_defi_user_platform_list -> 本工具 -> onchainos_defi_claim(领奖励)/onchainos_defi_exit(赎回)",
    {
      walletAddressList: z.string().describe("钱包地址 JSON 数组。如 '[{\"chainIndex\":\"1\",\"walletAddress\":\"0x...\"}]'"),
      platformList: z.string().describe("协议 JSON 数组。如 '[{\"chainIndex\":\"1\",\"analysisPlatformId\":\"44\"}]'。analysisPlatformId 从 onchainos_defi_user_platform_list 获取"),
    },
    { readOnlyHint: true },
    async ({ walletAddressList, platformList }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        let wallets: unknown; try { wallets = JSON.parse(walletAddressList); } catch { return toError(new Error("walletAddressList 格式错误")); }
        let platforms: unknown; try { platforms = JSON.parse(platformList); } catch { return toError(new Error("platformList 格式错误")); }
        return toResult(await defiApi.userPlatformDetail(auth, { walletAddressList: wallets, platformList: platforms }));
      } catch(e) { return toError(e); }
    },
  );

}
