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
    "CAT:[链上-网关] | ## 功能: 获取交易上链 API 支持的链, 返回 chainIndex(字符串)/name/shortName\n## 场景: Agent 广播/查gas前确认目标链是否被 Gateway 支持\n## 关键词: gateway, 链列表, chainIndex, broadcast\n## 参数: 无\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~2KB\n## 关联: 本工具 -> onchainos_gateway_gas_price / onchainos_gateway_broadcast",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await gatewayApi.supportedChain(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_gateway_gas_price",
    "CAT:[链上-网关] | ## 功能: 获取指定链的 Gas Price 推荐值(低/中/高三档)\n## 场景: 交易前估算 gas 成本。EVM链返回 normal/min/max(wei) + EIP1559字段, Solana返回 priorityFee 各档位(microlamports)\n## 关键词: gas price, 矿工费, 成本, EIP1559, priority fee\n## 参数:\n##   - chainIndex: 链索引字符串(必填)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~1KB\n## 关联: onchainos_gateway_supported_chain -> 本工具 -> onchainos_gateway_gas_limit(估limit) / onchainos_gateway_simulate(模拟)",
    {
      chainIndex: z.string().describe("链索引(字符串)。'1'=ETH '56'=BSC '501'=Solana。从 onchainos_gateway_supported_chain 获取"),
    },
    { readOnlyHint: true },
    async ({ chainIndex }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await gatewayApi.gasPrice(auth, chainIndex)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_gateway_gas_limit",
    "CAT:[链上-网关] | ## 功能: 预执行交易获取预估 Gas Limit\n## 场景: 知道 gas 用量后计算总费用 = gasPrice * gasLimit\n## 关键词: gas limit, 用量预估, 费用\n## 参数:\n##   - chainIndex: 链索引(必填)\n##   - fromAddress: 发送方地址(必填)\n##   - toAddress: 接收方/合约地址(必填)\n##   - txAmount: 主链币数量(可选, wei单位)\n##   - extJson.inputData: calldata(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 微小 ~1KB\n## 关联: onchainos_gateway_gas_price -> 本工具 -> onchainos_gateway_simulate",
    {
      chainIndex: z.string().describe("链索引(字符串)。从 onchainos_gateway_supported_chain 获取"),
      fromAddress: z.string().describe("发送方地址(钱包地址)"),
      toAddress: z.string().describe("接收方地址。转账=代币地址/钱包地址, 兑换=OKX DEX router地址, 授权=代币地址"),
      txAmount: z.string().optional().describe("主链币金额(wei单位)。主链币交易时填数量, 代币交易填'0'。可从 swap 返回值 tx.value 获取"),
      inputData: z.string().optional().describe("calldata(hex)。从 swap/approve 返回值获取"),
    },
    { readOnlyHint: true },
    async ({ chainIndex, fromAddress, toAddress, txAmount, inputData }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const extJson = inputData ? { inputData } : undefined;
        return toResult(await gatewayApi.gasLimit(auth, { chainIndex, fromAddress, toAddress, txAmount, extJson }));
      } catch(e) { return toError(e); }
    },
  );

  server.tool("onchainos_gateway_simulate",
    "CAT:[链上-网关] | ## 功能: 模拟执行交易, 不消耗 gas, 返回资产变化/failReason/risks\n## 场景: 广播前必调 - 验证交易是否 revert、资产变化是否符合预期。需白名单, 联系 dexapi@okx.com\n## 关键词: 模拟, simulate, 预执行, 资产变化, failReason, 风险\n## 参数:\n##   - fromAddress: 发送方(必填)\n##   - toAddress: 接收方/合约(必填)\n##   - chainIndex: 链索引字符串(必填)\n##   - inputData: calldata hex(必填)\n##   - txAmount: 主链币金额 wei(可选, 默认0)\n##   - gasPrice: gas price(可选)\n##   - priorityFee: Solana优先费(可选)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 仅模拟, 不上链\n## 返回量: 微小 ~3KB\n## 关联: onchainos_gateway_gas_limit -> 本工具模拟 -> 模拟通过后 onchainos_gateway_broadcast",
    {
      fromAddress: z.string().describe("发送方地址(钱包地址)"),
      toAddress: z.string().describe("接收方地址。兑换=OKX DEX router, 授权=代币地址"),
      chainIndex: z.string().describe("链索引(字符串)。如 '1'=ETH '501'=Solana"),
      inputData: z.string().describe("calldata(hex, base58编码)。从 swap/approve 返回值获取"),
      txAmount: z.string().optional().describe("主链币金额(wei)。主链币交易填数量, 代币交易填'0'"),
      gasPrice: z.string().optional().describe("Gas price(wei), 不填用当前网络价"),
      priorityFee: z.string().optional().describe("优先费。仅 Solana, 单位 microlamports"),
    },
    { readOnlyHint: true },
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
    "CAT:[链上-网关] | ## 功能: 广播已签名交易到链上, 返回 orderId/txHash\n## 场景: Agent 拿到用户签名后提交上链。支持 MEV 保护(Solana可传 jitoSignedTx)\n## 关键词: 广播, broadcast, 上链, MEV保护, txHash\n## 参数:\n##   - signedTx: 签名后交易hex(必填)\n##   - chainIndex: 链索引字符串(必填)\n##   - address: 用户地址(必填)\n##   - enableMevProtection: 启用防夹(可选)\n##   - jitoSignedTx: Solana Jito签名交易(可选, SOL专用)\n## 鉴权: 需要 API Key(交易)\n## 风险: WRITE - 实际执行上链\n## 返回量: 微小 ~1KB\n## 关联: onchainos_gateway_simulate 模拟通过 -> 用户签名 -> 本工具广播 -> onchainos_gateway_orders 查订单状态",
    {
      signedTx: z.string().describe("用户签名后的完整交易 hex。用户用私钥/钱包对 calldata 签名后得到"),
      chainIndex: z.string().describe("链索引(字符串)。如 '1'=ETH '501'=Solana"),
      address: z.string().describe("用户钱包地址"),
      enableMevProtection: z.boolean().optional().describe("启用 MEV 防夹保护。仅 ETH/BSC/SOL/BASE 支持"),
      jitoSignedTx: z.string().optional().describe("Solana Jito 签名交易(base58)。仅 SOL, signedTx 和 jitoSignedTx 必须同时填"),
    },
    { destructiveHint: true },
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
    "CAT:[链上-网关] | ## 功能: 查询广播订单列表, 按时间倒序, 返回 txStatus(1排队/2成功/3失败)/txHash\n## 场景: 广播后确认交易是否成功上链\n## 关键词: 订单, orders, txStatus, 确认, 广播记录\n## 参数:\n##   - address: 地址(必填)\n##   - chainIndex: 链索引字符串(必填)\n##   - txStatus: 状态筛选(可选)\n##   - orderId: 订单ID(可选)\n##   - cursor: 分页游标(可选)\n##   - limit: 返回条数(可选, 默认20, 最多100)\n## 鉴权: 需要 API Key(只读)\n## 风险: READ - 只读查询\n## 返回量: 中等 ~10KB\n## 关联: onchainos_gateway_broadcast -> 本工具 -> onchainos_transaction_detail 看详情",
    {
      address: z.string().describe("钱包地址"),
      chainIndex: z.string().describe("链索引(字符串)。如 '1'=ETH"),
      txStatus: z.enum(["1","2","3"]).optional().describe("交易状态: '1'=排队中 '2'=成功 '3'=失败"),
      orderId: z.string().optional().describe("订单ID。从 onchainos_gateway_broadcast 返回值获取"),
      cursor: z.string().optional().describe("分页游标。首次不传, 后续从返回值取"),
      limit: z.string().optional().describe("返回条数, 默认20, 最多100"),
    },
    { readOnlyHint: true },
    async ({ address, chainIndex, txStatus, orderId, cursor, limit }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try { return toResult(await postTxApi.orders(auth, address, chainIndex, txStatus, orderId, cursor, limit)); } catch(e) { return toError(e); }
    },
  );

}
