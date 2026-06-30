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

export function registerSocialTools(server: McpServer, auth: Auth | null): void {

  // ── Social / 社媒 ─────────────────────────────────

  server.tool("onchainos_social_news_latest",
    "链上-分析 | 获取最新加密货币新闻(含情绪标签)【场景:看最新币圈新闻】",
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
    "链上-分析 | 按代币符号获取新闻【场景:查某个代币的相关新闻】",
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
    "链上-分析 | 全文搜索加密货币新闻【场景:按关键词搜新闻】",
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
    "链上-分析 | 获取新闻正文【场景:看新闻全文/详情】",
    { articleId: z.string().describe("文章ID,从列表接口articles[].id获取"), language: z.string().optional().describe("en_US/zh_CN") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ articleId, language }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.socialNewsDetail(auth, articleId, language)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_news_platforms",
    "链上-分析 | 获取可用新闻平台列表【场景:看新闻来源有哪些】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.socialNewsPlatforms(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_sentiment_symbol",
    "链上-分析 | 获取代币情绪指标【场景:查市场情绪/多空/看涨看跌】",
    { tokenSymbols: z.string().describe("代币符号,逗号分隔,最多20个"), timeFrame: z.enum(["1","2","3"]).optional().describe("1=1h 2=4h 3=24h"), trendPoints: z.string().optional().describe("趋势数据点数,>0返回trend数组") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialSentimentSymbol(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_sentiment_ranking",
    "链上-分析 | 获取情绪热度排行榜【场景:查热度最高/提及最多的代币】",
    { timeFrame: z.enum(["1","2","3"]).optional(), sortBy: z.enum(["1"]).optional().describe("目前仅支持1=hot(按提及量)"), limit: z.string().optional() },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialSentimentRanking(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_vibe_timeline",
    "链上-分析 | 获取代币 Vibe 热度时间线【场景:查代币热度趋势/社媒热度变化】",
    { chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '501'=Solana。不确定先调 onchainos_market_supported_chain"), tokenAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"), timeFrame: z.enum(["1","2","3","4"]).optional().describe("1=24h 2=72h 3=7d 4=30d") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialVibeTimeline(auth, q)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_social_vibe_top_kols",
    "链上-分析 | 获取热门 KOL 列表【场景:查讨论这个代币的KOL】",
    { chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '501'=Solana。不确定先调 onchainos_market_supported_chain"), tokenAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"), sortBy: z.enum(["1","2","3"]).optional().describe("1=互动量 2=提及数 3=曝光量"), timeFrame: z.enum(["1","2","3","4"]).optional(), limit: z.string().optional() },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string>={}; for(const [k,v] of Object.entries(params)) if(v!==undefined) q[k]=v; return toResult(await marketApi.socialVibeTopKols(auth, q)); } catch(e) { return toError(e); } },
  );

}
