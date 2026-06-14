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
    "CAT:[链上-Swap] | ## 功能: 创建意图订单, 提交 EIP-712 签名的订单到撮合系统, 返回 orderUid\n## 场景: quote 拿到 signData -> 用户 EIP-712 签名 -> 本工具创建订单 -> 等待 Solver 竞价成交\n## 关键词: intent, 意图, 订单, create, EIP-712, solver\n## 参数:\n##   - chainIndex/fromTokenAddress/toTokenAddress/fromTokenAmount/toTokenAmount/userWalletAddress/validTo/quoteId/appData/signature(必填)\n##   - commissionInfos: 分佣列表 JSON(可选)\n##   - swapReceiverAddress: 接收代币地址(可选)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 创建链上意图订单\n## 返回量: 微小 ~1KB\n## 关联: quote(mode=intent) -> 本工具 -> onchainos_intent_order_status / onchainos_intent_order_list",
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
    { destructiveHint: true },
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
    "CAT:[链上-Swap] | ## 功能: 查询意图订单历史, 返回 dataList/游标分页\n## 场景: 查看地址的意图订单成交记录\n## 关键词: intent, 订单列表, order list, 分页\n## 参数:\n##   - userWalletAddress/orderUid: 二选一必填\n##   - cursor/limit: 分页(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~20KB\n## 关联: onchainos_intent_create_order -> 本工具",
    {
      userWalletAddress: z.string().optional().describe("下单钱包地址。与 orderUid 二选一必填"),
      orderUid: z.string().optional().describe("订单ID。与 userWalletAddress 二选一必填"),
      cursor: z.string().optional().describe("分页游标, 首次不传"),
      limit: z.number().int().max(500).optional().describe("每页条数, 默认100, 最大500"),
    },
    { readOnlyHint: true },
    async (params) => {
      if(!auth) return AUTH_REQUIRED("READ");
      if (!params.userWalletAddress && !params.orderUid) return toError(new Error("userWalletAddress 和 orderUid 二选一必填"));
      try { return toResult(await intentApi.orderList(auth, params)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_intent_order_status",
    "CAT:[链上-Swap] | ## 功能: 查询意图订单当前状态\n## 场景: 创建订单后跟踪成交进度\n## 关键词: intent, order status, 订单状态\n## 参数:\n##   - orderUid: 订单ID(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~1KB\n## 关联: onchainos_intent_create_order -> 本工具\n## 状态码: -7=已过期 -6=余额不足 -2=已取消 -1=失败 0=结算中 1=已成交 3=活跃 5=拍卖中",
    { orderUid: z.string().describe("订单ID。从 onchainos_intent_create_order 返回值获取") },
    { readOnlyHint: true },
    async ({ orderUid }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await intentApi.orderStatus(auth, orderUid)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_intent_cancel_sign_data",
    "CAT:[链上-Swap] | ## 功能: 获取取消意图订单所需的 EIP-712 签名数据\n## 场景: 取消订单前拿签名数据\n## 关键词: intent, cancel, sign data, EIP-712\n## 参数:\n##   - userWalletAddress: 下单钱包(必填)\n##   - orderUid: 订单ID(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> 用户 EIP-712 签名 -> onchainos_intent_cancel_order",
    {
      userWalletAddress: z.string().describe("下单者钱包地址"),
      orderUid: z.string().describe("要取消的订单ID"),
    },
    { readOnlyHint: true },
    async ({ userWalletAddress, orderUid }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await intentApi.cancelSignData(auth, userWalletAddress, orderUid)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_intent_cancel_order",
    "CAT:[链上-Swap] | ## 功能: 取消意图订单\n## 场景: 在订单成交前撤销\n## 关键词: intent, cancel, 取消订单\n## 参数:\n##   - userWalletAddress/orderUid/signature(必填)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 取消订单\n## 返回量: 微小 ~1KB\n## 关联: onchainos_intent_cancel_sign_data -> 签名 -> 本工具",
    {
      userWalletAddress: z.string().describe("下单者钱包地址"),
      orderUid: z.string().describe("要取消的订单ID"),
      signature: z.string().describe("用户对 cancel_sign_data 返回的 signData 进行 EIP-712 签名的结果"),
    },
    { destructiveHint: true },
    async ({ userWalletAddress, orderUid, signature }) => {
      if(!auth) return AUTH_REQUIRED("TRADE");
      try { return toResult(await intentApi.cancelOrder(auth, userWalletAddress, orderUid, signature)); } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_intent_auction_info",
    "CAT:[链上-Swap] | ## 功能: 查询意图拍卖详情, 含各 Solver 竞价方案/排名/成交信息\n## 场景: 分析某次拍卖的 Solver 竞争情况\n## 关键词: intent, auction, 拍卖, solver, 竞价\n## 参数:\n##   - auctionId/txHash: 二选一必填\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_intent_create_order -> 本工具",
    {
      auctionId: z.string().optional().describe("拍卖ID。与 txHash 二选一必填"),
      txHash: z.string().optional().describe("上链交易哈希。与 auctionId 二选一必填"),
    },
    { readOnlyHint: true },
    async ({ auctionId, txHash }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      if (!auctionId && !txHash) return toError(new Error("auctionId 和 txHash 二选一必填"));
      try { return toResult(await intentApi.auctionInfo(auth, { auctionId, txHash })); } catch(e) { return toError(e); }
    },
  );

}
