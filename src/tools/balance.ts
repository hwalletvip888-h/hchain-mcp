/**
 * Balance 模块 — CAT:[链上-账户]
 * 按官方文档逐端点对接
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { balanceApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerBalanceTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_balance_supported_chain",
    "链上-账户 | 获取余额 API 支持的链列表【场景:查哪些链有余额API支持】",
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await balanceApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_balance_total_value",
    "链上-账户 | 获取地址的总资产 USD 估值【场景:查钱包总余额/总资产】",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      chains: z.string().describe("链ID,逗号分隔最多50个。如 '1,56,501,8453'。⚠️ 不确定钱包在哪些链 → 传 '1,56,501,8453,42161,137,196' 盲查全部主流链"),
      assetType: z.enum(["0","1","2"]).optional().describe("资产类型: 不传默认所有, '0'=代币+DeFi, '1'=仅代币, '2'=仅DeFi"),
      excludeRiskToken: z.boolean().optional().describe("过滤风险/貔貅代币。不传默认过滤, false 传不过滤"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, chains, assetType, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await balanceApi.totalValue(auth, address, chains, assetType, excludeRiskToken), {
          nextSteps: [
            { action: "查持仓明细", tool: "onchainos_balance_all_tokens", params: { address, chains } },
            { action: "分析地址画像(PnL/胜率)", tool: "onchainos_portfolio_overview", condition: "需要指定单链" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_balance_all_tokens",
    "链上-账户 | 获取地址的代币持仓明细【场景:查钱包里有什么币/持仓列表】",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      chains: z.string().describe("链ID,逗号分隔最多50个。如 '1,56,501,8453'。⚠️ 不确定钱包在哪些链 → 传 '1,56,501,8453,42161,137,196' 盲查全部主流链"),
      excludeRiskToken: z.enum(["0","1"]).optional().describe("'0'=过滤风险/貔貅代币(默认), '1'=不过滤"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, chains, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await balanceApi.allTokenBalances(auth, address, chains, excludeRiskToken), {
          nextSteps: [
            { action: "如发现高风险代币, 做安全分析", tool: "onchainos_token_advanced_info", condition: "需要 chainIndex + tokenContractAddress" },
            { action: "分析地址交易历史", tool: "onchainos_transaction_history", params: { address, chains } },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_balance_specific_token",
    "链上-账户 | 批量查询指定代币余额【场景:查某个代币在钱包里的数量】",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      tokens: z.array(z.object({
        chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana。不确定先调 onchainos_balance_supported_chain"),
        tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''"),
      })).min(1).max(20).describe("要查询的代币列表, 最多20个。每个元素指定在哪条链查哪个代币"),
      excludeRiskToken: z.enum(["0","1"]).optional().describe("'0'=过滤风险/貔貅代币(默认), '1'=不过滤"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, tokens, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await balanceApi.specificTokenBalance(auth, address, tokens, excludeRiskToken));
      } catch(e) { return toError(e); }
    },
  );

}
