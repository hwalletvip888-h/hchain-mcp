#!/usr/bin/env node

/**
 * hchain-skills Server — stdio 传输
 * v2.4: 启动凭证验证 + 结构化日志
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveAuth } from "./adapters/shared.js";
import { logger } from "./adapters/logger.js";
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

function shutdown(signal: string) {
  logger.info("server", `Received ${signal}, exiting`);
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function main() {
  const auth = resolveAuth();
  if (!auth) {
    logger.warn("server", "API Key not configured — tools will return AUTH_REQUIRED",
      { fix: "Set OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE" });
  } else {
    logger.info("server", "API credentials configured, validating...");
    try {
      const res = await fetch("https://web3.okx.com/api/v6/dex/balance/supported-chain", {
        headers: {
          "OK-ACCESS-KEY": auth.apiKey,
          "OK-ACCESS-TIMESTAMP": new Date().toISOString(),
          "OK-ACCESS-PASSPHRASE": auth.passphrase,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        logger.info("server", "API credentials validated");
      } else {
        logger.warn("server", "API credential validation returned non-OK",
          { status: res.status, fix: "Check OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE" });
      }
    } catch {
      logger.warn("server", "API credential validation failed (network error) — continuing anyway");
    }
  }

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

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("server", "MCP server ready (stdio)", { version, tools: 116 });
}

main().catch(e => {
  logger.error("server", "Startup failed", { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
