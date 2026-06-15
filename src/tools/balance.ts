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
    "链上-账户 | 获取余额 API 支持的链列表",
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await balanceApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_balance_total_value",
    "链上-账户 | 获取地址的总资产 USD 估值",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      chains: z.string().describe("链索引, 逗号分隔, 最多50个。如 '1'=ETH '56'=BSC '501'=Solana。从 onchainos_balance_supported_chain 获取 chainIndex"),
      assetType: z.enum(["0","1","2"]).optional().describe("资产类型: 不传默认所有, '0'=代币+DeFi, '1'=仅代币, '2'=仅DeFi"),
      excludeRiskToken: z.boolean().optional().describe("过滤风险/貔貅代币。不传默认过滤, false 传不过滤"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, chains, assetType, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await balanceApi.totalValue(auth, address, chains, assetType, excludeRiskToken)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_balance_all_tokens",
    "链上-账户 | 获取地址的代币持仓明细",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      chains: z.string().describe("链索引, 逗号分隔, 最多50个。如 '1'=ETH '56'=BSC。从 onchainos_balance_supported_chain 获取"),
      excludeRiskToken: z.enum(["0","1"]).optional().describe("'0'=过滤风险/貔貅代币(默认), '1'=不过滤"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, chains, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await balanceApi.allTokenBalances(auth, address, chains, excludeRiskToken)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_balance_specific_token",
    "链上-账户 | 批量查询指定代币余额",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      tokens: z.string().describe("JSON 数组字符串。格式: [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0xabc...\"},{\"chainIndex\":\"56\",\"tokenContractAddress\":\"\"}]。chainIndex 用字符串, 主链币传空字符串。最多20个"),
      excludeRiskToken: z.enum(["0","1"]).optional().describe("'0'=过滤风险/貔貅代币(默认), '1'=不过滤"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, tokens, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        let parsed: Array<{ chainIndex: string; tokenContractAddress: string }>;
        try { parsed = JSON.parse(tokens); } catch { return toError(new Error("tokens 格式错误: 需要 JSON 数组, 例 [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0xabc...\"}]")); }
        if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 20) return toError(new Error("tokens 需为非空数组且最多20个元素"));
        return toResult(await balanceApi.specificTokenBalance(auth, address, parsed, excludeRiskToken));
      } catch(e) { return toError(e); }
    },
  );

}
