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

export function registerMarketPriceTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_market_supported_chain",
    "链上-行情 | 获取行情 API 支持的链列表【场景:查哪些链有行情API】",
    { chainIndex: z.string().optional().describe("链ID(字符串), 可选过滤。不传返回所有链。常见值: '1'=ETH '56'=BSC '8453'=Base。40+链支持, 不确定传空全查") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.supportedChain(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_market_price",
    "链上-行情 | 批量获取代币最新价格【场景:查币价/ETH多少钱/代币当前价】",
    {
      tokens: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana。不确定先调 onchainos_market_supported_chain"),
        tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串"),
      })).min(1).max(100).describe("要查询的代币列表。每个元素指定链ID和代币地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await marketApi.price(auth, tokens));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_market_candles",
    "链上-行情 | 获取 K 线 OHLCV 数据【场景:看走势图/价格趋势/K线分析】",
    {
      chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana。⚠️ 不确定先调 onchainos_market_supported_chain"),
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
    "链上-行情 | 获取历史 K 线(仅已完结)【场景:查历史走势/超过3个月的K线】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
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
    "链上-行情 | 获取代币 DEX 交易活动【场景:查代币的买卖交易/谁在交易】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
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

  // ── 综合币价 ──────────────────────────────────────

  server.tool("onchainos_index_current_price",
    "链上-行情 | 获取综合币价(多数据源加权均价)【场景:查加权均价/指数价格】",
    {
      tokens: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana"),
        tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串"),
      })).min(1).max(100).describe("要查询的代币列表。主链币的 tokenContractAddress 传空字符串"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ tokens }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await marketApi.indexCurrentPrice(auth, tokens)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_index_historical_price",
    "链上-行情 | 获取历史综合币价，支持分页【场景:查历史加权价格走势】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
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

}
