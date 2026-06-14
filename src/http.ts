/**
 * h-mcp Server — HTTP 传输层
 * 规范: AGENT-MCP-RULES.md §12 (传输层透明 + 无状态)
 * 使用 StreamableHTTPServerTransport (SDK 推荐), 废弃的 SSE transport 已跳过
 *
 * 使用原生 node:http 而非 Express, 避免 Express 5 与 @hono/node-server 兼容问题
 */
import "dotenv/config";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Auth } from "./adapters/shared.js";
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

function resolveAuth(): Auth | null {
  const k = process.env.OKX_API_KEY, s = process.env.OKX_SECRET_KEY, p = process.env.OKX_PASSPHRASE;
  if (k && s && p) return { apiKey: k, secret: s, passphrase: p };
  const a = process.argv.slice(2), g = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  const ka = g("--okx-api-key") ?? g("-k"), sa = g("--okx-secret") ?? g("-s"), pa = g("--okx-passphrase") ?? g("-p");
  if (ka && sa && pa) return { apiKey: ka, secret: sa, passphrase: pa };
  return null;
}

/** 简陋 body parser — 读 JSON body 到 req.body */
function jsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      try { resolve(raw ? JSON.parse(raw) : undefined); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

async function main() {
  const auth = resolveAuth();
  if (!auth) {
    console.error("[h-mcp] 未配置 API Key。设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE");
    console.error("[h-mcp] 获取: https://web3.okx.com/onchainos/dev-portal");
  } else {
    console.error("[h-mcp] Auth 已配置");
  }

  const host = process.env.HOST ?? "127.0.0.1";
  const port = parseInt(process.env.PORT ?? "3000", 10);

  // 1. 创建 HTTP transport (有状态模式, 自动生成 sessionId)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // 2. MCP Server + 全部工具注册
  const server = new McpServer({ name: "hchain-mcp", version: "1.0.0" });

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

  // 3. 连接 server 到 HTTP transport
  await server.connect(transport);

  // 4. 原生 HTTP server
  const httpServer = createServer(async (req, res) => {
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
        console.error("[h-mcp] handleRequest error:", e);
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
    console.error(`[h-mcp] HTTP MCP Server 已启动 → http://${host}:${port}`);
    console.error(`[h-mcp] MCP endpoint: POST http://${host}:${port}/mcp`);
    console.error(`[h-mcp] Health check: GET  http://${host}:${port}/health`);
  });
}

main().catch(e => { console.error("[h-mcp] 启动失败:", e); process.exit(1); });
