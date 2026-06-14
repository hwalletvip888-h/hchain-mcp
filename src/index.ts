/**
 * OnchainOS MCP Server
 * 规范: OnchainOS-API对接规范.md §五
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
    console.error("[onchain-mcp] 未配置 API Key。设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE");
    console.error("[onchain-mcp] 获取: https://web3.okx.com/onchainos/dev-portal");
  } else {
    console.error("[onchain-mcp] Auth 已配置");
  }

  const server = new McpServer({ name: "onchain-mcp", version: "1.0.0" });

  // 逐模块注册工具 (按官方文档对接)
  registerBalanceTools(server, auth);
  registerGatewayTools(server, auth);
  registerTxHistoryTools(server, auth);
  registerDefiTools(server, auth);
  registerPaymentsTools(server, auth);
  registerTradeTools(server, auth);
  registerIntentTools(server, auth);
  registerMarketTools(server, auth);
  registerWsTools(server, auth);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[onchain-mcp] 就绪");
}

main().catch(e => { console.error("[onchain-mcp] 启动失败:", e); process.exit(1); });
