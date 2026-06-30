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

export function registerSignalTools(server: McpServer, auth: Auth | null): void {

  // ── 信号 ──────────────────────────────────────────

  server.tool("onchainos_signal_supported_chain",
    "链上-信号 | 获取信号支持的链【场景:查哪些链有聪明钱信号】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.signalSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_signal_list",
    "链上-信号 | 获取最新买入信号(聪明钱/KOL/鲸鱼)【场景:查聪明钱在买什么/最新信号】",
    {
      chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana。⚠️ 不确定先调 onchainos_market_supported_chain"),
      walletType: z.string().optional().describe("钱包类型: 1=聪明钱 2=KOL 3=鲸鱼, 逗号分隔如'1,2,3'"),
      minAmountUsd: z.string().optional().describe("最小交易金额(USD)"),
      maxAmountUsd: z.string().optional().describe("最大交易金额(USD)"),
      minAddressCount: z.string().optional().describe("最小地址数"),
      maxAddressCount: z.string().optional().describe("最大地址数"),
      tokenAddress: z.string().optional().describe("指定代币合约地址(小写)。主链币传空字符串"),
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
      try {
        const b: Record<string,unknown> = {}; for (const [k,v] of Object.entries(params)) if (v!==undefined) b[k]=v;
        return toResult(await marketApi.signalList(auth, b), {
          nextSteps: [
            { action: "如需自动过滤风险+批量分析信号代币", tool: "onchainos_skill_signal_aggregate", condition: "有信号列表后" },
            { action: "进一步分析某代币风险", tool: "onchainos_skill_risk_detect", params: { chainIndex: "{{取信号中的 chainIndex}}", tokenContractAddress: "{{取信号中的 tokenContractAddress}}" } },
          ],
        });
      } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_supported_chain",
    "链上-信号 | 获取聪明钱排行榜支持的链【场景:查哪些链有聪明钱排行】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.leaderboardSupportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_leaderboard_list",
    "链上-信号 | 获取聪明钱排行榜(PnL/ROI/胜率)【场景:查聪明钱/顶级交易员排行】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
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

}
