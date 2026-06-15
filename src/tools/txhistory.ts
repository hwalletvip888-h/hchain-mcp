/**
 * 交易历史模块 — CAT:[链上-账户]
 * 按官方文档逐端点对接
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { postTxApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerTxHistoryTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_tx_history_supported_chain",
    "链上-账户 | 获取交易历史 API 支持的链列表【场景:查哪些链支持查交易历史】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await postTxApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_transaction_history",
    "链上-账户 | 查询地址 6 个月内交易历史【场景:查钱包交易记录/近期交易】",
    {
      address: z.string().describe("钱包地址"),
      chains: z.string().describe("链ID,逗号分隔最多50个。如 '1,56,501,8453'。⚠️ 不确定钱包在哪些链 → 传 '1,56,501,8453,42161,137,196' 盲查"),
      tokenContractAddress: z.string().optional().describe("代币合约地址筛选。不传=查所有代币+主链币, 传空字符串=只查主链币, 传具体地址=查该代币"),
      begin: z.string().optional().describe("开始时间, Unix毫秒时间戳。如 '1700000000000'"),
      end: z.string().optional().describe("结束时间, Unix毫秒时间戳"),
      cursor: z.string().optional().describe("分页游标。首次不传, 后续从返回值取"),
      limit: z.string().optional().describe("返回条数。多链默认20最多20, 单链默认20最多100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, chains, tokenContractAddress, begin, end, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await postTxApi.transactions(auth, address, chains, tokenContractAddress, begin, end, cursor, limit), {
          nextSteps: [
            { action: "查看某笔交易的详细信息", tool: "onchainos_transaction_detail", condition: "从返回列表中取 txHash 和 chainIndex" },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_transaction_detail",
    "链上-账户 | 根据 txHash 查询单笔交易详情【场景:查某笔交易的具体信息】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '42161'=Arbitrum '8453'=Base"),
      txHash: z.string().describe("交易哈希。从 onchainos_transaction_history 返回值或广播返回获取"),
      itype: z.enum(["0","1","2"]).optional().describe("交易层级: '0'=外层主链币转移 '1'=合约内层主链币转移 '2'=token转移。不传查所有"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, txHash, itype }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await postTxApi.transactionDetail(auth, chainIndex, txHash, itype)); } catch(e) { return toError(e); }
    },
  );

}
