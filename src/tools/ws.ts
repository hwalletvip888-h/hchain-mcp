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
    "链上-WS | 建立 WebSocket 连接并登录",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { const connId = await wsConnect(auth); return toResult({ connId, status: "connected" }); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_ws_subscribe",
    "链上-WS | 订阅频道, 数据实时推送到 stderr 日志",
    {
      channel: z.string().describe("频道名: price/price-info/trades/dex-token-candle1m/dex-token-candle1H/dex-market-new-signal-openapi/dex-market-memepump-new-token-openapi/dex-market-memepump-update-metrics-openapi/address-tracker-activity/kol_smartmoney-tracker-activity"),
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().optional().describe("代币合约地址(小写)。price/price-info/trades/candle频道必填, 信号/Memepump频道不需要"),
      walletAddress: z.string().optional().describe("钱包地址。仅 address-tracker-activity 频道需要, 最多200个地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
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
    "链上-WS | 取消订阅 WebSocket 频道",
    {
      channel: z.string().describe("频道名"),
      chainIndex: z.string().describe("链索引"),
      tokenContractAddress: z.string().optional().describe("代币地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
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
    "链上-WS | 断开 WebSocket 连接",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { wsDisconnect(); return toResult({ status: "disconnected" }); },
  );

}
