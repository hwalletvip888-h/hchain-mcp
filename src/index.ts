/**
 * H-MCP — Onchain OS MCP Server
 * Phase 1: 全 API 对接
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Auth } from "./adapters/shared.js";
import { registerMarketTools } from "./tools/market.js";
import { registerTradeTools } from "./tools/trade.js";
import { registerBalanceTools } from "./tools/balance.js";
import { registerGatewayTools } from "./tools/gateway.js";
import { registerPaymentsTools } from "./tools/payments.js";

function resolveAuth(): Auth | null {
  const k = process.env.OKX_API_KEY, s = process.env.OKX_SECRET_KEY, p = process.env.OKX_PASSPHRASE;
  if (k && s && p) return { apiKey: k, secret: s, passphrase: p };
  const a = process.argv.slice(2), g = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  const ka = g("--okx-api-key") ?? g("-k"), sa = g("--okx-secret") ?? g("-s"), pa = g("--okx-passphrase") ?? g("-p");
  if (ka && sa && pa) return { apiKey: ka, secret: sa, passphrase: pa };
  return null;
}

async function main() {
  const auth = resolveAuth();
  if (!auth) {
    console.error("[H-MCP] ⚠️ 未配置 API Key。请设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE");
    console.error("[H-MCP] 获取: https://web3.okx.com/onchainos/dev-portal");
  } else {
    console.error("[H-MCP] Auth 已配置");
  }

  const server = new McpServer({ name: "h-mcp", version: "0.1.0" });
  registerMarketTools(server, auth);
  registerTradeTools(server, auth);
  registerBalanceTools(server, auth);
  registerGatewayTools(server, auth);
  registerPaymentsTools(server, auth);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[H-MCP] 就绪 — Market | Trade | Balance | Gateway | Payments");
}

main().catch(e => { console.error("[H-MCP] 启动失败:", e); process.exit(1); });
