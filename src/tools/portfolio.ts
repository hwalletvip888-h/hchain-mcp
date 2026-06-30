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

export function registerPortfolioTools(server: McpServer, auth: Auth | null): void {

  // ── Portfolio / 地址分析 ─────────────────────────

  server.tool("onchainos_portfolio_supported_chain",
    "链上-分析 | 获取地址分析支持的链【场景:查哪些链支持地址画像分析】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_overview",
    "链上-分析 | 获取地址画像概览(PnL/胜率)【场景:分析钱包地址的盈亏/胜率】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      walletAddress: z.string().describe("钱包地址"),
      timeFrame: z.enum(["1","2","3","4","5"]).describe("时间范围: 1=1D 2=3D 3=7D 4=1M 5=3M"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, timeFrame }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioOverview(auth, chainIndex, walletAddress, timeFrame)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_recent_pnl",
    "链上-分析 | 获取地址近期收益列表【场景:查钱包近期的盈亏记录】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), walletAddress: z.string().describe("钱包地址"), cursor: z.string().optional(), limit: z.string().optional() },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioRecentPnl(auth, { chainIndex, walletAddress, cursor, limit })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_token_latest_pnl",
    "链上-分析 | 获取地址对特定代币的最新收益【场景:查钱包在某个代币上的盈亏】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), walletAddress: z.string().describe("钱包地址"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''。⚠️ 不知道地址 → 先调 onchainos_token_search") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioTokenLatestPnl(auth, chainIndex, walletAddress, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_portfolio_dex_history",
    "链上-分析 | 获取地址 DEX 交易历史【场景:查钱包的DEX买卖记录/交易明细】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), walletAddress: z.string().describe("钱包地址"),
      begin: z.string().describe("开始时间戳(毫秒)"), end: z.string().describe("结束时间戳(毫秒)"),
      tokenContractAddress: z.string().optional().describe("按代币地址筛选(小写)"), type: z.string().optional().describe("1=BUY 2=SELL 3=TransferIn 4=TransferOut"), cursor: z.string().optional(), limit: z.string().optional(),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletAddress, begin, end, tokenContractAddress, type, cursor, limit }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.portfolioDexHistory(auth, { chainIndex, walletAddress, begin, end, tokenContractAddress, type, cursor, limit })); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_address_tracker_trades",
    "链上-分析 | 获取地址追踪交易(聪明钱/KOL)【场景:追踪聪明钱/KOL的买卖动态】",
    {
      trackerType: z.enum(["1","2","3"]).describe("1=平台聪明钱 2=Top100 KOL 3=自定义多地址"),
      walletAddress: z.string().optional().describe("trackerType=3时必填, 逗号分隔, 最多20个"),
      tradeType: z.enum(["0","1","2"]).optional().describe("0=全部 1=买入 2=卖出"),
      chainIndex: z.string().optional().describe("链ID(字符串), 默认全部。如 '1'=ETH '56'=BSC '501'=Solana"),
      minVolume: z.string().optional(), maxVolume: z.string().optional(),
      minHolders: z.string().optional(), minMarketCap: z.string().optional(), maxMarketCap: z.string().optional(),
      minLiquidity: z.string().optional(), maxLiquidity: z.string().optional(),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => { if(!auth) return AUTH_REQUIRED("READ"); try { const q: Record<string,string> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) q[k]=String(v); return toResult(await marketApi.addressTrackerTrades(auth, q as any)); } catch(e) { return toError(e); } },
  );

}
