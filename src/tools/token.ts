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

export function registerTokenTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_token_price_info",
    "链上-行情 | 批量获取代币交易信息(价格/涨跌幅/市值)【场景:全面了解代币行情/市值】",
    {
      tokens: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '501'=Solana。不确定先调 onchainos_market_supported_chain"),
        tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      })).min(1).max(100).describe("要查询的代币列表, 最多100个"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.priceInfo(auth, tokens)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_advanced_info",
    "链上-行情 | 获取代币安全分析(貔貅检测)【场景:查是不是貔貅盘/安全检测】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await marketApi.tokenAdvancedInfo(auth, chainIndex, tokenContractAddress), {
          nextSteps: [
            { action: "如需更全面的风险评估(含集中度/Bundle/开发者)", tool: "onchainos_skill_risk_detect", condition: "建议综合扫描" },
            { action: "查持有人分布", tool: "onchainos_token_holder", params: { chainIndex, tokenContractAddress } },
            { action: "查前100盈利地址", tool: "onchainos_token_top_trader", params: { chainIndex, tokenContractAddress } },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  // ── 代币 API ──────────────────────────────────────

  server.tool("onchainos_token_search",
    "链上-行情 | 跨链搜索代币(名称/符号/地址)【场景:搜代币/找合约地址/代币名查地址】",
    {
      chains: z.string().describe("链ID, 逗号分隔。如 '1'=ETH '56'=BSC '501'=Solana '8453'=Base"),
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
    "链上-行情 | 批量获取代币基础信息【场景:查代币名/符号/decimals/总供应量】",
    {
      tokens: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '501'=Solana。不确定先调 onchainos_market_supported_chain"),
        tokenContractAddress: z.string().describe("代币合约地址(小写)"),
      })).min(1).max(100).describe("要查询的代币列表, 最多100个"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenBasicInfo(auth, tokens)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_top_liquidity",
    "链上-行情 | 获取代币前 5 流动性池【场景:查代币的流动性池/交易深度】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenTopLiquidity(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_hot",
    "链上-行情 | 获取热门代币榜单【场景:查热门代币/trending/涨幅榜】",
    {
      rankingType: z.enum(["4","5"]).describe("4=Trending(token score) 5=Xmentioned(twitter提及)"),
      chainIndex: z.string().optional().describe("链ID(字符串), 不传=所有链。常见值: '1'=ETH '56'=BSC '501'=Solana"),
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
      try {
        const q: Record<string,string|number|boolean|undefined> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=v;
        return toResult(await marketApi.tokenHot(auth, q), {
          nextSteps: [
            { action: "查看某个热门代币的基础信息", tool: "onchainos_token_basic_info", condition: "从榜单中取 chainIndex 和 tokenContractAddress" },
            { action: "对感兴趣的代币做风险评估", tool: "onchainos_skill_risk_detect", condition: "热门代币建议先做安全检查" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_holder",
    "链上-行情 | 获取代币前 100 持有人【场景:查代币持币地址分布】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"),
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
    "链上-行情 | 获取持仓聚类分析支持的链【场景:查哪些链支持持仓集中度分析】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_overview",
    "链上-行情 | 获取代币持仓集中度分析【场景:查持仓集中度/筹码分布】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.tokenClusterOverview(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_token_cluster_list",
    "链上-行情 | 获取持仓集群列表【场景:查看大额持仓集群】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterList(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_cluster_top_holders",
    "链上-行情 | 获取前10/50/100持仓集中度【场景:查前N名持仓占比】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"),
      rangeFilter: z.enum(["1","2","3"]).describe("范围: 1=前10 2=前50 3=前100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, rangeFilter }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenClusterTopHolders(auth, chainIndex, tokenContractAddress, rangeFilter)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_token_top_trader",
    "链上-行情 | 获取代币前100盈利地址【场景:查谁在赚钱/Top trader】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search"),
      tagFilter: z.string().optional().describe("标签过滤: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=Bundle"),
      cursor: z.string().optional().describe("分页游标"),
      limit: z.string().optional().describe("每页条数, 最大100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, tagFilter, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.tokenTopTrader(auth, { chainIndex, tokenContractAddress, tagFilter, cursor, limit })); } catch(e) { return toError(e); } },
  );

}
