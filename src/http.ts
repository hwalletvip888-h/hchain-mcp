/**
 * hchain-skills Server — HTTP 传输层
 * 规范: AGENT-MCP-RULES.md §12 (传输层透明 + 无状态)
 * 使用 StreamableHTTPServerTransport (SDK 推荐), 废弃的 SSE transport 已跳过
 *
 * 使用原生 node:http 而非 Express, 避免 Express 5 与 @hono/node-server 兼容问题
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { resolveAuth } from "./adapters/shared.js";
import { registerBalanceTools } from "./tools/balance.js";
import { registerGatewayTools } from "./tools/gateway.js";
import { registerTxHistoryTools } from "./tools/txhistory.js";
import { registerDefiTools } from "./tools/defi.js";
import { registerPaymentsTools } from "./tools/payments.js";
import { registerTradeTools } from "./tools/trade.js";
import { registerIntentTools } from "./tools/intent.js";
import { registerMarketTools } from "./tools/market.js";
import { registerWsTools } from "./tools/ws.js";
import { registerSkillTools } from "./tools/skills.js";
import { registerHelpTools } from "./tools/help.js";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

/** body parser — 读 JSON body 到 req.body, 限制最大 10MB */
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB
function jsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    req.on("data", c => {
      totalSize += c.length;
      if (totalSize > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request body too large (max 10MB)"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      try { resolve(raw ? JSON.parse(raw) : undefined); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

// ── 基础 Rate Limiter ────────────────────────────────────────
const reqCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 1000; // 1 秒窗口
const RATE_MAX = 20;         // 每窗口最多 20 请求

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = reqCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    reqCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}
// 每 60s 清理过期条目
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of reqCounts) {
    if (now > v.resetAt) reqCounts.delete(k);
  }
}, 60_000).unref();

async function main() {
  const auth = resolveAuth();
  if (!auth) {
    console.error("[hchain-skills] 未配置 API Key。设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE");
    console.error("[hchain-skills] 获取: https://web3.okx.com/onchainos/dev-portal");
  } else {
    console.error("[hchain-skills] Auth 已配置");
  }

  const host = process.env.HOST ?? "127.0.0.1";
  const port = parseInt(process.env.PORT ?? "3000", 10);

  // 1. 创建 HTTP transport (有状态模式, 自动生成 sessionId)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // 2. MCP Server + 全部工具注册
  const server = new McpServer({ name: "hchain-skills", version });

  registerBalanceTools(server, auth);
  registerGatewayTools(server, auth);
  registerTxHistoryTools(server, auth);
  registerDefiTools(server, auth);
  registerPaymentsTools(server, auth);
  registerTradeTools(server, auth);
  registerIntentTools(server, auth);
  registerMarketTools(server, auth);
  registerWsTools(server, auth);
  registerSkillTools(server, auth);
  registerHelpTools(server, auth);

  // 3. 连接 server 到 HTTP transport
  await server.connect(transport);

  // 4. 原生 HTTP server
  const httpServer = createServer(async (req, res) => {
    // Rate limiting (按 IP, 支持反向代理)
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress ?? "unknown";
    if (rateLimited(ip)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Too many requests", retryAfterMs: RATE_WINDOW_MS }));
      return;
    }

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 健康检查
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", tsIso: new Date().toISOString() }));
      return;
    }

    // MCP 端点
    if (req.url === "/mcp" || req.url?.startsWith("/mcp")) {
      try {
        let body: unknown;
        if (req.method === "POST") {
          body = await jsonBody(req);
        }
        await transport.handleRequest(req, res, body);
      } catch (e) {
        console.error("[hchain-skills] handleRequest error:", e);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(port, host, () => {
    console.error(`[hchain-skills] HTTP MCP Server 已启动 → http://${host}:${port}`);
    console.error(`[hchain-skills] MCP endpoint: POST http://${host}:${port}/mcp`);
    console.error(`[hchain-skills] Health check: GET  http://${host}:${port}/health`);
  });

  // Graceful shutdown
  function shutdown(signal: string) {
    console.error(`[hchain-skills] 收到 ${signal}，优雅关闭 HTTP 服务器`);
    httpServer.close(() => {
      console.error("[hchain-skills] HTTP 服务器已关闭");
      process.exit(0);
    });
    // 强制关闭超时
    setTimeout(() => { console.error("[hchain-skills] 强制关闭"); process.exit(1); }, 5000).unref();
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(e => { console.error("[hchain-skills] 启动失败:", e); process.exit(1); });
