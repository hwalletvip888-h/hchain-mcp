/**
 * Onchain OS WebSocket 适配层
 * wss://wsdex.okx.com/ws/v6/dex
 *
 * MCP Tool 限制: WS 是长连接推送, Tool 是请求-响应。
 * 工具只管理连接生命周期 (subscribe/unsubscribe), 推送数据走 stderr 日志。
 */
import type { Auth } from "./shared.js";
import crypto from "node:crypto";

const WS_URL = "wss://wsdex.okx.com/ws/v6/dex";
const PING_INTERVAL = 25000;
const WS_OP_TIMEOUT = 10000; // subscribe/unsubscribe 超时

// ── WebSocket Manager ─────────────────────────────────────

type WSChannel =
  | { channel: "price"; chainIndex: string; tokenContractAddress: string }
  | { channel: "price-info"; chainIndex: string; tokenContractAddress: string }
  | { channel: "trades"; chainIndex: string; tokenContractAddress: string }
  | { channel: string; chainIndex: string; [key: string]: string };

interface WSState { ws: WebSocket | null; connId: string | null; subscribed: Set<string>; heartbeatTimer: ReturnType<typeof setInterval> | null; }

// ⚠️ 全局单例 WS 状态 — Node.js 单线程 + 事件循环保证 Set 操作安全
const state: WSState = { ws: null, connId: null, subscribed: new Set(), heartbeatTimer: null };

function channelKey(c: WSChannel): string { return `${c.channel}:${c.chainIndex}:${"tokenContractAddress" in c ? c.tokenContractAddress : ""}`; }

function sign(secret: string, timestamp: string): string {
  return crypto.createHmac("sha256", secret).update(timestamp + "GET" + "/users/self/verify").digest("base64");
}

// ── 数据推送处理器 — 全局单例, login 成功后只注册一次 ─────
function dataHandler(e: MessageEvent) {
  const d = JSON.parse(e.data as string);
  if (!["login", "subscribe", "unsubscribe"].includes(d.event)) {
    console.error("[WS-DATA]", JSON.stringify(d));
  }
}

function startHeartbeat(ws: WebSocket) {
  stopHeartbeat(); // 先清理旧的
  state.heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send("ping");
  }, PING_INTERVAL);
  ws.addEventListener("close", () => stopHeartbeat(), { once: true });
}

function stopHeartbeat() {
  if (state.heartbeatTimer) { clearInterval(state.heartbeatTimer); state.heartbeatTimer = null; }
}

// ── Public API ──────────────────────────────────────────

export async function wsConnect(auth: Auth): Promise<string> {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) return state.connId ?? "already-connected";

  const timestamp = String(Math.floor(Date.now() / 1000));
  const loginMsg = JSON.stringify({
    op: "login",
    args: [{ apiKey: auth.apiKey, passphrase: auth.passphrase, timestamp, sign: sign(auth.secret, timestamp) }],
  });

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => { ws.close(); reject(new Error("WS connection timeout")); }, WS_OP_TIMEOUT);

    ws.addEventListener("open", () => {
      ws.send(loginMsg);
    });

    const loginHandler = (e: MessageEvent) => {
      const data = JSON.parse(e.data as string);
      if (data.event === "login" && data.code === "0") {
        clearTimeout(timeout);
        ws.removeEventListener("message", loginHandler);
        state.ws = ws;
        state.connId = data.connId;
        startHeartbeat(ws);
        // 数据推送 — 全局单例, 只注册一次
        ws.addEventListener("message", dataHandler);
        resolve(data.connId);
      } else if (data.event === "error") {
        clearTimeout(timeout);
        ws.removeEventListener("message", loginHandler);
        ws.close();
        reject(new Error(`WS login failed: ${data.code} ${data.msg}`));
      }
    };

    ws.addEventListener("message", loginHandler);

    ws.addEventListener("error", (e) => {
      clearTimeout(timeout);
      ws.removeEventListener("message", loginHandler);
      reject(new Error(`WS error: ${JSON.stringify(e)}`));
    });
  });
}

export async function wsSubscribe(channel: WSChannel): Promise<void> {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) throw new Error("WS not connected, call ws_connect first");

  const key = channelKey(channel);
  if (state.subscribed.has(key)) return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      state.ws!.removeEventListener("message", handler);
      reject(new Error("WS subscribe timeout"));
    }, WS_OP_TIMEOUT);

    function handler(e: MessageEvent) {
      const d = JSON.parse(e.data as string);
      if (d.event === "subscribe" && d.arg?.channel === channel.channel) {
        clearTimeout(timeout);
        state.subscribed.add(key);
        state.ws!.removeEventListener("message", handler);
        resolve();
      } else if (d.event === "error") {
        clearTimeout(timeout);
        state.ws!.removeEventListener("message", handler);
        reject(new Error(`WS subscribe failed: ${d.code} ${d.msg}`));
      }
    }
    state.ws!.addEventListener("message", handler);
    state.ws!.send(JSON.stringify({ op: "subscribe", args: [channel] }));
  });
}

export async function wsUnsubscribe(channel: WSChannel): Promise<void> {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

  const key = channelKey(channel);
  if (!state.subscribed.has(key)) return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      state.ws!.removeEventListener("message", handler);
      resolve(); // 超时不抛错, 静默完成 — 已取消订阅频道
    }, WS_OP_TIMEOUT);

    function handler(e: MessageEvent) {
      const d = JSON.parse(e.data as string);
      if (d.event === "unsubscribe") {
        clearTimeout(timeout);
        state.subscribed.delete(key);
        state.ws!.removeEventListener("message", handler);
        resolve();
      }
    }
    state.ws!.addEventListener("message", handler);
    state.ws!.send(JSON.stringify({ op: "unsubscribe", args: [channel] }));
  });
}

export function wsDisconnect(): void {
  stopHeartbeat();
  if (state.ws) {
    state.ws.removeEventListener("message", dataHandler);
    state.ws.close();
    state.ws = null;
    state.connId = null;
    state.subscribed.clear();
  }
}
