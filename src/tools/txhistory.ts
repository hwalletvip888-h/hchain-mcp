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
    "CAT:[链上-账户] | ## 功能: 获取交易历史 API 支持的链, 返回 chainIndex(字符串)/name/shortName\n## 场景: 查交易历史前确认目标链是否被支持\n## 关键词: 交易历史, 链列表, tx history, chainIndex\n## 参数: 无\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_transaction_history / onchainos_transaction_detail",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await postTxApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_transaction_history",
    "CAT:[链上-账户] | ## 功能: 查询地址6个月内交易历史, 按时间倒序, 支持130+链\n## 场景: 用户想看最近交易记录, 或分析某地址的交易行为\n## 关键词: 交易历史, tx history, 转账, 合约交互\n## 参数:\n##   - address: 钱包地址(必填)\n##   - chains: 链索引逗号分隔, 最多50个(必填)\n##   - tokenContractAddress: 代币筛选(可选)\n##   - begin/end: 时间范围 Unix毫秒(可选)\n##   - cursor: 分页游标(可选)\n##   - limit: 返回条数, 多链最多20, 单链最多100(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 大 ~100KB\n## 关联: onchainos_tx_history_supported_chain -> 本工具 -> onchainos_transaction_detail(单笔详情)",
    {
      address: z.string().describe("钱包地址"),
      chains: z.string().describe("链索引, 逗号分隔, 最多50个。如 '1'=ETH '56'=BSC。从 onchainos_tx_history_supported_chain 获取"),
      tokenContractAddress: z.string().optional().describe("代币合约地址筛选。不传=查所有代币+主链币, 传空字符串=只查主链币, 传具体地址=查该代币"),
      begin: z.string().optional().describe("开始时间, Unix毫秒时间戳。如 '1700000000000'"),
      end: z.string().optional().describe("结束时间, Unix毫秒时间戳"),
      cursor: z.string().optional().describe("分页游标。首次不传, 后续从返回值取"),
      limit: z.string().optional().describe("返回条数。多链默认20最多20, 单链默认20最多100"),
    },
    { readOnlyHint: true },
    async ({ address, chains, tokenContractAddress, begin, end, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await postTxApi.transactions(auth, address, chains, tokenContractAddress, begin, end, cursor, limit)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_transaction_detail",
    "CAT:[链上-账户] | ## 功能: 根据 txHash 查询单笔交易详情, 含 internalTransactionDetails/tokenTransferDetails\n## 场景: 看某笔交易的 gas 消耗、内部交易、代币转移明细\n## 关键词: 交易详情, tx detail, hash, 内部交易, token transfer\n## 参数:\n##   - chainIndex: 链索引字符串(必填)\n##   - txHash: 交易哈希(必填)\n##   - itype: 交易层级类型(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_transaction_history -> 本工具 -> onchainos_portfolio_overview(关联地址分析)",
    {
      chainIndex: z.string().describe("链索引(字符串)。如 '1'=ETH '42161'=Arbitrum"),
      txHash: z.string().describe("交易哈希。从 onchainos_transaction_history 返回值或广播返回获取"),
      itype: z.enum(["0","1","2"]).optional().describe("交易层级: '0'=外层主链币转移 '1'=合约内层主链币转移 '2'=token转移。不传查所有"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, txHash, itype }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await postTxApi.transactionDetail(auth, chainIndex, txHash, itype)); } catch(e) { return toError(e); }
    },
  );

}
