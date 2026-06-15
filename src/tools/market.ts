/**
 * Market 模块 — CAT:[链上-行情]
 * 行情价格: supported_chain + price + trades + candles + historical_candles
 * ⚠️ x402 付费接口 — 需钱包持有 X Layer 上 USDG/USDT0 并 EIP-3009 签名
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { marketApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerMarketTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_market_supported_chain",
    "链上-行情 | 获取行情 API 支持的链列表",
    { chainIndex: z.string().optional().describe("链索引, 可选过滤") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.supportedChain(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_market_price",
    "链上-行情 | 批量获取代币最新价格",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"}]"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        let list: Array<{ chainIndex: string; tokenContractAddress: string }>;
        try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误: 需 JSON 数组")); }
        return toResult(await marketApi.price(auth, list));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_candles",
    "链上-行情 | 获取 K 线 OHLCV 数据",
    {
      chainIndex: z.string().describe("链索引, 如'1'=ETH '501'=Solana"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      bar: z.string().optional().describe("时间粒度: 1s/1m/3m/5m/15m/30m/1H/2H/4H/6H/12H/1D/1W/1M/3M。UTC: 6Hutc/12Hutc/1Dutc/1Wutc/1Mutc/3Mutc。默认1m"),
      after: z.string().optional().describe("请求此时间戳之前(更旧)的数据"),
      before: z.string().optional().describe("请求此时间戳之后(更新)的数据"),
      limit: z.string().optional().describe("返回条数, 最大299, 默认100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, bar, after, before, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.candles(auth, { chainIndex, tokenContractAddress, bar, after, before, limit })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_historical_candles",
    "链上-行情 | 获取历史 K 线(仅已完结)",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      bar: z.string().optional().describe("时间粒度"),
      after: z.string().optional().describe("更旧数据的时间戳"),
      before: z.string().optional().describe("更新数据的时间戳"),
      limit: z.string().optional().describe("返回条数, 最大299"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, bar, after, before, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.historicalCandles(auth, { chainIndex, tokenContractAddress, bar, after, before, limit })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_trades",
    "链上-行情 | 获取代币 DEX 交易活动",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      tagFilter: z.string().optional().describe("地址标签: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=捆绑交易"),
      walletAddressFilter: z.string().optional().describe("查询指定地址, 逗号分隔, 最多10个"),
      after: z.string().optional().describe("分页游标(交易id)"),
      limit: z.string().optional().describe("条数, 最大500, 默认100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.trades(auth, params as any)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_price_info",
    "链上-行情 | 批量获取代币交易信息(价格/涨跌幅/市值)",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"501\",\"tokenContractAddress\":\"0x...\"}]"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { let list: any; try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误")); } return toResult(await marketApi.priceInfo(auth, list)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_advanced_info",
    "链上-行情 | 获取代币安全分析(貔貅检测)",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenAdvancedInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  // ── 综合币价 ──────────────────────────────────────

  server.tool("onchainos_index_current_price",
    "链上-行情 | 获取综合币价(多数据源加权均价)",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"}]。主链币传空字符串"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { let list: any; try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误")); } return toResult(await marketApi.indexCurrentPrice(auth, list)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_index_historical_price",
    "链上-行情 | 获取历史综合币价，支持分页",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().optional().describe("代币地址, 空字符串=主链币"),
      limit: z.string().optional().describe("条数, 默认50, 最大200"),
      cursor: z.string().optional().describe("游标分页"),
      begin: z.string().optional().describe("开始时间(Unix毫秒)"),
      end: z.string().optional().describe("结束时间(Unix毫秒)"),
      period: z.enum(["1m","5m","30m","1h","1d"]).optional().describe("时间间隔, 默认1d"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, limit, cursor, begin, end, period }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.indexHistoricalPrice(auth, { chainIndex, tokenContractAddress, limit, cursor, begin, end, period })); } catch(e) { return toError(e); }
    },
  );

  // ── 代币 API ──────────────────────────────────────

  server.tool("onchainos_token_search",
    "链上-行情 | 跨链搜索代币(名称/符号/地址)",
    {
      chains: z.string().describe("链ID, 逗号分隔。如'1'=ETH '501'=Solana '8453'=Base"),
      search: z.string().describe("搜索关键词: 代币名称/符号/合约地址。地址搜索返回精确匹配"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chains, search, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.searchToken(auth, chains, search, cursor, limit)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_basic_info",
    "链上-行情 | 批量获取代币基础信息",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"501\",\"tokenContractAddress\":\"0x...\"}]"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { let list: any; try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误")); } return toResult(await marketApi.tokenBasicInfo(auth, list)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_top_liquidity",
    "链上-行情 | 获取代币前 5 流动性池",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenTopLiquidity(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_hot",
    "链上-行情 | 获取热门代币榜单",
    {
      rankingType: z.enum(["4","5"]).describe("4=Trending(token score) 5=Xmentioned(twitter提及)"),
      chainIndex: z.string().optional().describe("链索引, 不传=所有链"),
      rankBy: z.string().optional().describe("排序: 1=价格 2=涨跌幅 3=交易笔数 4=独立地址 5=交易额 6=市值 7=流动性 8=创建时间 9=搜索次数 10=持币数 11=社媒提及 12=社媒分数 14=净流入 15=代币分数"),
      rankingTimeFrame: z.string().optional().describe("时间窗口: 1=5m 2=1h 3=4h 4=24h"),
      riskFilter: z.boolean().optional().describe("隐藏风险代币, 默认true"),
      protocolId: z.string().optional().describe("协议ID, 逗号分隔"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { const q: Record<string,string|number|boolean|undefined> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=v; return toResult(await marketApi.tokenHot(auth, q)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_holder",
    "链上-行情 | 获取代币前 100 持有人",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      tagFilter: z.string().optional().describe("标签: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=可疑 7=狙击手 8=疑似钓鱼 9=Bundle"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, tagFilter, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenHolder(auth, { chainIndex, tokenContractAddress, tagFilter, cursor, limit })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_cluster_supported_chain",
    "链上-行情 | 获取持仓聚类分析支持的链",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_overview",
    "链上-行情 | 获取代币持仓集中度分析",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenClusterOverview(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_cluster_list",
    "链上-行情 | 获取持仓集群列表",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterList(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_top_holders",
    "链上-行情 | 获取前10/50/100持仓集中度",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      rangeFilter: z.enum(["1","2","3"]).describe("范围: 1=前10 2=前50 3=前100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, rangeFilter }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterTopHolders(auth, chainIndex, tokenContractAddress, rangeFilter)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_top_trader",
    "链上-行情 | 获取代币前100盈利地址",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      tagFilter: z.string().optional().describe("标签过滤: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=Bundle"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, tagFilter, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenTopTrader(auth, { chainIndex, tokenContractAddress, tagFilter, cursor, limit })); } catch(e) { return toError(e); } },
  );

  // ── 信号 ──────────────────────────────────────────

  server.tool("onchainos_signal_supported_chain",
    "链上-信号 | 获取信号支持的链",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.signalSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_signal_list",
    "链上-信号 | 获取最新买入信号(聪明钱/KOL/鲸鱼)",
    {
      chainIndex: z.string().describe("链索引, 如'501'=Solana"),
      walletType: z.string().optional().describe("钱包类型: 1=聪明钱 2=KOL 3=鲸鱼, 逗号分隔如'1,2,3'"),
      minAmountUsd: z.string().optional().describe("最小交易金额(USD)"),
      maxAmountUsd: z.string().optional().describe("最大交易金额(USD)"),
      minAddressCount: z.string().optional().describe("最小地址数"),
      maxAddressCount: z.string().optional().describe("最大地址数"),
      tokenAddress: z.string().optional().describe("指定代币合约地址"),
      minMarketCapUsd: z.string().optional().describe("最小市值(USD)"),
      maxMarketCapUsd: z.string().optional().describe("最大市值(USD)"),
      minLiquidityUsd: z.string().optional().describe("最小流动性(USD)"),
      maxLiquidityUsd: z.string().optional().describe("最大流动性(USD)"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { const b: Record<string,unknown> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) b[k]=v; return toResult(await marketApi.signalList(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_supported_chain",
    "链上-信号 | 获取聪明钱排行榜支持的链",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.leaderboardSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_list",
    "链上-信号 | 获取聪明钱排行榜(PnL/ROI/胜率)",
    {
      chainIndex: z.string().describe("链索引"),
      timeFrame: z.enum(["1","2","3","4","5"]).describe("时间范围: 1=1D 2=3D 3=7D 4=1M 5=3M"),
      sortBy: z.enum(["1","2","3","4","5"]).describe("排序: 1=PnL 2=胜率 3=交易笔数 4=交易量 5=ROI"),
      walletType: z.string().optional().describe("钱包类型: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=Bundle 10=Pump聪明钱。不传=所有"),
      minRealizedPnlUsd: z.string().optional().describe("最小已实现盈亏(USD)"),
      maxRealizedPnlUsd: z.string().optional().describe("最大已实现盈亏(USD)"),
      minWinRatePercent: z.string().optional().describe("最小胜率(%)"),
      maxWinRatePercent: z.string().optional().describe("最大胜率(%)"),
      minTxs: z.string().optional().describe("最小交易笔数"),
      maxTxs: z.string().optional().describe("最大交易笔数"),
      minTxVolume: z.string().optional().describe("最小交易金额(USD)"),
      maxTxVolume: z.string().optional().describe("最大交易金额(USD)"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=v; return toResult(await marketApi.leaderboardList(auth, q)); } catch(e) { return toError(e); } },
  );

  // ── Memepump / 扫链 ─────────────────────────────

  server.tool("onchainos_memepump_supported",
    "链上-行情 | 获取扫链支持的链和协议",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSupported(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_list",
    "链上-行情 | 筛选 Meme 代币(30+维度)",
    {
      chainIndex: z.string().describe("链索引"),
      stage: z.enum(["NEW","MIGRATING","MIGRATED"]).describe("代币阶段"),
      protocolIdList: z.string().optional().describe("协议ID, 逗号分隔"),
      walletAddress: z.string().optional().describe("用户钱包地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, stage, ...rest }) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string|boolean|undefined>={chainIndex,stage}; for (const [k,v] of Object.entries(rest)) if (v!==undefined) q[k]=String(v); return toResult(await marketApi.memepumpTokenList(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_details",
    "链上-行情 | 单一代币扫链详情",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址"), walletAddress: z.string().optional().describe("查用户持仓") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, walletAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDetails(auth, chainIndex, tokenContractAddress, walletAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_dev_info",
    "链上-行情 | 获取开发者信息(发币数/RugPull/持仓)",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDevInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_similar_token",
    "链上-行情 | 查找相似代币",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSimilarToken(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_bundle_info",
    "链上-行情 | 检测打包交易(bundler占比)",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpBundleInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_aped_wallet",
    "链上-行情 | 获取同车钱包列表(含PnL)",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址"), walletAddress: z.string().optional().describe("指定钱包") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, walletAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpApedWallet(auth, chainIndex, tokenContractAddress, walletAddress)); } catch(e) { return toError(e); } },
  );

  // ── Portfolio / 地址分析 ─────────────────────────

  server.tool("onchainos_portfolio_supported_chain",
    "链上-分析 | 获取地址分析支持的链",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_overview",
    "链上-分析 | 获取地址画像概览(PnL/胜率)",
    {
      chainIndex: z.string().describe("链索引"),
      walletAddress: z.string().describe("钱包地址"),
      timeFrame: z.enum(["1","2","3","4","5"]).describe("时间范围: 1=1D 2=3D 3=7D 4=1M 5=3M"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, timeFrame }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioOverview(auth, chainIndex, walletAddress, timeFrame)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_recent_pnl",
    "链上-分析 | 获取地址近期收益列表",
    { chainIndex: z.string().describe("链索引"), walletAddress: z.string().describe("钱包地址"), cursor: z.string().optional(), limit: z.string().optional() },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioRecentPnl(auth, { chainIndex, walletAddress, cursor, limit })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_token_latest_pnl",
    "链上-分析 | 获取地址对特定代币的最新收益",
    { chainIndex: z.string().describe("链索引"), walletAddress: z.string().describe("钱包地址"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioTokenLatestPnl(auth, chainIndex, walletAddress, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_dex_history",
    "链上-分析 | 获取地址 DEX 交易历史",
    {
      chainIndex: z.string().describe("链索引"), walletAddress: z.string().describe("钱包地址"),
      begin: z.string().describe("开始时间戳(毫秒)"), end: z.string().describe("结束时间戳(毫秒)"),
      tokenContractAddress: z.string().optional(), type: z.string().optional().describe("1=BUY 2=SELL 3=TransferIn 4=TransferOut"), cursor: z.string().optional(), limit: z.string().optional(),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, begin, end, tokenContractAddress, type, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioDexHistory(auth, { chainIndex, walletAddress, begin, end, tokenContractAddress, type, cursor, limit })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_address_tracker_trades",
    "链上-分析 | 获取地址追踪交易(聪明钱/KOL)",
    {
      trackerType: z.enum(["1","2","3"]).describe("1=平台聪明钱 2=Top100 KOL 3=自定义多地址"),
      walletAddress: z.string().optional().describe("trackerType=3时必填, 逗号分隔, 最多20个"),
      tradeType: z.enum(["0","1","2"]).optional().describe("0=全部 1=买入 2=卖出"),
      chainIndex: z.string().optional().describe("链索引, 默认全部"),
      minVolume: z.string().optional(), maxVolume: z.string().optional(),
      minHolders: z.string().optional(), minMarketCap: z.string().optional(), maxMarketCap: z.string().optional(),
      minLiquidity: z.string().optional(), maxLiquidity: z.string().optional(),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=String(v); return toResult(await marketApi.addressTrackerTrades(auth, q as any)); } catch(e) { return toError(e); } },
  );

  // ── Social / 社媒 ─────────────────────────────────

  server.tool("onchainos_social_news_latest",
    "链上-分析 | 获取最新加密货币新闻(含情绪标签)",
    {
      tokenSymbols: z.string().optional().describe("代币符号,逗号分隔,最多20个,如BTC,ETH"),
      begin: z.string().optional().describe("起始时间戳(毫秒),默认72h前,最大回溯180天"),
      end: z.string().optional().describe("结束时间戳(毫秒),默认now"),
      importance: z.enum(["1","2","3"]).optional().describe("重要程度: 1=高 2=中 3=低"),
      platform: z.string().optional().describe("新闻来源域名,如coindesk.com。从 onchainos_social_news_platforms 获取"),
      limit: z.string().optional().describe("每页条数,1-50,默认10"),
      cursor: z.string().optional().describe("分页游标"),
      detailLevel: z.enum(["1","2"]).optional().describe("1=摘要(默认) 2=全文"),
      language: z.string().optional().describe("语言,BCP-47格式,如en_US/zh_CN,默认en_US"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialNewsLatest(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_by_symbol",
    "链上-分析 | 按代币符号获取新闻",
    {
      tokenSymbols: z.string().describe("代币符号,逗号分隔,最多20个。必填"),
      sortBy: z.enum(["1","2"]).optional().describe("1=最新 2=热门,默认1"),
      sentiment: z.enum(["1","2","3"]).optional().describe("情绪: 1=看多 2=看空 3=中性"),
      importance: z.enum(["1","2","3"]).optional().describe("重要程度: 1=高 2=中 3=低"),
      platform: z.string().optional().describe("新闻来源域名"),
      limit: z.string().optional().describe("每页条数,1-50,默认10"),
      cursor: z.string().optional().describe("分页游标"),
      detailLevel: z.enum(["1","2"]).optional().describe("1=摘要 2=全文"),
      begin: z.string().optional().describe("起始时间戳(毫秒)"),
      end: z.string().optional().describe("结束时间戳(毫秒)"),
      language: z.string().optional().describe("语言,如en_US/zh_CN"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialNewsBySymbol(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_search",
    "链上-分析 | 全文搜索加密货币新闻",
    {
      keyword: z.string().describe("全文搜索关键词,必填。支持代币名/项目名"),
      sortBy: z.enum(["1","2"]).optional().describe("1=最新 2=热门"),
      sentiment: z.enum(["1","2","3"]).optional().describe("情绪: 1=看多 2=看空 3=中性"),
      importance: z.enum(["1","2","3"]).optional().describe("重要程度: 1=高 2=中 3=低"),
      platform: z.string().optional().describe("新闻来源域名"),
      tokenSymbols: z.string().optional().describe("代币符号,逗号分隔,最多20个"),
      begin: z.string().optional().describe("起始时间戳(毫秒)"),
      end: z.string().optional().describe("结束时间戳(毫秒)"),
      detailLevel: z.enum(["1","2"]).optional().describe("1=摘要 2=全文"),
      limit: z.string().optional().describe("每页条数,1-50,默认10"),
      cursor: z.string().optional().describe("分页游标"),
      language: z.string().optional().describe("语言,如en_US/zh_CN"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialNewsSearch(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_detail",
    "链上-分析 | 获取新闻正文",
    { articleId: z.string().describe("文章ID,从列表接口articles[].id获取"), language: z.string().optional().describe("en_US/zh_CN") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ articleId, language }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.socialNewsDetail(auth, articleId, language)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_platforms",
    "链上-分析 | 获取可用新闻平台列表",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.socialNewsPlatforms(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_sentiment_symbol",
    "链上-分析 | 获取代币情绪指标",
    { tokenSymbols: z.string().describe("代币符号,逗号分隔,最多20个"), timeFrame: z.enum(["1","2","3"]).optional().describe("1=1h 2=4h 3=24h"), trendPoints: z.string().optional().describe("趋势数据点数,>0返回trend数组") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialSentimentSymbol(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_sentiment_ranking",
    "链上-分析 | 获取情绪热度排行榜",
    { timeFrame: z.enum(["1","2","3"]).optional(), sortBy: z.enum(["1"]).optional().describe("目前仅支持1=hot(按提及量)"), limit: z.string().optional() },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialSentimentRanking(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_vibe_timeline",
    "链上-分析 | 获取代币 Vibe 热度时间线",
    { chainIndex: z.string().describe("链ID"), tokenAddress: z.string().describe("代币合约地址"), timeFrame: z.enum(["1","2","3","4"]).optional().describe("1=24h 2=72h 3=7d 4=30d") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialVibeTimeline(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_vibe_top_kols",
    "链上-分析 | 获取热门 KOL 列表",
    { chainIndex: z.string().describe("链ID"), tokenAddress: z.string().describe("代币合约地址"), sortBy: z.enum(["1","2","3"]).optional().describe("1=互动量 2=提及数 3=曝光量"), timeFrame: z.enum(["1","2","3","4"]).optional(), limit: z.string().optional() },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialVibeTopKols(auth, q)); } catch(e) { return toError(e); } },
  );

}
