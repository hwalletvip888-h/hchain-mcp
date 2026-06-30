/**
 * Onchain OS WebSocket 适配层
 * wss://wsdex.okx.com/ws/v6/dex
 *
 * v2.4: 生产加固 — 自动重连 + pong 超时 + JSON 安全 + ErrorEvent 修复
 *
 * MCP Tool 限制: WS 是长连接推送, Tool 是请求-响应。
 * 工具只管理连接生命周期 (subscribe/unsubscribe), 推送数据走 stderr 日志。
 */
import type { Auth } from "./shared.js";
import crypto from "node:crypto";

const WS_URL = "wss://wsdex.okx.com/ws/v6/dex";
const PING_INTERVAL = 25000;
const PONG_TIMEOUT = 10000;       // pong 超时判定失效
const WS_OP_TIMEOUT = 10000;      // subscribe/unsubscribe 超时
const MAX_RECONNECT = 5;          // 最大重连次数
const RECONNECT_BASE_MS = 1000;   // 重连基础等待

// ── WebSocket Manager ─────────────────────────────────────

type WSChannel =
  | { channel: "price"; chainIndex: string; tokenContractAddress: string }
  | { channel: "price-info"; chainIndex: string; tokenContractAddress: string }
  | { channel: "trades"; chainIndex: string; tokenContractAddress: string }
  | { channel: string; chainIndex: string; [key: string]: string };

interface WSState {
  ws: WebSocket | null;
  connId: string | null;
  subscribed: Set<string>;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  pongTimer: ReturnType<typeof setTimeout> | null;
  dataHandlerRegistered: boolean;
  reconnectAttempt: number;
  lastAuth: Auth | null;
  intentionalClose: boolean;
}

const state: WSState = {
  ws: null, connId: null, subscribed: new Set(),
  heartbeatTimer: null, pongTimer: null,
  dataHandlerRegistered: false, reconnectAttempt: 0,
  lastAuth: null, intentionalClose: false,
};

function channelKey(c: WSChannel): string {
  return `${c.channel}:${c.chainIndex}:${"tokenContractAddress" in c ? c.tokenContractAddress : ""}`;
}

function sign(secret: string, timestamp: string): string {
  return crypto.createHmac("sha256", secret).update(timestamp + "GET" + "/users/self/verify").digest("base64");
}

// ── 安全的数据处理器 ────────────────────────────────────
function dataHandler(e: MessageEvent) {
  try {
    const d = JSON.parse(e.data as string);
    if (!["login", "subscribe", "unsubscribe"].includes(d.event)) {
      console.error("[WS-DATA]", JSON.stringify(d));
    }
  } catch {
    console.error("[WS-DATA] malformed frame:", String(e.data).slice(0, 200));
  }
}

// ── 心跳 + Pong 超时 ───────────────────────────────────
function startHeartbeat(ws: WebSocket) {
  stopHeartbeat();
  state.heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
      // pong 超时检测
      state.pongTimer = setTimeout(() => {
        console.error("[WS] pong timeout — forcing reconnect");
        ws.close();
      }, PONG_TIMEOUT);
    }
  }, PING_INTERVAL);
  // 收到 pong 时清除超时
  const pongHandler = () => {
    if (state.pongTimer) { clearTimeout(state.pongTimer); state.pongTimer = null; }
  };
  ws.addEventListener("pong", pongHandler);
  ws.addEventListener("close", () => {
    stopHeartbeat();
    ws.removeEventListener("pong", pongHandler);
  }, { once: true });
}

function stopHeartbeat() {
  if (state.heartbeatTimer) { clearInterval(state.heartbeatTimer); state.heartbeatTimer = null; }
  if (state.pongTimer) { clearTimeout(state.pongTimer); state.pongTimer = null; }
}

// ── 自动重连 ──────────────────────────────────────────
function scheduleReconnect() {
  if (state.intentionalClose) return;
  if (state.reconnectAttempt >= MAX_RECONNECT) {
    console.error("[WS] max reconnect attempts reached — giving up");
    return;
  }
  const delay = RECONNECT_BASE_MS * Math.pow(2, state.reconnectAttempt) + Math.random() * 1000;
  state.reconnectAttempt++;
  console.error(`[WS] reconnect attempt ${state.reconnectAttempt}/${MAX_RECONNECT} in ${Math.round(delay)}ms`);
  setTimeout(async () => {
    if (state.lastAuth) {
      try {
        await wsConnect(state.lastAuth);
        // 恢复所有已订阅频道
        const channels = [...state.subscribed];
        state.subscribed.clear();
        for (const key of channels) {
          const [ch, ci, addr] = key.split(":");
          try { await wsSubscribe({ channel: ch as WSChannel["channel"], chainIndex: ci, tokenContractAddress: addr } as WSChannel); }
          catch { /* 单个频道恢复失败，继续 */ }
        }
        state.reconnectAttempt = 0;
        console.error("[WS] reconnected successfully");
      } catch {
        scheduleReconnect(); // 递归重试
      }
    }
  }, delay);
}

// ── Public API ──────────────────────────────────────────

export async function wsConnect(auth: Auth): Promise<string> {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) return state.connId ?? "already-connected";

  state.lastAuth = auth;
  state.intentionalClose = false;

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
      let data: any;
      try { data = JSON.parse(e.data as string); } catch { return; }
      if (data.event === "login" && data.code === "0") {
        clearTimeout(timeout);
        ws.removeEventListener("message", loginHandler);
        state.ws = ws;
        state.connId = data.connId;
        startHeartbeat(ws);
        // 数据推送 — 全局单例, 只注册一次
        if (!state.dataHandlerRegistered) {
          ws.addEventListener("message", dataHandler);
          state.dataHandlerRegistered = true;
        }
        // 断线自动重连
        ws.addEventListener("close", () => {
          stopHeartbeat();
          if (!state.intentionalClose) scheduleReconnect();
        });
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
      const msg = e instanceof ErrorEvent ? e.message : (e as Event).type;
      reject(new Error(`WS error: ${msg}`));
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
      let d: any;
      try { d = JSON.parse(e.data as string); } catch { return; }
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

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      state.ws!.removeEventListener("message", handler);
      state.subscribed.delete(key); // 超时也清理，防止泄漏
      resolve();
    }, WS_OP_TIMEOUT);

    function handler(e: MessageEvent) {
      let d: any;
      try { d = JSON.parse(e.data as string); } catch { return; }
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
  state.intentionalClose = true;
  stopHeartbeat();
  if (state.ws) {
    state.ws.removeEventListener("message", dataHandler);
    state.dataHandlerRegistered = false;
    state.ws.close();
    state.ws = null;
    state.connId = null;
    state.reconnectAttempt = 0;
    state.subscribed.clear();
  }
}
