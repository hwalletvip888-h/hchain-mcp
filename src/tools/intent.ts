/**
 * Intent 模块 — CAT:[链上-Swap]
 * 意图兑换: quote(mode=intent) -> createOrder -> orderList/orderStatus -> cancelSignData/cancelOrder
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { intentApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerIntentTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_intent_create_order",
    "链上-Swap | 创建意图订单，提交 EIP-712 签名订单",
    {
      chainIndex: z.string().describe("链索引。仅支持 ETH(1)/BSC(56)/Arbitrum(42161)/Base(8453)"),
      fromTokenAddress: z.string().describe("卖出代币地址。须与 quote 的 signData.message.fromTokenAddress 一致"),
      toTokenAddress: z.string().describe("买入代币地址。须与 quote 的 signData.message.toTokenAddress 一致"),
      fromTokenAmount: z.string().describe("卖出数量(最小单位)。须与 quote 的 signData.message.fromTokenAmount 一致"),
      toTokenAmount: z.string().describe("最小买入数量(最小单位)。由 quote 的 signData.message.toTokenAmount 结合滑点计算"),
      userWalletAddress: z.string().describe("下单钱包地址。须与 quote 的 signData.message.owner 一致"),
      validTo: z.number().int().describe("订单过期Unix时间戳(秒)。须与 quote 的 signData.message.validTo 一致"),
      quoteId: z.string().describe("报价ID。从 quote(mode=intent) 返回值获取"),
      appData: z.string().describe("应用数据(bytes32)。须与 quote 的 signData.message.appData 一致"),
      signature: z.string().describe("用户私钥对 quote 返回的 signData 进行 EIP-712 签名的结果"),
      swapReceiverAddress: z.string().optional().describe("接收代币的地址, 默认=userWalletAddress"),
      commissionInfos: z.string().optional().describe("分佣列表 JSON 数组。须与 quote 的 signData.message.commissionInfos 一致"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ chainIndex, fromTokenAddress, toTokenAddress, fromTokenAmount, toTokenAmount, userWalletAddress, validTo, quoteId, appData, signature, swapReceiverAddress, commissionInfos }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try {
        const body: Record<string, unknown> = { chainIndex, fromTokenAddress, toTokenAddress, fromTokenAmount, toTokenAmount, userWalletAddress, validTo, quoteId, appData, signature };
        if (swapReceiverAddress) body.swapReceiverAddress = swapReceiverAddress;
        if (commissionInfos) { try { body.commissionInfos = JSON.parse(commissionInfos); } catch { return toError(new Error("commissionInfos 格式错误")); } }
        return toResult(await intentApi.createOrder(auth, body), {
          nextSteps: [
            { action: "查订单状态", tool: "onchainos_intent_order_status", params: { orderUid: "{{返回的 orderUid}}" } },
          ],
        });
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_intent_order_list",
    "链上-Swap | 查询意图订单历史，支持游标分页",
    {
      userWalletAddress: z.string().optional().describe("下单钱包地址。与 orderUid 二选一必填"),
      orderUid: z.string().optional().describe("订单ID。与 userWalletAddress 二选一必填"),
      cursor: z.string().optional().describe("分页游标, 首次不传"),
      limit: z.number().int().max(500).optional().describe("每页条数, 默认100, 最大500"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      if (!params.userWalletAddress && !params.orderUid) return toError(new Error("userWalletAddress 和 orderUid 二选一必填"));
      try { return toResult(await intentApi.orderList(auth, params)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_intent_order_status",
    "链上-Swap | 查询意图订单当前状态",
    { orderUid: z.string().describe("订单ID。从 onchainos_intent_create_order 返回值获取") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ orderUid }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await intentApi.orderStatus(auth, orderUid)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_intent_cancel_sign_data",
    "链上-Swap | 获取取消意图订单的 EIP-712 签名数据",
    {
      userWalletAddress: z.string().describe("下单者钱包地址"),
      orderUid: z.string().describe("要取消的订单ID"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ userWalletAddress, orderUid }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await intentApi.cancelSignData(auth, userWalletAddress, orderUid)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_intent_cancel_order",
    "链上-Swap | 取消意图订单",
    {
      userWalletAddress: z.string().describe("下单者钱包地址"),
      orderUid: z.string().describe("要取消的订单ID"),
      signature: z.string().describe("用户对 cancel_sign_data 返回的 signData 进行 EIP-712 签名的结果"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async ({ userWalletAddress, orderUid, signature }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try { return toResult(await intentApi.cancelOrder(auth, userWalletAddress, orderUid, signature)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_intent_auction_info",
    "链上-Swap | 查询意图拍卖详情，含 Solver 竞价方案",
    {
      auctionId: z.string().optional().describe("拍卖ID。与 txHash 二选一必填"),
      txHash: z.string().optional().describe("上链交易哈希。与 auctionId 二选一必填"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ auctionId, txHash }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      if (!auctionId && !txHash) return toError(new Error("auctionId 和 txHash 二选一必填"));
      try { return toResult(await intentApi.auctionInfo(auth, { auctionId, txHash })); } catch(e) { return toError(e); }
    },
  );

}
