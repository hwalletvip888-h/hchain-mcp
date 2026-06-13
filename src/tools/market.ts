/**
 * Market 模块 — 行情/搜索/K线
 *
 * 全部需 API Key · CAT: [链上-行情]
 * 工具数: 4 (search/price/candlesticks/info)
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onchainosApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerMarketTools(server: McpServer, auth: Auth | null): void {

  // ── 搜索代币 ──────────────────────────────────────────────

  server.tool(
    "onchainos_search_token",
    "CAT:[链上-行情] | ## 功能：跨链搜索代币，按名称/符号/合约地址模糊匹配\n## 场景：用于 Agent 查找代币、验证合约地址、发现链上资产\n## 关键词：搜索, 代币, token, search, address\n## 参数：\n##   - search: 搜索关键词，支持代币名称、符号（BTC/ETH）或合约地址，至少 2 字符\n##   - chains: 链索引列表，逗号分隔（如 \"1,56,137\"），不填查所有链\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询，Agent 可自动调用\n## 返回量：中等 ~30KB\n## 关联：本工具搜索代币 → onchainos_get_token_info 查看详情 → onchainos_get_price 查价",
    {
      search: z.string().min(2).describe("搜索关键词：代币名称、符号（如BTC/ETH）或完整合约地址"),
      chains: z.string().optional().describe("链索引列表，逗号分隔（如 '1,56,137'）。不填则查所有支持的链"),
    },
    { readOnlyHint: true },
    async ({ search, chains }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosApi.searchToken(auth, search, chains);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取实时价格 ──────────────────────────────────────────

  server.tool(
    "onchainos_get_price",
    "CAT:[链上-行情] | ## 功能：获取指定代币在单链上的实时价格\n## 场景：用于查询代币当前币价、交易前比价、发现价差机会\n## 关键词：链上行情, 代币价格, price, onchain\n## 参数：\n##   - chainIndex: 链索引。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana\n##   - tokenAddress: 代币合约地址（必填）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询，Agent 可自动调用\n## 返回量：微小 ~1KB\n## 关联：onchainos_search_token 搜索代币 → 本工具查价 → onchainos_get_quote 获取报价",
    {
      chainIndex: z.number().int().describe("链索引。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana"),
      tokenAddress: z.string().describe("代币合约地址（必填）"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosApi.getPrice(auth, chainIndex, tokenAddress);
        return toResult(data, {
          nextSteps: [
            { action: "获取K线", tool: "onchainos_get_candlesticks", params: { chainIndex, tokenAddress, period: "1H" } },
            { action: "获取报价", tool: "onchainos_get_quote", params: { chainIndex, fromTokenAddress: tokenAddress } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取 K 线 ──────────────────────────────────────────────

  server.tool(
    "onchainos_get_candlesticks",
    "CAT:[链上-行情] | ## 功能：获取指定代币的 K 线数据，支持实时最近1000根或完整历史\n## 场景：用于价格走势分析、技术指标计算、交易信号生成、深度回测\n## 关键词：K线, candlestick, 走势图, OHLCV, 技术分析, 回测\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n##   - period: K线周期。1m/5m/15m/30m/1H/4H/1D/1W/1M\n##   - mode: \"live\"=最近1000根带翻页（默认） | \"history\"=完整历史数据\n##   - after: 起始时间ISO 8601（live模式翻页用）\n##   - before: 结束时间ISO 8601（默认当前）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_get_price 获取实时价 → 本工具获取 K 线 → onchainos_get_quote 交易",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      period: z.enum(["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W", "1M"]).describe("K线周期"),
      mode: z.enum(["live", "history"]).optional().default("live").describe("数据模式：live=最近1000根（默认），history=完整历史"),
      after: z.string().optional().describe("起始时间 ISO 8601，live模式翻页用"),
      before: z.string().optional().describe("结束时间 ISO 8601，默认当前"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, period, mode, after, before }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = mode === "history"
          ? await onchainosApi.getCandlesticksHistory(auth, chainIndex, tokenContractAddress, period)
          : await onchainosApi.getCandlesticks(auth, chainIndex, tokenContractAddress, period, after, before);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 获取代币详细信息 ──────────────────────────────────────

  server.tool(
    "onchainos_get_token_info",
    "CAT:[链上-行情] | ## 功能：获取代币基本信息（名称/符号/精度/持有人/24h交易量等）\n## 场景：用于验证代币、查看流动性、评估代币质量\n## 关键词：代币信息, token info, token details\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_search_token 搜索 → 本工具查看详情 → onchainos_get_price 查价",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await onchainosApi.getTokenBasicInfo(auth, chainIndex, tokenAddress);
        return toResult(data, {
          nextSteps: [
            { action: "查看实时价格", tool: "onchainos_get_price", params: { chainIndex, tokenAddress } },
            { action: "查看K线", tool: "onchainos_get_candlesticks", params: { chainIndex, tokenAddress, period: "1D" } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );
}
