/**
 * 行情模块 — CAT:[链上-行情]
 * 37 tools covering Market API v6
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { marketApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerMarketTools(server: McpServer, auth: Auth | null): void {

  // ═════════════════════════════════════════════════════════
  // 1.1 基础行情 (6) — 已对接
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_market_supported_chain",
    "CAT:[链上-行情] | ## 功能：获取行情 API 支持的链列表\n## 场景：查询行情数据前确认目标链是否可用\n## 关键词：行情, 链列表, market, supported chain\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_token_search 搜索代币",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_search",
    "CAT:[链上-行情] | ## 功能：跨链搜索代币\n## 场景：查找代币、验证合约地址\n## 关键词：搜索, 代币, search\n## 参数：\n##   - search: 关键词（名称/符号/地址）\n##   - chains: 链索引逗号分隔\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：本工具搜索 → onchainos_token_basic_info 详情",
    { search: z.string().min(2).describe("搜索关键词"), chains: z.string().optional().describe("链索引，逗号分隔") },
    { readOnlyHint: true },
    async ({ search, chains }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.searchToken(auth, search, chains)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_market_price",
    "CAT:[链上-行情] | ## 功能：获取代币实时价格\n## 场景：查询币价、交易前比价\n## 关键词：价格, price, 行情\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_token_search 搜索 → 本工具查价 → onchainos_dex_quote 报价",
    { chainIndex: z.number().int().describe("链索引"), tokenAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.price(auth, chainIndex, tokenAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_market_candles",
    "CAT:[链上-行情] | ## 功能：获取K线（实时1000根/完整历史）\n## 场景：走势分析、技术指标、回测\n## 关键词：K线, candlestick, OHLCV\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n##   - period: 1m/5m/15m/30m/1H/4H/1D/1W/1M\n##   - mode: live(默认)/history\n##   - after/before: 翻页时间\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_market_price 查价 → 本工具看K线",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      period: z.enum(["1m","5m","15m","30m","1H","4H","1D","1W","1M"]).describe("K线周期"),
      mode: z.enum(["live","history"]).optional().default("live").describe("live=最近1000根, history=完整历史"),
      after: z.string().optional().describe("起始时间ISO8601"),
      before: z.string().optional().describe("结束时间ISO8601"),
    }, { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, period, mode, after, before }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const data = mode === "history"
          ? await marketApi.historicalCandles(auth, chainIndex, tokenContractAddress, period)
          : await marketApi.candles(auth, chainIndex, tokenContractAddress, period, after, before);
        return toResult(data);
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_basic_info",
    "CAT:[链上-行情] | ## 功能：获取代币基本信息（名称/符号/精度）\n## 场景：验证代币元数据\n## 关键词：代币信息, token info\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_token_search 搜索 → 本工具查详情",
    { chainIndex: z.number().int().describe("链索引"), tokenAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenBasicInfo(auth, chainIndex, tokenAddress)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.2 批量行情 (2)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_market_price_info",
    "CAT:[链上-行情] | ## 功能：批量获取多代币在某链上的实时价格\n## 场景：一次查询多个代币价格\n## 关键词：批量价格, price info, 多代币\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddresses: 代币合约地址列表（逗号分隔）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_token_search 搜索 → 本工具批量查价",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenAddresses: z.string().describe("代币合约地址列表，逗号分隔"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddresses }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.priceInfo(auth, { chainIndex, tokenAddresses })); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_trades",
    "CAT:[链上-行情] | ## 功能：获取代币在指定链上的交易记录\n## 场景：查看代币交易活动、价格发现\n## 关键词：交易记录, trades, 成交\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_market_price 查价 → 本工具看成交记录",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.trades(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  // ═════════════════════════════════════════════════════════
  // 1.3 代币分析 (6)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_token_advanced_info",
    "CAT:[链上-行情] | ## 功能：获取代币高级信息（社交/合约安全等）\n## 场景：深度分析代币\n## 关键词：高级信息, advanced, 代币分析\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_token_basic_info 基本信息 → 本工具高级信息",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenAdvancedInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_top_liquidity",
    "CAT:[链上-行情] | ## 功能：获取代币的顶部流动性池\n## 场景：查看代币流动性分布\n## 关键词：流动性, liquidity, 池子\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_token_basic_info 基本信息 → 本工具查流动性",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenTopLiquidity(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_holder",
    "CAT:[链上-行情] | ## 功能：获取代币的持有人信息\n## 场景：分析代币持仓分布\n## 关键词：持有人, holder, 持仓\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n##   - tagFilter: 标签过滤（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_token_basic_info 基本信息 → 本工具看持有人",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      tagFilter: z.number().int().optional().describe("标签过滤"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, tagFilter }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenHolder(auth, chainIndex, tokenContractAddress, tagFilter)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_hot",
    "CAT:[链上-行情] | ## 功能：获取热门代币列表\n## 场景：发现市场热点\n## 关键词：热门, hot, 热点代币\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具发现热点 → onchainos_token_basic_info 查看详情",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenHot(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_toplist",
    "CAT:[链上-行情] | ## 功能：获取代币排行榜\n## 场景：查看涨跌幅/成交量排行\n## 关键词：排行榜, toplist, 涨幅, 成交量\n## 参数：\n##   - chains: 链索引，逗号分隔\n##   - sortBy: 排序方式（可选）\n##   - timeFrame: 时间窗口（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具排行 → onchainos_token_basic_info 查看详情",
    {
      chains: z.string().describe("链索引，逗号分隔（如 '501' 或 '1,56'）"),
      sortBy: z.number().int().optional().describe("排序方式"),
      timeFrame: z.number().int().optional().describe("时间窗口"),
    },
    { readOnlyHint: true },
    async ({ chains, sortBy, timeFrame }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenToplist(auth, chains, sortBy, timeFrame)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_top_trader",
    "CAT:[链上-行情] | ## 功能：获取代币的顶级交易者信息\n## 场景：跟踪聪明钱\n## 关键词：交易者, trader, 聪明钱\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n##   - tagFilter: 标签过滤（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_token_holder 持有人 → 本工具看顶级交易者",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      tagFilter: z.number().int().optional().describe("标签过滤"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, tagFilter }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenTopTrader(auth, chainIndex, tokenContractAddress, tagFilter)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.4 代币聚类 (4)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_token_cluster_supported_chain",
    "CAT:[链上-行情] | ## 功能：获取代币聚类分析支持的链列表\n## 场景：聚类分析前确认链可用\n## 关键词：聚类, cluster, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_token_cluster_overview 总览",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_overview",
    "CAT:[链上-行情] | ## 功能：获取代币持有人聚类总览\n## 场景：分析代币持仓结构\n## 关键词：聚类, cluster, overview\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_token_cluster_supported_chain → 本工具总览 → onchainos_token_cluster_list 列表",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterOverview(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_list",
    "CAT:[链上-行情] | ## 功能：获取代币持有人聚类列表\n## 场景：查看聚类详情\n## 关键词：聚类列表, cluster list\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_token_cluster_overview 总览 → 本工具列表 → onchainos_token_cluster_top_holders 顶级持有人",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterList(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_top_holders",
    "CAT:[链上-行情] | ## 功能：获取聚类中的顶级持有人\n## 场景：追踪大户持仓\n## 关键词：顶级持有人, top holders, cluster\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n##   - rangeFilter: 范围过滤（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_token_cluster_list 列表 → 本工具顶级持有人",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      rangeFilter: z.number().int().optional().describe("范围过滤"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, rangeFilter }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterTopHolders(auth, chainIndex, tokenContractAddress, rangeFilter)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.5 指数价格 (2)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_index_current_price",
    "CAT:[链上-行情] | ## 功能：获取代币指数当前价格\n## 场景：查询指数价格\n## 关键词：指数, index price\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_market_price 实时价 → 本工具指数价 → onchainos_index_historical_price 历史指数",
    { chainIndex: z.number().int().describe("链索引"), tokenAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.indexCurrentPrice(auth, { chainIndex, tokenAddress })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_index_historical_price",
    "CAT:[链上-行情] | ## 功能：获取代币指数历史价格\n## 场景：指数价格回测\n## 关键词：历史指数, index historical\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n##   - period: K线周期（可选）\n##   - limit: 返回条数（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_index_current_price 当前指数 → 本工具历史指数",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenAddress: z.string().describe("代币合约地址"),
      period: z.string().optional().describe("K线周期"),
      limit: z.number().int().optional().describe("返回条数"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress, period, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.indexHistoricalPrice(auth, chainIndex, tokenAddress, period, limit)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.6 投资组合 Portfolio (5)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_portfolio_supported_chain",
    "CAT:[链上-行情] | ## 功能：获取投资组合 API 支持的链列表\n## 场景：查询投资组合前确认链可用\n## 关键词：投资组合, portfolio, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_portfolio_overview 总览",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_overview",
    "CAT:[链上-行情] | ## 功能：获取地址投资组合总览\n## 场景：查看钱包整体表现\n## 关键词：投资组合, portfolio, overview\n## 参数：\n##   - chainIndex: 链索引\n##   - walletAddress: 钱包地址\n##   - timeFrame: 时间窗口（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_portfolio_supported_chain → 本工具总览 → onchainos_portfolio_recent_pnl 盈亏",
    {
      chainIndex: z.number().int().describe("链索引"),
      walletAddress: z.string().describe("钱包地址"),
      timeFrame: z.number().int().optional().describe("时间窗口"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, timeFrame }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioOverview(auth, chainIndex, walletAddress, timeFrame)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_recent_pnl",
    "CAT:[链上-行情] | ## 功能：获取地址最近盈亏列表\n## 场景：查看交易盈亏\n## 关键词：盈亏, PnL, 收益\n## 参数：\n##   - chainIndex: 链索引\n##   - walletAddress: 钱包地址\n##   - limit: 返回条数（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_portfolio_overview 总览 → 本工具盈亏列表",
    {
      chainIndex: z.number().int().describe("链索引"),
      walletAddress: z.string().describe("钱包地址"),
      limit: z.number().int().optional().describe("返回条数"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioRecentPnl(auth, chainIndex, walletAddress, limit)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_token_latest_pnl",
    "CAT:[链上-行情] | ## 功能：获取地址在特定代币上的最新盈亏\n## 场景：查看单币盈亏\n## 关键词：盈亏, PnL, token, 代币\n## 参数：\n##   - chainIndex: 链索引\n##   - walletAddress: 钱包地址\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_portfolio_recent_pnl 列表 → 本工具单币详情",
    {
      chainIndex: z.number().int().describe("链索引"),
      walletAddress: z.string().describe("钱包地址"),
      tokenContractAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioTokenLatestPnl(auth, chainIndex, walletAddress, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_dex_history",
    "CAT:[链上-行情] | ## 功能：获取地址的 DEX 交易历史\n## 场景：查看地址在 DEX 上的交易记录\n## 关键词：DEX历史, portfolio, dex\n## 参数：\n##   - chainIndex: 链索引\n##   - walletAddress: 钱包地址\n##   - begin: 开始时间戳（可选）\n##   - end: 结束时间戳（可选）\n##   - limit: 返回条数（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_portfolio_overview 总览 → 本工具查看DEX历史",
    {
      chainIndex: z.number().int().describe("链索引"),
      walletAddress: z.string().describe("钱包地址"),
      begin: z.number().optional().describe("开始时间戳 ms"),
      end: z.number().optional().describe("结束时间戳 ms"),
      limit: z.number().int().optional().describe("返回条数"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, walletAddress, begin, end, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioDexHistory(auth, chainIndex, walletAddress, begin, end, limit)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.7 地址追踪 (1)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_address_tracker_trades",
    "CAT:[链上-行情] | ## 功能：获取地址追踪交易数据\n## 场景：跟踪 KOL/聪明钱地址交易\n## 关键词：地址追踪, tracker, KOL, 聪明钱\n## 参数：\n##   - trackerType: 追踪类型 (1=KOL, 2=SmartMoney)\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具追踪地址 → onchainos_portfolio_overview 查看地址组合",
    {
      trackerType: z.number().int().describe("追踪类型：1=KOL, 2=SmartMoney"),
    },
    { readOnlyHint: true },
    async ({ trackerType }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.addressTrackerTrades(auth, trackerType)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.8 信号 Signal (4)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_signal_supported_chain",
    "CAT:[链上-行情] | ## 功能：获取信号 API 支持的链列表\n## 场景：查询信号前确认链可用\n## 关键词：信号, signal, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_signal_list 信号列表",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.signalSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_signal_list",
    "CAT:[链上-行情] | ## 功能：获取最新信号列表\n## 场景：获取交易信号\n## 关键词：信号列表, signal\n## 参数：\n##   - chainIndex: 链索引\n##   - signalType: 信号类型（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_signal_supported_chain → 本工具获取信号",
    {
      chainIndex: z.number().int().optional().describe("链索引"),
      signalType: z.string().optional().describe("信号类型"),
    },
    { readOnlyHint: true },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.signalList(auth, params as Record<string, unknown>)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_supported_chain",
    "CAT:[链上-行情] | ## 功能：获取排行榜支持的链列表\n## 场景：查询排行榜前确认链可用\n## 关键词：排行榜, leaderboard, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_leaderboard_list 排行榜",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.leaderboardSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_list",
    "CAT:[链上-行情] | ## 功能：获取聪明钱/KOL 排行榜\n## 场景：发现顶级交易者\n## 关键词：排行榜, leaderboard, 聪明钱\n## 参数：\n##   - chainIndex: 链索引\n##   - timeFrame: 时间窗口（可选）\n##   - sortBy: 排序方式（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_leaderboard_supported_chain → 本工具排行榜 → onchainos_address_tracker_trades 追踪",
    {
      chainIndex: z.number().int().describe("链索引"),
      timeFrame: z.number().int().optional().describe("时间窗口"),
      sortBy: z.number().int().optional().describe("排序方式"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, timeFrame, sortBy }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.leaderboardList(auth, chainIndex, timeFrame, sortBy)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 1.9 Memepump (7)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_memepump_supported",
    "CAT:[链上-行情] | ## 功能：获取 Memepump 支持的链和协议\n## 场景：查询 Meme 币数据前确认可用链\n## 关键词：memepump, meme, 链列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链 → onchainos_memepump_token_list 代币列表",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSupported(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_list",
    "CAT:[链上-行情] | ## 功能：获取 Meme 代币列表\n## 场景：发现 Meme 币机会\n## 关键词：meme, memepump, token list\n## 参数：\n##   - chainIndex: 链索引\n##   - protocolId: 协议ID（可选）\n##   - sort: 排序字段（可选）\n##   - order: 排序方向 asc/desc（可选）\n##   - limit: 返回条数（可选）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_memepump_supported → 本工具列表 → onchainos_memepump_token_details 详情",
    {
      chainIndex: z.number().int().describe("链索引"),
      protocolId: z.number().int().optional().describe("协议ID"),
      sort: z.string().optional().describe("排序字段（如 createdTimestamp）"),
      order: z.enum(["asc","desc"]).optional().describe("排序方向"),
      limit: z.number().int().optional().describe("返回条数"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, protocolId, sort, order, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenList(auth, chainIndex, protocolId, sort, order, limit)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_details",
    "CAT:[链上-行情] | ## 功能：获取 Meme 代币详细信息\n## 场景：查看 Meme 币详情\n## 关键词：meme, details, 详情\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_memepump_token_list 列表 → 本工具详情",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDetails(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_dev_info",
    "CAT:[链上-行情] | ## 功能：获取 Meme 代币开发者信息\n## 场景：查看开发者背景\n## 关键词：meme, developer, 开发者\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_memepump_token_details 详情 → 本工具开发者信息",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDevInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_similar_token",
    "CAT:[链上-行情] | ## 功能：获取相似 Meme 代币\n## 场景：发现关联代币\n## 关键词：meme, similar, 相似代币\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_memepump_token_details 详情 → 本工具相似代币",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSimilarToken(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_bundle_info",
    "CAT:[链上-行情] | ## 功能：获取 Meme 代币捆绑包信息\n## 场景：查看代币捆绑情况\n## 关键词：meme, bundle, 捆绑\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_memepump_token_details → 本工具捆绑信息",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpBundleInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_aped_wallet",
    "CAT:[链上-行情] | ## 功能：获取 Meme 代币的 APE 钱包信息\n## 场景：跟踪聪明钱加仓\n## 关键词：meme, ape, wallet, 钱包\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_memepump_token_details → 本工具钱包信息",
    { chainIndex: z.number().int().describe("链索引"), tokenContractAddress: z.string().describe("代币合约地址") },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpApedWallet(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );
}
