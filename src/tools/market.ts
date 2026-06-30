import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Auth } from "../adapters/shared.js";
import { registerMarketPriceTools } from "./market-price.js";
import { registerTokenTools } from "./token.js";
import { registerSignalTools } from "./signal.js";
import { registerMemepumpTools } from "./memepump.js";
import { registerPortfolioTools } from "./portfolio.js";
import { registerSocialTools } from "./social.js";

export function registerMarketTools(server: McpServer, auth: Auth | null): void {
  registerMarketPriceTools(server, auth);
  registerTokenTools(server, auth);
  registerSignalTools(server, auth);
  registerMemepumpTools(server, auth);
  registerPortfolioTools(server, auth);
  registerSocialTools(server, auth);
}
