/**
 * Help 导航工具 — Agent 首次连接 MCP 的"第一站"
 * 展示全功能总览、模块分类、场景速查、参数规则
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toResult } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerHelpTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_help",
    "🧭 hchain-mcp 导航总览 — Agent首次使用必看。" +
    "这个MCP是专属Agent的链上全功能工具集,覆盖OKX OnchainOS全部100个API。" +
    "调这个工具获取: ①全部模块分类 ②Agent场景→工具映射 ③参数填写规则 ④常用工作流。",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => {
      return toResult({
        name: "hchain-mcp",
        version: "1.0.3",
        description: "专属 Agent 的链上全功能 MCP · 100 工具覆盖 OKX OnchainOS",
        chains: "支持 40+ 条链: ETH(1) BSC(56) Solana(501) Base(8453) Arbitrum(42161) Polygon(137) Sui(784) TON(607) X Layer(196) Optimism(10) Avalanche(43114) Fantom(250) 等",

        modules: [
          {
            name: "行情类 — 45个工具",
            prefix: "onchainos_market_* / onchainos_token_* / onchainos_index_* / onchainos_social_*",
            scenarios: "查价格·K线·代币信息·持有人·安全分析·热门榜单·信号·聪明钱·社媒·新闻·情绪",
          },
          {
            name: "交易类 — 8个工具",
            prefix: "onchainos_dex_*",
            scenarios: "DEX报价·授权·构建兑换·查交易状态",
          },
          {
            name: "DeFi类 — 14个工具",
            prefix: "onchainos_defi_*",
            scenarios: "搜索投资品·APY/TVL·申购·赎回·领取奖励·查持仓",
          },
          {
            name: "网关类 — 6个工具",
            prefix: "onchainos_gateway_*",
            scenarios: "Gas预估·模拟执行·广播上链·查订单",
          },
          {
            name: "余额类 — 4个工具",
            prefix: "onchainos_balance_*",
            scenarios: "查总资产·代币持仓·指定代币余额",
          },
          {
            name: "支付类 — 5个工具",
            prefix: "onchainos_payment_*",
            scenarios: "Agent间A2A支付·x402结算",
          },
          {
            name: "意图类 — 6个工具",
            prefix: "onchainos_intent_*",
            scenarios: "意图订单创建/查询/取消·拍卖信息",
          },
          {
            name: "WS类 — 4个工具",
            prefix: "onchainos_ws_*",
            scenarios: "WebSocket连接/订阅/取消/断开",
          },
          {
            name: "历史类 — 3个工具",
            prefix: "onchainos_tx_* / onchainos_transaction_*",
            scenarios: "交易历史·交易详情",
          },
          {
            name: "🎯 Skill组合类 — 5个工具（推荐优先使用）",
            prefix: "onchainos_skill_*",
            scenarios: "一键交易管线·综合风险检测·智能滑点·信号聚合·市场全景速览",
          },
        ],

        quickStart: [
          { userSays: "这个币安全吗 / 查一下貔貅", use: "onchainos_skill_risk_detect" },
          { userSays: "帮我买/卖 X 换 Y / 做个兑换", use: "onchainos_skill_trade_pipeline" },
          { userSays: "ETH 现在多少钱 / 查价格", use: "onchainos_market_price" },
          { userSays: "一站式了解这个币怎么样", use: "onchainos_skill_market_overview" },
          { userSays: "聪明钱在买什么 / 有信号吗", use: "onchainos_skill_signal_aggregate" },
          { userSays: "滑点设多少合适", use: "onchainos_skill_smart_slippage" },
          { userSays: "查钱包余额 / 我有多少钱", use: "onchainos_balance_total_value" },
          { userSays: "查代币信息 / 这是什么币", use: "onchainos_token_basic_info" },
          { userSays: "扫一下新发的Meme币", use: "onchainos_memepump_token_list" },
          { userSays: "有什么 DeFi 理财", use: "onchainos_defi_search_products" },
        ],

        paramRules: [
          "chainIndex 是字符串不是数字 ⚠️ 填 '1' 不是 1。不确定→调 supported_chain",
          "金额是最小单位(含decimals) ⚠️ 公式: amount = 人类可读 × 10^decimals",
          "代币地址⤵不知道合约地址→先调 onchainos_token_search 搜索",
          "主链币(ETH/SOL/BNB)传空字符串 '' 或原生地址",
          "所有地址参数需小写",
          "Page/cursor 分页参数首次不传,后续从返回值取",
        ],

        commonWorkflows: [
          ["快速查币", "onchainos_token_search → onchainos_token_basic_info → onchainos_market_price → onchainos_skill_risk_detect"],
          ["兑换交易", "onchainos_skill_smart_slippage → onchainos_skill_trade_pipeline → 用户签名 → onchainos_gateway_broadcast → onchainos_gateway_orders"],
          ["信号跟单", "onchainos_skill_signal_aggregate → onchainos_skill_risk_detect → onchainos_skill_trade_pipeline"],
          ["DeFi投资", "onchainos_defi_search_products → onchainos_defi_product_detail → onchainos_defi_prepare_transaction → onchainos_defi_enter"],
        ],
      });
    },
  );
}
