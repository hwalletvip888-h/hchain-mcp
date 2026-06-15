#!/usr/bin/env node

/**
 * h-mcp Server — stdio 传输
 * 规范: OnchainOS-API对接规范.md §五
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Auth } from "./adapters/shared.js";
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

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

function shutdown(signal: string) {
  console.error(`[h-mcp] 收到 ${signal}，优雅退出`);
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function main() {
  const auth = resolveAuth();
  if (!auth) {
    console.error("[h-mcp] 未配置 API Key。设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE");
    console.error("[h-mcp] 获取: https://web3.okx.com/onchainos/dev-portal");
  } else {
    console.error("[h-mcp] Auth 已配置");
  }

  const server = new McpServer({ name: "hchain-mcp", version });

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
  registerSkillTools(server, auth);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[h-mcp] 就绪");
}

main().catch(e => { console.error("[h-mcp] 启动失败:", e); process.exit(1); });
