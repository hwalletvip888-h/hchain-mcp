/**
 * WebSocket 模块 — CAT:[链上-行情]/[链上-Swap]
 * 管理 WS 连接生命周期: connect → subscribe → (数据stderr日志) → unsubscribe → disconnect
 *
 * ⚠️ MCP Tool 限制: WS 是长连接推送, Tool 是请求-响应。
 * subscribe 后数据通过 stderr 日志输出, 供 Agent 读取。
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { wsConnect, wsSubscribe, wsUnsubscribe, wsDisconnect } from "../adapters/onchainos-ws.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerWsTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_ws_connect",
    "CAT:[链上-WS] | ## 功能: 建立 WebSocket 连接并登录\n## 场景: 需要实时推送数据(价格/K线/交易/信号)时先调此工具\n## 关键词: WebSocket, 连接, 实时, 登录\n## 参数: 无(使用 API Key 自动登录)\n## 鉴权: 需要 API Key\n## 风险: READ\n## 返回量: 微小 ~1KB\n## 关联: 本工具 -> onchainos_ws_subscribe -> onchainos_ws_unsubscribe -> onchainos_ws_disconnect",
    {}, { readOnlyHint: true },
    async () => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { const connId = await wsConnect(auth); return toResult({ connId, status: "connected" }); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_ws_subscribe",
    "CAT:[链上-WS] | ## 功能: 订阅 WebSocket 频道, 数据实时推送到 stderr 日志\n## 场景: 订阅价格/流通/K线/交易/信号/Memepump/地址追踪\n## 关键词: WebSocket, subscribe, 订阅, 实时推送\n## 参数:\n##   - channel: 频道名(必填)\n##   - chainIndex: 链索引(必填)\n##   - tokenContractAddress: 代币地址(价格/流通/K线/交易频道必填)\n## 鉴权: 需先调 onchainos_ws_connect\n## 风险: READ\n## 返回量: 微小 ~1KB\n## 关联: onchainos_ws_connect -> 本工具",
    {
      channel: z.string().describe("频道名: price/price-info/trades/dex-token-candle1m/dex-token-candle1H/dex-market-new-signal-openapi/dex-market-memepump-new-token-openapi/dex-market-memepump-update-metrics-openapi/address-tracker-activity/kol_smartmoney-tracker-activity"),
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().optional().describe("代币合约地址(小写)。price/price-info/trades/candle频道必填, 信号/Memepump频道不需要"),
      walletAddress: z.string().optional().describe("钱包地址。仅 address-tracker-activity 频道需要, 最多200个地址"),
    },
    { readOnlyHint: true },
    async ({ channel, chainIndex, tokenContractAddress, walletAddress }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const ch: Record<string, string> = { channel, chainIndex };
        if (tokenContractAddress) ch.tokenContractAddress = tokenContractAddress;
        if (walletAddress) ch.walletAddress = walletAddress;
        await wsSubscribe(ch as any);
        return toResult({ channel, chainIndex, status: "subscribed" }, {
          warnings: ["数据将通过 stderr 日志实时推送, 标签 [WS-DATA]"],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_ws_unsubscribe",
    "CAT:[链上-WS] | ## 功能: 取消订阅 WebSocket 频道\n## 场景: 不再需要某个频道的实时数据\n## 关键词: WebSocket, unsubscribe, 取消订阅\n## 参数:\n##   - channel/chainIndex/tokenContractAddress: 同 subscribe\n## 鉴权: 需已连接\n## 风险: READ\n## 返回量: 微小 ~1KB\n## 关联: onchainos_ws_subscribe -> 本工具",
    {
      channel: z.string().describe("频道名"),
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().optional().describe("代币地址"),
    },
    { readOnlyHint: true },
    async ({ channel, chainIndex, tokenContractAddress }) => {
      try {
        const ch: Record<string, string> = { channel, chainIndex };
        if (tokenContractAddress) ch.tokenContractAddress = tokenContractAddress;
        await wsUnsubscribe(ch as any);
        return toResult({ channel, status: "unsubscribed" });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_ws_disconnect",
    "CAT:[链上-WS] | ## 功能: 断开 WebSocket 连接\n## 场景: 不再需要实时数据时关闭连接\n## 关键词: WebSocket, disconnect, 断开\n## 参数: 无\n## 鉴权: 无\n## 风险: READ\n## 返回量: 微小 ~1KB\n## 关联: 关闭所有订阅并断开",
    {}, { readOnlyHint: true },
    async () => { wsDisconnect(); return toResult({ status: "disconnected" }); },
  );

}
