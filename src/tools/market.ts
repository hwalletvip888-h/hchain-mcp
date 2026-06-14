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
    "CAT:[链上-行情] | ## 功能: 获取行情价格 API 支持的链, 返回 chainIndex/chainName/chainLogoUrl/chainSymbol\n## 场景: 查行情前确认目标链是否被 Market API 覆盖\n## 关键词: 行情, 链列表, market, chainIndex\n## 参数:\n##   - chainIndex: 可选过滤\n## 鉴权: Free — 免费调用\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_market_price / onchainos_market_candles",
    { chainIndex: z.string().optional().describe("链索引, 可选过滤") },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.supportedChain(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_market_price",
    "CAT:[链上-行情] | ## 功能: 获取代币最新价格(批量), 返回 chainIndex/tokenContractAddress/price/time\n## 场景: 实时查价, 一次可查多个代币\n## 关键词: 价格, price, 实时行情, 批量\n## 参数:\n##   - tokens: JSON 数组 [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"},...]\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: onchainos_market_supported_chain -> 本工具",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"}]"),
    },
    { readOnlyHint: true },
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
    "CAT:[链上-行情] | ## 功能: 获取 K 线 OHLCV 数据, 返回 [ts,o,h,l,c,vol,volUsd,confirm]\n## 场景: 技术分析/走势图, 最近1000根\n## 关键词: K线, candlestick, OHLCV, 技术分析\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n##   - bar: 时间粒度, 默认1m(可选)\n##   - after/before/limit: 分页(可选)\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~50KB\n## 关联: onchainos_market_price -> 本工具",
    {
      chainIndex: z.string().describe("链索引, 如'1'=ETH '501'=Solana"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      bar: z.string().optional().describe("时间粒度: 1s/1m/3m/5m/15m/30m/1H/2H/4H/6H/12H/1D/1W/1M/3M。UTC: 6Hutc/12Hutc/1Dutc/1Wutc/1Mutc/3Mutc。默认1m"),
      after: z.string().optional().describe("请求此时间戳之前(更旧)的数据"),
      before: z.string().optional().describe("请求此时间戳之后(更新)的数据"),
      limit: z.string().optional().describe("返回条数, 最大299, 默认100"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, bar, after, before, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.candles(auth, { chainIndex, tokenContractAddress, bar, after, before, limit })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_historical_candles",
    "CAT:[链上-行情] | ## 功能: 获取历史 K 线(仅已完结), 返回 [ts,o,h,l,c,vol,volUsd]\n## 场景: 回测/趋势分析, 比 candles 数据量大\n## 关键词: 历史K线, historical, OHLCV, 回测\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n##   - bar/after/before/limit(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 大 ~200KB\n## 关联: onchainos_market_candles(实时) -> 本工具(历史)",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      bar: z.string().optional().describe("时间粒度"),
      after: z.string().optional().describe("更旧数据的时间戳"),
      before: z.string().optional().describe("更新数据的时间戳"),
      limit: z.string().optional().describe("返回条数, 最大299"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, bar, after, before, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.historicalCandles(auth, { chainIndex, tokenContractAddress, bar, after, before, limit })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_trades",
    "CAT:[链上-行情] | ## 功能: 获取代币 DEX 交易活动, 返回每笔成交的 type(buy/sell)/price/volume/dexName/userAddress\n## 场景: 看代币实时成交, 支持按地址标签(KOL/聪明钱/鲸鱼等)过滤\n## 关键词: 交易记录, trades, 成交, buy, sell\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n##   - tagFilter: 地址标签过滤 1-9(可选)\n##   - walletAddressFilter: 指定地址过滤(可选, 逗号分隔, 最多10个)\n##   - after/limit: 分页(可选)\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~30KB\n## 关联: onchainos_market_price -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      tagFilter: z.string().optional().describe("地址标签: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=捆绑交易"),
      walletAddressFilter: z.string().optional().describe("查询指定地址, 逗号分隔, 最多10个"),
      after: z.string().optional().describe("分页游标(交易id)"),
      limit: z.string().optional().describe("条数, 最大500, 默认100"),
    },
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.trades(auth, params as any)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_price_info",
    "CAT:[链上-行情] | ## 功能: 批量获取代币交易信息(价格/涨跌幅/交易量/市值/持有人/流通量), 最多100个\n## 场景: 一次查多个代币的全面市场数据\n## 关键词: 价格信息, price info, 涨跌幅, 市值, 交易量\n## 参数:\n##   - tokens: JSON数组 [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"}]\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~20KB\n## 关联: onchainos_token_search -> 本工具",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"501\",\"tokenContractAddress\":\"0x...\"}]"),
    },
    { readOnlyHint: true },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { let list: any; try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误")); } return toResult(await marketApi.priceInfo(auth, list)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_advanced_info",
    "CAT:[链上-行情] | ## 功能: 获取代币安全分析(貔貅检测/开发者行为/狙击手/捆绑/风控等级)\n## 场景: Agent 交易前必调 — 排查合约风险\n## 关键词: 安全, advanced, 貔貅, honeypot, 狙击手, rug pull\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: onchainos_token_basic_info -> 本工具(土狗检测)",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenAdvancedInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  // ── 综合币价 ──────────────────────────────────────

  server.tool("onchainos_index_current_price",
    "CAT:[链上-行情] | ## 功能: 获取综合币价(多数据源加权均价), 批量最多100个\n## 场景: 需要抗操纵的参考价格时用, 比单DEX价格更可靠\n## 关键词: 指数价格, index, 加权均价, 综合币价\n## 参数:\n##   - tokens: JSON数组 [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"}]\n## 鉴权: Free — 免费调用\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: onchainos_market_price(实时价) -> 本工具(指数价)",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"}]。主链币传空字符串"),
    },
    { readOnlyHint: true },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { let list: any; try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误")); } return toResult(await marketApi.indexCurrentPrice(auth, list)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_index_historical_price",
    "CAT:[链上-行情] | ## 功能: 获取历史综合币价, 支持分页\n## 场景: 回测/分析币价走势\n## 关键词: 历史指数价, index historical, 回测\n## 参数:\n##   - chainIndex(必填)\n##   - tokenContractAddress/limit/cursor/begin/end/period(可选)\n## 鉴权: Free — 免费调用\n## 风险: READ - 付费查询\n## 返回量: 中等 ~30KB\n## 关联: onchainos_index_current_price -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().optional().describe("代币地址, 空字符串=主链币"),
      limit: z.string().optional().describe("条数, 默认50, 最大200"),
      cursor: z.string().optional().describe("游标分页"),
      begin: z.string().optional().describe("开始时间(Unix毫秒)"),
      end: z.string().optional().describe("结束时间(Unix毫秒)"),
      period: z.enum(["1m","5m","30m","1h","1d"]).optional().describe("时间间隔, 默认1d"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, limit, cursor, begin, end, period }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.indexHistoricalPrice(auth, { chainIndex, tokenContractAddress, limit, cursor, begin, end, period })); } catch(e) { return toError(e); }
    },
  );

  // ── 代币 API ──────────────────────────────────────

  server.tool("onchainos_token_search",
    "CAT:[链上-行情] | ## 功能: 跨链搜索代币(名称/符号/地址), 返回 tokenName/symbol/address/decimal/price/marketCap/holders\n## 场景: Agent 查找代币合约地址第一步\n## 关键词: 搜索, 代币, search, token, symbol\n## 参数:\n##   - chains: 链ID逗号分隔(必填, 如'1,10,501')\n##   - search: 关键词(必填)\n##   - cursor/limit: 分页(可选)\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~30KB\n## 关联: 本工具 -> onchainos_token_basic_info / onchainos_market_price",
    {
      chains: z.string().describe("链ID, 逗号分隔。如'1'=ETH '501'=Solana '8453'=Base"),
      search: z.string().describe("搜索关键词: 代币名称/符号/合约地址。地址搜索返回精确匹配"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true },
    async ({ chains, search, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.searchToken(auth, chains, search, cursor, limit)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_basic_info",
    "CAT:[链上-行情] | ## 功能: 批量获取代币基础信息(tokenName/symbol/decimal/logo/tagList)\n## 场景: 验证代币元数据\n## 关键词: 代币信息, token info, decimals\n## 参数:\n##   - tokens: JSON数组 [{\"chainIndex\":\"501\",\"tokenContractAddress\":\"0x...\"}]\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 微小 ~5KB\n## 关联: onchainos_token_search -> 本工具",
    {
      tokens: z.string().describe("JSON 数组: [{\"chainIndex\":\"501\",\"tokenContractAddress\":\"0x...\"}]"),
    },
    { readOnlyHint: true },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { let list: any; try { list = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误")); } return toResult(await marketApi.tokenBasicInfo(auth, list)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_top_liquidity",
    "CAT:[链上-行情] | ## 功能: 获取代币前5流动性池(协议名/流动性价值/池子地址/费率)\n## 场景: 评估代币流动性深度\n## 关键词: 流动性, liquidity, 池子, pool\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 微小 ~5KB\n## 关联: onchainos_token_search -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenTopLiquidity(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_hot",
    "CAT:[链上-行情] | ## 功能: 获取热门代币榜单(Trending/Xmentioned), 最多100条\n## 场景: 发现市场热点\n## 关键词: 热门, hot, trending, 榜单\n## 参数:\n##   - rankingType: 4=Trending 5=Xmentioned(必填)\n##   - chainIndex/rankBy/rankingTimeFrame/riskFilter/protocolId(可选)\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~20KB\n## 关联: 本工具 -> onchainos_token_basic_info",
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
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { const q: Record<string,string|number|boolean|undefined> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=v; return toResult(await marketApi.tokenHot(auth, q)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_holder",
    "CAT:[链上-行情] | ## 功能: 获取代币前100持有人(持币量/买入均价/盈亏/资金来源)\n## 场景: 分析筹码集中度\n## 关键词: 持有人, holder, 持仓, 盈亏\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n##   - tagFilter: 1-9标签过滤(可选)\n##   - cursor/limit: 分页(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~30KB\n## 关联: onchainos_token_basic_info -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      tagFilter: z.string().optional().describe("标签: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=可疑 7=狙击手 8=疑似钓鱼 9=Bundle"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, tagFilter, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenHolder(auth, { chainIndex, tokenContractAddress, tagFilter, cursor, limit })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_cluster_supported_chain",
    "CAT:[链上-行情] | ## 功能: 获取持仓聚类分析支持的链\n## 场景: 聚类分析前确认链\n## 关键词: 聚类, cluster, 链列表\n## 参数: 无\n## 鉴权: Free — 免费调用\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_token_cluster_overview",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_overview",
    "CAT:[链上-行情] | ## 功能: 获取代币持仓集中度(clusterConcentration/rugPullPercent/top100HoldingsPercent)\n## 场景: 土狗检测 — 集中度High+rugPullPercent高=高风险\n## 关键词: 聚类, cluster, 集中度, rug pull\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 微小 ~1KB\n## 关联: onchainos_token_cluster_supported_chain -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenClusterOverview(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_cluster_list",
    "CAT:[链上-行情] | ## 功能: 获取持仓集群列表(top100集群), 含holdingAmount/trendType/pnlUsd/地址列表\n## 场景: 深度分析持仓结构\n## 关键词: 聚类列表, cluster list, 持仓, PnL\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 大 ~200KB\n## 关联: onchainos_token_cluster_overview -> 本工具",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterList(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_top_holders",
    "CAT:[链上-行情] | ## 功能: 获取前10/50/100持仓集中度(holdingPercent/averagePnlUsd/averageBuyPrice)\n## 场景: 快速评估筹码分布\n## 关键词: 顶级持有人, top holders, 筹码集中\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n##   - rangeFilter: 1=前10 2=前50 3=前100(必填)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: onchainos_token_cluster_overview -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      rangeFilter: z.enum(["1","2","3"]).describe("范围: 1=前10 2=前50 3=前100"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, rangeFilter }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterTopHolders(auth, chainIndex, tokenContractAddress, rangeFilter)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_top_trader",
    "CAT:[链上-行情] | ## 功能: 获取代币前100盈利地址(realizedPnlUsd/boughtAmount/avgBuyPrice)\n## 场景: 跟踪聪明钱, 看谁在赚钱\n## 关键词: 盈利地址, top trader, PnL, 聪明钱\n## 参数:\n##   - chainIndex/tokenContractAddress(必填)\n##   - tagFilter: 标签过滤1-9(可选)\n##   - cursor/limit(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~30KB\n## 关联: onchainos_token_holder -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      tagFilter: z.string().optional().describe("标签过滤: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=Bundle"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, tagFilter, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenTopTrader(auth, { chainIndex, tokenContractAddress, tagFilter, cursor, limit })); } catch(e) { return toError(e); } },
  );

  // ── 信号 ──────────────────────────────────────────

  server.tool("onchainos_signal_supported_chain",
    "CAT:[链上-信号] | ## 功能: 获取信号支持的链\n## 场景: 查信号前确认链\n## 关键词: 信号, signal, 链列表\n## 参数: 无\n## 鉴权: Free — 免费调用\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_signal_list",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.signalSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_signal_list",
    "CAT:[链上-信号] | ## 功能: 获取最新买入信号(聪明钱/KOL/鲸鱼), 支持金额/市值/流动性筛选\n## 场景: 实时监控聪明钱动向\n## 关键词: 信号, signal, 聪明钱, 异动, KOL\n## 参数:\n##   - chainIndex(必填)\n##   - walletType: 1=聪明钱 2=KOL 3=鲸鱼, 逗号分隔(可选)\n##   - minAmountUsd/maxAmountUsd: 金额筛选(可选)\n##   - minAddressCount/maxAddressCount: 地址数筛选(可选)\n##   - tokenAddress: 指定代币(可选)\n##   - minMarketCapUsd/maxMarketCapUsd: 市值筛选(可选)\n##   - minLiquidityUsd/maxLiquidityUsd: 流动性筛选(可选)\n##   - cursor/limit: 分页(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~20KB\n## 关联: onchainos_signal_supported_chain -> 本工具 -> onchainos_token_basic_info",
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
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { const b: Record<string,unknown> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) b[k]=v; return toResult(await marketApi.signalList(auth, b)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_leaderboard_supported_chain",
    "CAT:[链上-信号] | ## 功能: 获取聪明钱排行榜支持的链\n## 场景: 看排行榜前确认链\n## 关键词: 排行榜, leaderboard, 链列表\n## 参数: 无\n## 鉴权: Free — 免费调用\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_leaderboard_list",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.leaderboardSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_list",
    "CAT:[链上-信号] | ## 功能: 获取聪明钱排行榜(PnL/ROI/胜率/交易量/交易数), 最多20条\n## 场景: 发现表现最好的交易者地址\n## 关键词: 排行榜, leaderboard, 聪明钱, PnL, ROI\n## 参数:\n##   - chainIndex/timeFrame/sortBy(必填)\n##   - walletType: 钱包类型筛选(可选, 1-10)\n##   - minRealizedPnlUsd/maxRealizedPnlUsd: 盈亏筛选(可选)\n##   - minWinRatePercent/maxWinRatePercent: 胜率筛选(可选)\n##   - minTxs/maxTxs/minTxVolume/maxTxVolume(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_leaderboard_supported_chain -> 本工具 -> onchainos_portfolio_overview",
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
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=v; return toResult(await marketApi.leaderboardList(auth, q)); } catch(e) { return toError(e); } },
  );

  // ── Memepump / 扫链 (7) ─────────────────────────

  server.tool("onchainos_memepump_supported",
    "CAT:[链上-行情] | ## 功能: 获取扫链支持的链+协议(Pump.fun/Moonshot等)\n## 场景: Meme前确认可用链\n## 关键词: memepump, meme, 扫链\n## 参数: 无\n## 鉴权: Free — 免费调用\n## 风险: READ - 付费查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_memepump_token_list",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSupported(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_list",
    "CAT:[链上-行情] | ## 功能: 筛选Meme代币(最多30条, 支持30+筛选维度)\n## 场景: 发现新Meme\n## 关键词: memepump, meme代币, 筛选\n## 参数:\n##   - chainIndex/stage(必填)\n##   - 多个可选筛选参数\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ - 付费查询\n## 返回量: 中等 ~30KB\n## 关联: onchainos_memepump_supported -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      stage: z.enum(["NEW","MIGRATING","MIGRATED"]).describe("代币阶段"),
      protocolIdList: z.string().optional().describe("协议ID, 逗号分隔"),
      walletAddress: z.string().optional().describe("用户钱包地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, stage, ...rest }) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string|boolean|undefined>={chainIndex,stage}; for (const [k,v] of Object.entries(rest)) if (v!==undefined) q[k]=String(v); return toResult(await marketApi.memepumpTokenList(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_details",
    "CAT:[链上-行情] | ## 功能: 单一代币扫链详情(market/tags/social)\n## 关键词: memepump, 代币详情\n## 参数:\n##   - chainIndex/tokenContractAddress(必填), walletAddress(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 微小 ~3KB\n## 关联: onchainos_memepump_token_list -> 本工具",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址"), walletAddress: z.string().optional().describe("查用户持仓") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, walletAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDetails(auth, chainIndex, tokenContractAddress, walletAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_dev_info",
    "CAT:[链上-行情] | ## 功能: 开发者信息(发币数/RugPull/持仓)\n## 场景: 土狗检测\n## 参数: chainIndex/tokenContractAddress\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 微小 ~1KB\n## 关联: onchainos_memepump_token_details -> 本工具",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDevInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_similar_token",
    "CAT:[链上-行情] | ## 功能: 相似代币\n## 参数: chainIndex/tokenContractAddress\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ\n## 返回量: 微小 ~2KB",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSimilarToken(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_bundle_info",
    "CAT:[链上-行情] | ## 功能: 打包交易检测(bundler占比/金额)\n## 场景: 土狗检测\n## 参数: chainIndex/tokenContractAddress\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 微小 ~1KB",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpBundleInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_aped_wallet",
    "CAT:[链上-行情] | ## 功能: 同车钱包列表(最多50, 含PnL)\n## 场景: 看早期买家\n## 参数: chainIndex/tokenContractAddress/walletAddress?\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~10KB",
    { chainIndex: z.string().describe("链索引"), tokenContractAddress: z.string().describe("代币地址"), walletAddress: z.string().optional().describe("指定钱包") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, walletAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpApedWallet(auth, chainIndex, tokenContractAddress, walletAddress)); } catch(e) { return toError(e); } },
  );

  // ── Portfolio / 地址分析 ─────────────────────────

  server.tool("onchainos_portfolio_supported_chain",
    "CAT:[链上-分析] | ## 功能: 获取地址分析支持的链\n## 场景: 分析地址前确认链\n## 关键词: portfolio, 链列表, 地址分析\n## 参数: 无\n## 鉴权: Free — 免费调用\n## 风险: READ\n## 返回量: 微小 ~2KB",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_overview",
    "CAT:[链上-分析] | ## 功能: 获取地址画像概览(realizedPnlUsd/winRate/topPnlTokenList/buy/sell统计)\n## 场景: Agent拿到地址后快速评估交易水平\n## 关键词: portfolio, 地址画像, PnL, 胜率\n## 参数:\n##   - chainIndex/walletAddress/timeFrame(必填)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~5KB\n## 关联: onchainos_portfolio_supported_chain -> 本工具",
    {
      chainIndex: z.string().describe("链索引"),
      walletAddress: z.string().describe("钱包地址"),
      timeFrame: z.enum(["1","2","3","4","5"]).describe("时间范围: 1=1D 2=3D 3=7D 4=1M 5=3M"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, timeFrame }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioOverview(auth, chainIndex, walletAddress, timeFrame)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_recent_pnl",
    "CAT:[链上-分析] | ## 功能: 获取地址近期收益列表(最多100条/页, 总1000条)\n## 场景: 看地址在哪些币上赚了/亏了\n## 关键词: PnL, 收益列表, realized, unrealized\n## 参数:\n##   - chainIndex/walletAddress(必填)\n##   - cursor/limit(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~30KB\n## 关联: onchainos_portfolio_overview -> 本工具",
    { chainIndex: z.string().describe("链索引"), walletAddress: z.string().describe("钱包地址"), cursor: z.string().optional(), limit: z.string().optional() },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioRecentPnl(auth, { chainIndex, walletAddress, cursor, limit })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_token_latest_pnl",
    "CAT:[链上-分析] | ## 功能: 获取地址对特定代币的最新收益\n## 场景: 看某代币的持仓盈亏\n## 参数: chainIndex/walletAddress/tokenContractAddress\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ\n## 返回量: 微小 ~1KB\n## 关联: onchainos_portfolio_recent_pnl -> 本工具",
    { chainIndex: z.string().describe("链索引"), walletAddress: z.string().describe("钱包地址"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioTokenLatestPnl(auth, chainIndex, walletAddress, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_dex_history",
    "CAT:[链上-分析] | ## 功能: 获取地址DEX交易历史(type/amount/price/pnlUsd)\n## 场景: 分析地址交易行为\n## 参数: chainIndex/walletAddress/begin/end(必填), type/cursor/limit(可选)\n## 鉴权: Basic — 100K免费/月, 超出$0.0001/次\n## 风险: READ\n## 返回量: 大 ~50KB\n## 关联: onchainos_portfolio_overview -> 本工具",
    {
      chainIndex: z.string().describe("链索引"), walletAddress: z.string().describe("钱包地址"),
      begin: z.string().describe("开始时间戳(毫秒)"), end: z.string().describe("结束时间戳(毫秒)"),
      tokenContractAddress: z.string().optional(), type: z.string().optional().describe("1=BUY 2=SELL 3=TransferIn 4=TransferOut"), cursor: z.string().optional(), limit: z.string().optional(),
    },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, begin, end, tokenContractAddress, type, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioDexHistory(auth, { chainIndex, walletAddress, begin, end, tokenContractAddress, type, cursor, limit })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_address_tracker_trades",
    "CAT:[链上-分析] | ## 功能: 获取地址追踪交易(聪明钱/KOL/自定义多地址)\n## 场景: 跟单监控\n## 关键词: 地址追踪, tracker, 聪明钱, KOL\n## 参数:\n##   - trackerType: 1=聪明钱 2=KOL 3=多地址(必填)\n##   - walletAddress: trackerType=3时必填, 最多20个\n##   - tradeType/chainIndex/minVolume/... (可选筛选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~30KB",
    {
      trackerType: z.enum(["1","2","3"]).describe("1=平台聪明钱 2=Top100 KOL 3=自定义多地址"),
      walletAddress: z.string().optional().describe("trackerType=3时必填, 逗号分隔, 最多20个"),
      tradeType: z.enum(["0","1","2"]).optional().describe("0=全部 1=买入 2=卖出"),
      chainIndex: z.string().optional().describe("链索引, 默认全部"),
      minVolume: z.string().optional(), maxVolume: z.string().optional(),
      minHolders: z.string().optional(), minMarketCap: z.string().optional(), maxMarketCap: z.string().optional(),
      minLiquidity: z.string().optional(), maxLiquidity: z.string().optional(),
    },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=String(v); return toResult(await marketApi.addressTrackerTrades(auth, q as any)); } catch(e) { return toError(e); } },
  );

  // ── Social / 社媒 ─────────────────────────────────

  server.tool("onchainos_social_news_latest",
    "CAT:[链上-分析] | ## 功能: 获取最新加密货币新闻(含情绪标签bullish/bearish/neutral)\n## 场景: Agent监控市场情绪\n## 关键词: 新闻, news, 情绪, sentiment\n## 参数: tokenSymbols/begin/end/importance/platform/limit/cursor/detailLevel/language(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~20KB",
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
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialNewsLatest(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_by_symbol",
    "CAT:[链上-分析] | ## 功能: 按代币符号获取新闻(含情绪筛选)\n## 参数: tokenSymbols(必填), sortBy/sentiment/importance/platform/limit/cursor/detailLevel/begin/end/language(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~20KB",
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
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialNewsBySymbol(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_search",
    "CAT:[链上-分析] | ## 功能: 全文搜索加密货币新闻\n## 参数: keyword(必填), sortBy/sentiment/importance/platform/tokenSymbols/begin/end/detailLevel/limit/cursor/language(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~20KB",
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
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialNewsSearch(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_detail",
    "CAT:[链上-分析] | ## 功能: 获取新闻文章完整正文\n## 参数: articleId(必填), language(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 微小 ~5KB",
    { articleId: z.string().describe("文章ID,从列表接口articles[].id获取"), language: z.string().optional().describe("en_US/zh_CN") },
    { readOnlyHint: true },
    async ({ articleId, language }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.socialNewsDetail(auth, articleId, language)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_platforms",
    "CAT:[链上-分析] | ## 功能: 获取可用新闻平台列表\n## 场景: 作为其他news接口platform参数的值来源\n## 关键词: 新闻平台, platforms, 来源\n## 参数: 无\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 微小 ~2KB",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.socialNewsPlatforms(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_sentiment_symbol",
    "CAT:[链上-分析] | ## 功能: 获取代币情绪指标(mentionCount/sentiment分布/trend趋势)\n## 场景: 监测市场情绪变化\n## 关键词: 情绪, sentiment, 提及, 看多, 看空\n## 参数: tokenSymbols(必填), timeFrame/trendPoints(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~10KB",
    { tokenSymbols: z.string().describe("代币符号,逗号分隔,最多20个"), timeFrame: z.enum(["1","2","3"]).optional().describe("1=1h 2=4h 3=24h"), trendPoints: z.string().optional().describe("趋势数据点数,>0返回trend数组") },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialSentimentSymbol(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_sentiment_ranking",
    "CAT:[链上-分析] | ## 功能: 获取情绪热度排行榜(按总提及量降序)\n## 场景: 发现市场讨论最热的代币\n## 关键词: 情绪排名, sentiment ranking, 热门\n## 参数: timeFrame/sortBy/limit(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~10KB",
    { timeFrame: z.enum(["1","2","3"]).optional(), sortBy: z.enum(["1"]).optional().describe("目前仅支持1=hot(按提及量)"), limit: z.string().optional() },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialSentimentRanking(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_vibe_timeline",
    "CAT:[链上-分析] | ## 功能: 获取代币Vibe热度时间线(score/mentions/engagement/impressions/KOL列表)\n## 场景: 分析代币热度趋势\n## 关键词: vibe, 热度, KOL, timeline\n## 参数: chainIndex/tokenAddress(必填), timeFrame(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~20KB",
    { chainIndex: z.string().describe("链ID"), tokenAddress: z.string().describe("代币合约地址"), timeFrame: z.enum(["1","2","3","4"]).optional().describe("1=24h 2=72h 3=7d 4=30d") },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialVibeTimeline(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_vibe_top_kols",
    "CAT:[链上-分析] | ## 功能: 获取讨论代币的热门KOL列表(按互动量/提及/曝光)\n## 场景: 看哪些KOL在讨论某代币\n## 关键词: KOL, 意见领袖, vibe, 影响力\n## 参数: chainIndex/tokenAddress(必填), sortBy/timeFrame/limit(可选)\n## 鉴权: Premium — 100K免费/月, 超出$0.0005/次\n## 风险: READ\n## 返回量: 中等 ~10KB",
    { chainIndex: z.string().describe("链ID"), tokenAddress: z.string().describe("代币合约地址"), sortBy: z.enum(["1","2","3"]).optional().describe("1=互动量 2=提及数 3=曝光量"), timeFrame: z.enum(["1","2","3","4"]).optional(), limit: z.string().optional() },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialVibeTopKols(auth, q)); } catch(e) { return toError(e); } },
  );

}
