/**
 * H-MCP — Onchain OS MCP Server
 *
 * Phase 1: 全 API 对接
 *   Market / Trade / Wallet / Gateway / Payments
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { Auth } from "./adapters/onchainos.js";
import { registerMarketTools } from "./tools/market.js";
import { registerTradeTools } from "./tools/trade.js";
import { registerWalletTools } from "./tools/wallet.js";
import { registerGatewayTools } from "./tools/gateway.js";
import { registerPaymentsTools } from "./tools/payments.js";

// ── Auth 解析 ──────────────────────────────────────────────────

function resolveAuth(): Auth | null {
  const apiKey = process.env.OKX_API_KEY;
  const secret = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;

  if (apiKey && secret && passphrase) {
    return { apiKey, secret, passphrase };
  }

  // 也可以从命令行参数读取
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const keyArg = getArg("--okx-api-key") ?? getArg("-k");
  const secretArg = getArg("--okx-secret") ?? getArg("-s");
  const passphraseArg = getArg("--okx-passphrase") ?? getArg("-p");

  if (keyArg && secretArg && passphraseArg) {
    return { apiKey: keyArg, secret: secretArg, passphrase: passphraseArg };
  }

  return null;
}

// ── 启动 ──────────────────────────────────────────────────────

async function main() {
  const auth = resolveAuth();
  const authStatus = auth ? "已配置 (读写可用)" : "未配置 (仅公开只读)";

  console.error(`[H-MCP] Onchain OS MCP Server v0.1.0`);
  console.error(`[H-MCP] Auth: ${authStatus}`);
  console.error(`[H-MCP] 模块: Market | Trade | Wallet | Gateway | Payments`);

  const server = new McpServer({
    name: "h-mcp",
    version: "0.1.0",
  });

  // 所有模块均需 API Key（OKX 2025年全端点鉴权）
  if (!auth) {
    console.error("[H-MCP] ⚠️  未配置 API Key。请设置 OKX_API_KEY / OKX_SECRET / OKX_PASSPHRASE 环境变量");
    console.error("[H-MCP]     或运行: h-mcp -k <key> -s <secret> -p <passphrase>");
    console.error("[H-MCP]     获取 Key: https://web3.okx.com/onchainos/dev-portal");
  }

  registerMarketTools(server, auth);
  registerTradeTools(server, auth);
  registerWalletTools(server, auth);
  registerGatewayTools(server, auth);
  registerPaymentsTools(server, auth);

  // stdio 传输
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[H-MCP] 已就绪，等待 Agent 调用...");
}

main().catch((e) => {
  console.error("[H-MCP] 启动失败:", e);
  process.exit(1);
});
