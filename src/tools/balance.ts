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
    "CAT:[链上-账户] | ## 功能: 获取余额 API 支持的链, 返回 chainIndex(字符串)/name/shortName/logoUrl\n## 场景: Agent 在查余额前先调此工具确认目标链的 chainIndex 值\n## 关键词: 余额, 链列表, chainIndex, balance\n## 参数: 无\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_balance_total_value(总估值) / onchainos_balance_all_tokens(资产明细)",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await balanceApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_balance_total_value",
    "CAT:[链上-账户] | ## 功能: 获取地址的总资产 USD 估值(代币+DeFi)\n## 场景: Agent 拿到钱包地址后第一步 - 快速了解总资产\n## 关键词: 总资产, total value, USD, 估值\n## 参数:\n##   - address: 钱包地址(必填)\n##   - chains: 链索引逗号分隔, 最多50个(必填)\n##   - assetType: 资产类型(可选)\n##   - excludeRiskToken: 是否过滤风险代币(可选, 默认true)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~1KB\n## 关联: onchainos_balance_supported_chain -> 本工具总览 -> onchainos_balance_all_tokens(明细)",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      chains: z.string().describe("链索引, 逗号分隔, 最多50个。如 '1'=ETH '56'=BSC '501'=Solana。从 onchainos_balance_supported_chain 获取 chainIndex"),
      assetType: z.enum(["0","1","2"]).optional().describe("资产类型: 不传默认所有, '0'=代币+DeFi, '1'=仅代币, '2'=仅DeFi"),
      excludeRiskToken: z.boolean().optional().describe("过滤风险/貔貅代币。不传默认过滤, false 传不过滤"),
    },
    { readOnlyHint: true },
    async ({ address, chains, assetType, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await balanceApi.totalValue(auth, address, chains, assetType, excludeRiskToken)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_balance_all_tokens",
    "CAT:[链上-账户] | ## 功能: 获取地址的代币持仓明细, 返回 symbol/balance/tokenPrice/isRiskToken/chainIndex\n## 场景: 用户问持仓有什么币时调用, 返回所有代币余额+美元价值\n## 关键词: 持仓, 代币余额, token balance, 资产明细\n## 参数:\n##   - address: 钱包地址(必填)\n##   - chains: 链索引逗号分隔, 最多50个(必填)\n##   - excludeRiskToken: 风险代币过滤(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 大 ~100KB\n## 关联: onchainos_balance_total_value(总览) -> 本工具明细 -> onchainos_balance_specific_token(精确查)",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      chains: z.string().describe("链索引, 逗号分隔, 最多50个。如 '1'=ETH '56'=BSC。从 onchainos_balance_supported_chain 获取"),
      excludeRiskToken: z.enum(["0","1"]).optional().describe("'0'=过滤风险/貔貅代币(默认), '1'=不过滤"),
    },
    { readOnlyHint: true },
    async ({ address, chains, excludeRiskToken }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await balanceApi.allTokenBalances(auth, address, chains, excludeRiskToken)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_balance_specific_token",
    "CAT:[链上-账户] | ## 功能: 批量查询指定代币余额(最多20个), 每个代币可指定不同链\n## 场景: 查一个或多个特定代币的余额。tokenContractAddress 传空字符串查主链币(ETH/SOL等)\n## 关键词: 代币余额, specific token, 批量, 精确, tokenContractAddress\n## 参数:\n##   - address: 钱包地址(必填)\n##   - tokens: JSON数组 [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0x...\"},...], 最多20个\n##   - excludeRiskToken: 风险代币过滤(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~5KB\n## 关联: onchainos_token_search 拿地址 -> 构造 tokens 数组 -> 本工具 -> 返回 symbol/balance/tokenPrice/isRiskToken",
    {
      address: z.string().describe("钱包地址。Agent 从用户输入或上下文获取"),
      tokens: z.string().describe("JSON 数组字符串。格式: [{\"chainIndex\":\"1\",\"tokenContractAddress\":\"0xabc...\"},{\"chainIndex\":\"56\",\"tokenContractAddress\":\"\"}]。chainIndex 用字符串, 主链币传空字符串。最多20个"),
      excludeRiskToken: z.enum(["0","1"]).optional().describe("'0'=过滤风险/貔貅代币(默认), '1'=不过滤"),
    },
    { readOnlyHint: true },
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
