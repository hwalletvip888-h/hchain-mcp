/**
 * Market 模块 — 行情/搜索/K线
 *
 * 公开接口，无需 API Key
 * CAT: [链上-行情]
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosApi } from "../adapters/onchainos.js";
import { toResult, toError } from "../adapters/shared.js";

export function registerMarketTools(server: McpServer): void {

  // ── 搜索代币 ──────────────────────────────────────────────

  server.tool(
    "onchainos_search_token",
    "CAT:[链上-行情] | ## 功能：跨链搜索代币，按名称/符号/合约地址模糊匹配\n## 场景：用于 Agent 查找代币、验证合约地址、发现链上资产\n## 关键词：搜索, 代币, token, search, address\n## 参数：\n##   - keyword: 搜索关键词，支持代币名称、符号（BTC/ETH）或合约地址，至少 2 字符\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询，Agent 可自动调用\n## 返回量：中等 ~30KB\n## 关联：本工具搜索代币 → onchainos_get_token_info 查看详情 → onchainos_get_price 查价",
    {
      keyword: z.string().min(2).describe("搜索关键词：代币名称、符号（如BTC/ETH）或完整合约地址"),
    },
    async ({ keyword }) => {
      try {
        const data = await onchainosApi.searchToken(keyword);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取实时价格 ──────────────────────────────────────────

  server.tool(
    "onchainos_get_price",
    "CAT:[链上-行情] | ## 功能：获取指定代币在单链上的实时价格\n## 场景：用于查询代币当前币价、交易前比价、发现价差机会\n## 关键词：链上行情, 代币价格, price, onchain\n## 参数：\n##   - chainId: 链 ID。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana\n##   - tokenAddress: 代币合约地址（必填）\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询，Agent 可自动调用\n## 返回量：微小 ~1KB\n## 关联：onchainos_search_token 搜索代币 → 本工具查价 → onchainos_get_quote 获取报价",
    {
      chainId: z.number().int().describe("链 ID。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana"),
      tokenAddress: z.string().describe("代币合约地址（必填）"),
    },
    async ({ chainId, tokenAddress }) => {
      try {
        const data = await onchainosApi.getPrice(chainId, tokenAddress);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取 K 线 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_candlesticks",
    "CAT:[链上-行情] | ## 功能：获取指定代币的实时 K 线数据（最近 1000 根）\n## 场景：用于价格走势分析、技术指标计算、交易信号生成\n## 关键词：K线, candlestick, 走势图, OHLCV, 技术分析\n## 参数：\n##   - chainId: 链 ID\n##   - tokenAddress: 代币合约地址\n##   - period: K线周期。1m/5m/15m/30m/1H/4H/1D/1W/1M\n##   - after: 起始时间 ISO string（可选，用于翻页）\n##   - before: 结束时间 ISO string（可选，默认当前）\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_get_price 获取实时价 → 本工具获取历史 K 线 → onchainos_get_quote 交易",
    {
      chainId: z.number().int().describe("链 ID"),
      tokenAddress: z.string().describe("代币合约地址"),
      period: z.enum(["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W", "1M"]).describe("K线周期"),
      after: z.string().optional().describe("起始时间（ISO 8601），用于翻页获取更早数据"),
      before: z.string().optional().describe("结束时间（ISO 8601），默认当前时间"),
    },
    async ({ chainId, tokenAddress, period, after, before }) => {
      try {
        const data = await onchainosApi.getCandlesticks(chainId, tokenAddress, period, after, before);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取 K 线历史 ──────────────────────────────────────────

  server.tool(
    "onchainos_get_candlesticks_history",
    "CAT:[链上-行情] | ## 功能：获取指定代币的完整历史 K 线数据\n## 场景：用于深度回测、长期趋势分析、历史波动率计算\n## 关键词：历史K线, 回测, 历史数据, backtest\n## 参数：\n##   - chainId: 链 ID\n##   - tokenAddress: 代币合约地址\n##   - period: K线周期\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询\n## 返回量：大 ~500KB\n## 关联：onchainos_get_candlesticks 获取实时 K 线 → 本工具获取完整历史",
    {
      chainId: z.number().int().describe("链 ID"),
      tokenAddress: z.string().describe("代币合约地址"),
      period: z.enum(["5m", "15m", "30m", "1H", "4H", "1D", "1W", "1M"]).describe("K线周期"),
    },
    async ({ chainId, tokenAddress, period }) => {
      try {
        const data = await onchainosApi.getCandlesticksHistory(chainId, tokenAddress, period);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取代币详细信息 ──────────────────────────────────────

  server.tool(
    "onchainos_get_token_info",
    "CAT:[链上-行情] | ## 功能：获取代币基本信息（名称/符号/精度/持有人/24h交易量等）\n## 场景：用于验证代币、查看流动性、评估代币质量\n## 关键词：代币信息, token info, token details, 持有人\n## 参数：\n##   - chainId: 链 ID\n##   - tokenAddress: 代币合约地址\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_search_token 搜索 → 本工具查看详情 → onchainos_get_price 查价",
    {
      chainId: z.number().int().describe("链 ID"),
      tokenAddress: z.string().describe("代币合约地址"),
    },
    async ({ chainId, tokenAddress }) => {
      try {
        const data = await onchainosApi.getTokenInfo(chainId, tokenAddress);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );
}
