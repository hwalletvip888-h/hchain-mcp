/**
 * Gateway 模块 — CAT:[链上-网关]
 * 交易上链: Gas预估 + 模拟 + 广播
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { gatewayApi, postTxApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerGatewayTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_gateway_supported_chain",
    "链上-网关 | 获取交易上链 API 支持的链列表【场景:查哪些链支持交易上链】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await gatewayApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_gateway_gas_price",
    "链上-网关 | 获取指定链的 Gas Price 推荐值【场景:查Gas费/推荐矿工费】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_gateway_supported_chain 获取完整列表"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await gatewayApi.gasPrice(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_gateway_gas_limit",
    "链上-网关 | 预执行交易获取预估 Gas Limit【场景:估算Gas用量】",
    {
      chainIndex: z.string().describe("链ID(字符串)。⚠️ 不确定先调 onchainos_gateway_supported_chain 获取可用链列表"),
      fromAddress: z.string().describe("发送方地址(钱包地址)"),
      toAddress: z.string().describe("接收方地址。转账=代币地址/钱包地址, 兑换=OKX DEX router地址, 授权=代币地址"),
      txAmount: z.string().optional().describe("主链币金额(wei单位)。主链币交易时填数量, 代币交易填'0'。可从 swap 返回值 tx.value 获取"),
      inputData: z.string().optional().describe("calldata(hex)。从 swap/approve 返回值获取"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, fromAddress, toAddress, txAmount, inputData }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const extJson = inputData ? { inputData } : undefined;
        return toResult(await gatewayApi.gasLimit(auth, { chainIndex, fromAddress, toAddress, txAmount, extJson }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_gateway_simulate",
    "链上-网关 | 模拟交易执行(不消耗 gas)【场景:模拟交易/预执行/检查会不会失败】",
    {
      fromAddress: z.string().describe("发送方地址(钱包地址)"),
      toAddress: z.string().describe("接收方地址。兑换=OKX DEX router, 授权=代币地址"),
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base"),
      inputData: z.string().describe("calldata(hex, base58编码)。从 swap/approve 返回值获取"),
      txAmount: z.string().optional().describe("主链币金额(wei)。主链币交易填数量, 代币交易填'0'"),
      gasPrice: z.string().optional().describe("Gas price(wei), 不填用当前网络价"),
      priorityFee: z.string().optional().describe("优先费。仅 Solana, 单位 microlamports"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ fromAddress, toAddress, chainIndex, inputData, txAmount, gasPrice, priorityFee }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        return toResult(await gatewayApi.simulate(auth, {
          fromAddress, toAddress, chainIndex,
          txAmount,
          extJson: { inputData },
          gasPrice, priorityFee,
        }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_gateway_broadcast",
    "链上-网关 | 广播已签名交易到链上【场景:发送交易上链/提交签名交易】",
    {
      signedTx: z.string().describe("用户签名后的完整交易 hex。用户用私钥/钱包对 calldata 签名后得到"),
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base"),
      address: z.string().describe("用户钱包地址"),
      enableMevProtection: z.boolean().optional().describe("启用 MEV 防夹保护。仅 ETH/BSC/SOL/BASE 支持"),
      jitoSignedTx: z.string().optional().describe("Solana Jito 签名交易(base58)。仅 SOL, signedTx 和 jitoSignedTx 必须同时填"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ signedTx, chainIndex, address, enableMevProtection, jitoSignedTx }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const extraData = (enableMevProtection !== undefined || jitoSignedTx)
          ? JSON.stringify({ enableMevProtection: enableMevProtection ?? false, ...(jitoSignedTx ? { jitoSignedTx } : {}) })
          : undefined;
        const data = await gatewayApi.broadcast(auth, { signedTx, chainIndex, address, extraData });
        return toResult(data, {
          nextSteps: [
            { action: "查订单状态", tool: "onchainos_gateway_orders", params: { address, chainIndex, orderId: "{{返回的 orderId}}" } },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_gateway_orders",
    "链上-网关 | 查询广播订单列表【场景:查交易是否成功/订单状态】",
    {
      address: z.string().describe("钱包地址"),
      chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '56'=BSC '501'=Solana"),
      txStatus: z.enum(["1","2","3"]).optional().describe("交易状态: '1'=排队中 '2'=成功 '3'=失败"),
      orderId: z.string().optional().describe("订单ID。从 onchainos_gateway_broadcast 返回值获取"),
      cursor: z.string().optional().describe("分页游标。首次不传, 后续从返回值取"),
      limit: z.string().optional().describe("返回条数, 默认20, 最多100"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ address, chainIndex, txStatus, orderId, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await postTxApi.orders(auth, address, chainIndex, txStatus, orderId, cursor, limit)); } catch(e) { return toError(e); }
    },
  );

}
