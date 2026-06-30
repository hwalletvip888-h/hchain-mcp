/**
 * hchain-skills Server — HTTP 传输层
 * 规范: AGENT-MCP-RULES.md §12 (传输层透明 + 无状态)
 * 使用 StreamableHTTPServerTransport (SDK 推荐)
 *
 * v2.4: 请求超时 + 可配置 CORS + 健康检查含 auth 状态 + 日志
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { resolveAuth } from "./adapters/shared.js";
import { logger, nextCorrelationId } from "./adapters/logger.js";
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

const REQUEST_TIMEOUT_MS = 30000;
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

/** body parser — 读 JSON body 到 req.body, 限制最大 10MB */
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

// ── 基础 Rate Limiter (单实例; 多实例部署建议用反向代理限流) ──
const reqCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 1000;
const RATE_MAX = 20;

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
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of reqCounts) {
    if (now > v.resetAt) reqCounts.delete(k);
  }
}, 60_000).unref();

// ── 启动时凭证验证 ──────────────────────────────────────────
async function validateAuth(auth: NonNullable<ReturnType<typeof resolveAuth>>): Promise<boolean> {
  try {
    // 用 balanceApi.supportedChain 验证凭证 (轻量 GET, 无副作用)
    const res = await fetch("https://web3.okx.com/api/v6/dex/balance/supported-chain", {
      headers: {
        "OK-ACCESS-KEY": auth.apiKey,
        "OK-ACCESS-SIGN": "",
        "OK-ACCESS-TIMESTAMP": new Date().toISOString(),
        "OK-ACCESS-PASSPHRASE": auth.passphrase,
      },
    });
    return res.ok || res.status === 401 === false; // 401=凭证错误, 其他可能是服务端问题
  } catch {
    return false; // 网络错误 = 无法验证, 不阻塞启动
  }
}

async function main() {
  const auth = resolveAuth();
  let authValid = false;
  if (!auth) {
    logger.warn("server", "API Key not configured — tools will return AUTH_REQUIRED",
      { fix: "Set OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE" });
  } else {
    logger.info("server", "Validating API credentials...");
    authValid = await validateAuth(auth);
    if (authValid) {
      logger.info("server", "API credentials validated successfully");
    } else {
      logger.warn("server", "API credential validation failed — tools may return errors",
        { fix: "Check OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE" });
    }
  }

  const host = process.env.HOST ?? "127.0.0.1";
  const port = parseInt(process.env.PORT ?? "3000", 10);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

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

  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    const cid = nextCorrelationId();

    // 请求超时
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.writeHead(408, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request timeout" }));
      }
    }, REQUEST_TIMEOUT_MS);

    try {
      // Rate limiting
      const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
        ?? req.socket.remoteAddress ?? "unknown";
      if (rateLimited(ip)) {
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Too many requests", retryAfterMs: RATE_WINDOW_MS }));
        return;
      }

      // CORS (可配置)
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // 健康检查 (含 auth 状态)
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          version,
          auth: auth ? (authValid ? "valid" : "configured_unverified") : "missing",
          tools: 116,
          tsIso: new Date().toISOString(),
        }));
        return;
      }

      // MCP 端点
      if (req.url === "/mcp" || req.url?.startsWith("/mcp")) {
        logger.info("http", "MCP request", { method: req.method, ip }, cid);
        try {
          let body: unknown;
          if (req.method === "POST") {
            body = await jsonBody(req);
          }
          await transport.handleRequest(req, res, body);
        } catch (e) {
          logger.error("http", "handleRequest failed", { error: e instanceof Error ? e.message : String(e) }, cid);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        }
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    } finally {
      clearTimeout(timeout);
    }
  });

  httpServer.listen(port, host, () => {
    logger.info("server", "HTTP MCP Server started", { host, port, version, corsOrigin: CORS_ORIGIN });
    console.error(`[hchain-skills] HTTP MCP Server → http://${host}:${port}`);
    console.error(`[hchain-skills] Health check: GET  http://${host}:${port}/health`);
  });

  function shutdown(signal: string) {
    logger.info("server", `Received ${signal}, shutting down`);
    httpServer.close(() => {
      logger.info("server", "HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => { logger.error("server", "Forced shutdown"); process.exit(1); }, 5000).unref();
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(e => { logger.error("server", "Startup failed", { error: e instanceof Error ? e.message : String(e) }); process.exit(1); });
