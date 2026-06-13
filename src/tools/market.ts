/**
 * 行情模块 — CAT:[链上-行情]
 * 命名: onchainos_<模块>_<操作> (OnchainOS-API对接规范.md §6.7)
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { marketApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerMarketTools(server: McpServer, auth: Auth | null): void {

  // ── 1. 支持的市场链 ────────────────────────────────────
  server.tool(
    "onchainos_market_supported_chain",
    "CAT:[链上-行情] | ## 功能：获取行情 API 支持的链列表\n## 场景：查询行情数据前确认目标链是否可用\n## 关键词：行情, 链列表, market, supported chain\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具确认链可用 → onchainos_token_search 搜索代币",
    {},
    { readOnlyHint: true },
    async () => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await marketApi.supportedChain(auth);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 2. 搜索代币 ────────────────────────────────────────
  server.tool(
    "onchainos_token_search",
    "CAT:[链上-行情] | ## 功能：跨链搜索代币，按名称/符号/合约地址模糊匹配\n## 场景：查找代币、验证合约地址、发现链上资产\n## 关键词：搜索, 代币, token, search\n## 参数：\n##   - search: 搜索关键词，支持代币名称/符号/合约地址，至少 2 字符\n##   - chains: 链索引，逗号分隔（如 \"1,56,137\"），不填查所有链\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：本工具搜索代币 → onchainos_token_basic_info 查看详情 → onchainos_market_price 查价",
    {
      search: z.string().min(2).describe("搜索关键词：代币名称、符号（如ETH）或完整合约地址"),
      chains: z.string().optional().describe("链索引列表，逗号分隔（如 '1,56,137'）。不填查所有链"),
    },
    { readOnlyHint: true },
    async ({ search, chains }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await marketApi.searchToken(auth, search, chains);
        return toResult(data, {
          nextSteps: [
            { action: "查看代币详情", tool: "onchainos_token_basic_info", params: { tokenAddress: "从返回结果中取 tokenContractAddress" } },
            { action: "查询实时价格", tool: "onchainos_market_price", params: {} },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 3. 实时价格 ────────────────────────────────────────
  server.tool(
    "onchainos_market_price",
    "CAT:[链上-行情] | ## 功能：获取指定代币在单链上的实时价格\n## 场景：查询代币当前币价、交易前比价\n## 关键词：价格, price, 行情, 币价\n## 参数：\n##   - chainIndex: 链索引。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_token_search 搜索 → 本工具查价 → onchainos_dex_quote 报价",
    {
      chainIndex: z.number().int().describe("链索引。1=ETH, 56=BSC, 137=Polygon, 8453=Base, 501=Solana"),
      tokenAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await marketApi.price(auth, chainIndex, tokenAddress);
        return toResult(data, {
          nextSteps: [
            { action: "查看K线", tool: "onchainos_market_candles", params: { chainIndex, tokenContractAddress: tokenAddress, period: "1H" } },
            { action: "获取报价", tool: "onchainos_dex_quote", params: { chainIndex, tokenAddress } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );

  // ── 4. K 线 ───────────────────────────────────────────
  server.tool(
    "onchainos_market_candles",
    "CAT:[链上-行情] | ## 功能：获取代币 K 线数据，支持实时最近 1000 根或完整历史\n## 场景：价格走势分析、技术指标计算、回测\n## 关键词：K线, candlestick, OHLCV, 走势图\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenContractAddress: 代币合约地址\n##   - period: K线周期。1m/5m/15m/30m/1H/4H/1D/1W/1M\n##   - mode: \"live\"=最近1000根（默认） | \"history\"=完整历史\n##   - after: 起始时间（live翻页用）\n##   - before: 结束时间（默认当前）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：大 ~100KB\n## 关联：onchainos_market_price 查价 → 本工具获取K线 → onchainos_dex_quote 交易",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenContractAddress: z.string().describe("代币合约地址"),
      period: z.enum(["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W", "1M"]).describe("K线周期"),
      mode: z.enum(["live", "history"]).optional().default("live").describe("数据模式：live=最近1000根（默认），history=完整历史"),
      after: z.string().optional().describe("起始时间 ISO 8601，live翻页用"),
      before: z.string().optional().describe("结束时间 ISO 8601，默认当前"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenContractAddress, period, mode, after, before }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = mode === "history"
          ? await marketApi.historicalCandles(auth, chainIndex, tokenContractAddress, period)
          : await marketApi.candles(auth, chainIndex, tokenContractAddress, period, after, before);
        return toResult(data);
      } catch (e) { return toError(e); }
    },
  );

  // ── 5. 代币基本信息 ────────────────────────────────────
  server.tool(
    "onchainos_token_basic_info",
    "CAT:[链上-行情] | ## 功能：获取代币基本信息（名称/符号/精度）\n## 场景：验证代币、查看代币元数据\n## 关键词：代币信息, token info, 详情\n## 参数：\n##   - chainIndex: 链索引\n##   - tokenAddress: 代币合约地址\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_token_search 搜索 → 本工具查详情 → onchainos_market_price 查价",
    {
      chainIndex: z.number().int().describe("链索引"),
      tokenAddress: z.string().describe("代币合约地址"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, tokenAddress }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      try {
        const data = await marketApi.tokenBasicInfo(auth, chainIndex, tokenAddress);
        return toResult(data, {
          nextSteps: [
            { action: "查询实时价格", tool: "onchainos_market_price", params: { chainIndex, tokenAddress } },
            { action: "查看K线", tool: "onchainos_market_candles", params: { chainIndex, tokenContractAddress: tokenAddress, period: "1D" } },
          ],
        });
      } catch (e) { return toError(e); }
    },
  );
}
