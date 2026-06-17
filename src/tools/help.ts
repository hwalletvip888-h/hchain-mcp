/**
 * Help 导航工具 — Agent 首次连接 MCP 的"第一站"
 * 展示全功能总览、模块分类、场景速查、参数规则、新手路径
 */
import { readFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toResult } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerHelpTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_help",
    "🧭 hchain-skills 导航总览 — 【首次使用务必先调本工具！】" +
    "109个链上工具(行情/交易/DeFi/余额/支付/WS等)，覆盖OKX OnchainOS全部API。" +
    "调本工具获取: ①11大模块速览(含🔍只读/✍️写链标注) ②用户意图→工具映射 ③参数规则 ④工作流 ⑤新手路径",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => {
      const { version } = JSON.parse(
        readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
      );
      return toResult({
        name: "hchain-skills",
        version,
        toolCount: 109,
        description: "AI原生多链交易MCP — 让Agent拥有链上超能力",
        chains: "40+链: ETH(1) BSC(56) Solana(501) Base(8453) Arbitrum(42161) 等",

        // ── 👋 直接抄这个试 ──
        tryNow: [
          "💬 对 Agent 说: '我的钱包有多少钱'",
          "💬 对 Agent 说: 'ETH 现在什么价'",
          "💬 对 Agent 说: '调研一下 0x... 这个代币安不安全'",
          "💬 对 Agent 说: '帮我把 100 USDT 换成 ETH'",
          "💬 对 Agent 说: '扫一下最近新发的币'",
        ],
        slashCommands: [
          { cmd: "/research 0xABC", does: "代币深度调研 (行情+安全+社媒)" },
          { cmd: "/trade 0xA 0xB 100", does: "完整交易流水线" },
          { cmd: "/scan new", does: "扫新币 /scan smart 看聪明钱" },
          { cmd: "/monitor", does: "持仓监控一览" },
          { cmd: "/audit 0xABC", does: "代币安全审计" },
          { cmd: "/dispatch \"要做什么\"", does: "智能任务派发给Agent团队" },
        ],

        // ── 新手推荐路径 ──
        newbiePath: [
          { step: 1, action: "查余额", tool: "onchainos_balance_total_value", says: "我的钱包有多少钱" },
          { step: 2, action: "看行情", tool: "onchainos_market_price", says: "ETH、SOL现在什么价" },
          { step: 3, action: "调研代币", tool: "onchainos_skill_market_overview", says: "一站式分析这个代币 0x..." },
          { step: 4, action: "安全审查", tool: "onchainos_skill_risk_detect", says: "这个币安全吗" },
          { step: 5, action: "执行交易", tool: "onchainos_skill_trade_pipeline", says: "帮我把100 USDT换成ETH" },
        ],

        // ── 模块总览 ──
        modules: [
          { name: "💰 余额", count: 4, access: "🔍", prefix: "onchainos_balance_*", desc: "多链余额·总资产估值·持仓明细" },
          { name: "🔍 行情", count: 45, access: "🔍", prefix: "onchainos_market_* / token_* / social_*", desc: "价格·K线·代币信息·信号·聪明钱·社媒·新闻" },
          { name: "⚠️ 风控", count: 1, access: "🔍", prefix: "onchainos_skill_risk_detect", desc: "4维风险0-100评分·貔貅·Bundle·持仓分布" },
          { name: "💱 交易", count: 8, access: "✍️", prefix: "onchainos_dex_*", desc: "DEX报价·授权·兑换·历史" },
          { name: "🎯 意图", count: 6, access: "✍️", prefix: "onchainos_intent_*", desc: "意图订单·拍卖·跨链结算" },
          { name: "🌉 网关", count: 6, access: "✍️", prefix: "onchainos_gateway_*", desc: "Gas·模拟·广播·订单追踪" },
          { name: "🏦 DeFi", count: 14, access: "✍️", prefix: "onchainos_defi_*", desc: "投资品·申购·赎回·持仓·APY" },
          { name: "💳 支付", count: 5, access: "✍️", prefix: "onchainos_payment_*", desc: "A2A支付·x402结算" },
          { name: "📡 WS", count: 4, access: "🔍", prefix: "onchainos_ws_*", desc: "实时推送·价格订阅" },
          { name: "📜 历史", count: 3, access: "🔍", prefix: "onchainos_transaction_*", desc: "交易历史·详情" },
          { name: "🧠 Skill", count: 13, access: "混合", prefix: "onchainos_skill_*", desc: "组合技能·一键完成复杂操作" },
        ],

        // ── 13个组合技能 ──
        skills: [
          { tool: "onchainos_skill_trade_pipeline", access: "✍️", desc: "全自动交易: 报价→授权→构建→模拟", says: "帮我买/卖/兑换" },
          { tool: "onchainos_skill_risk_detect", access: "🔍", desc: "4维风险评分0-100", says: "这个币安全吗" },
          { tool: "onchainos_skill_smart_slippage", access: "🔍", desc: "智能滑点推荐", says: "滑点设多少" },
          { tool: "onchainos_skill_signal_aggregate", access: "🔍", desc: "信号+自动风险过滤", says: "聪明钱在买什么" },
          { tool: "onchainos_skill_market_overview", access: "🔍", desc: "市场全景: 价格+K线+安全+情绪", says: "一站式了解这个币" },
          { tool: "onchainos_skill_crosschain_swap", access: "✍️", desc: "跨链原子交换(Intent/Direct)", says: "把ETH链的USDT换成Arb链的ETH" },
          { tool: "onchainos_skill_conditional_order", access: "✍️", desc: "限价单/止损单", says: "ETH到2500时买入" },
          { tool: "onchainos_skill_tx_accelerator", access: "✍️", desc: "交易加速/取消", says: "交易卡住了" },
          { tool: "onchainos_skill_social_narrative", access: "🔍", desc: "社媒叙事: 情绪+KOL+新闻", says: "大家怎么看这个币" },
          { tool: "onchainos_skill_batch_swap", access: "✍️", desc: "批量兑换", says: "一次买5个币" },
          { tool: "onchainos_skill_nonce_manager", access: "🔍", desc: "Nonce查询与诊断", says: "Nonce乱了" },
          { tool: "onchainos_skill_price_alert", access: "🔍", desc: "WS实时价格预警", says: "ETH到3000通知我" },
          { tool: "onchainos_skill_gas_configurator", access: "🔍", desc: "EIP-1559 Gas配置", says: "Gas设多少" },
        ],

        // ── 意图→工具映射 ──
        quickStart: [
          { says: "我的钱包有多少钱", use: "onchainos_balance_total_value" },
          { says: "ETH现在多少钱", use: "onchainos_market_price" },
          { says: "这个币安全吗/是不是貔貅", use: "onchainos_skill_risk_detect" },
          { says: "帮我买/卖/兑换", use: "onchainos_skill_trade_pipeline" },
          { says: "跨链兑换", use: "onchainos_skill_crosschain_swap" },
          { says: "挂限价单/止损", use: "onchainos_skill_conditional_order" },
          { says: "交易卡住了/加速", use: "onchainos_skill_tx_accelerator" },
          { says: "一站式了解这个币", use: "onchainos_skill_market_overview" },
          { says: "聪明钱在买什么", use: "onchainos_skill_signal_aggregate" },
          { says: "滑点设多少", use: "onchainos_skill_smart_slippage" },
          { says: "社媒怎么看/情绪分析", use: "onchainos_skill_social_narrative" },
          { says: "批量买/一次换多个", use: "onchainos_skill_batch_swap" },
          { says: "Nonce乱了/查nonce", use: "onchainos_skill_nonce_manager" },
          { says: "监控价格/盯盘", use: "onchainos_skill_price_alert" },
          { says: "Gas多少/自定义Gas", use: "onchainos_skill_gas_configurator" },
          { says: "有什么DeFi理财", use: "onchainos_defi_search_products" },
          { says: "扫新币/Meme", use: "onchainos_memepump_token_list" },
          { says: "查交易记录", use: "onchainos_transaction_history" },
        ],

        // ── 参数规则 ──
        paramRules: [
          "⚠️ chainIndex 是字符串: '1'不是1",
          "⚠️ 金额是最小单位: USDT(6位) 1=1000000, ETH(18位) 1=1000000000000000000",
          "⚠️ 不确定decimals→调 onchainos_token_basic_info",
          "⚠️ 代币地址全部小写",
          "⚠️ 主链币(ETH/SOL/BNB)传空字符串''",
          "⚠️ 不确定参数值→先调对应的 supported_chain 工具确认",
        ],

        // ── 常用工作流 ──
        workflows: [
          ["🔍 快速调研", "token_search → token_basic_info → market_price → skill_risk_detect → social_sentiment"],
          ["💱 标准交易", "skill_smart_slippage → skill_trade_pipeline → 用户签名 → gateway_broadcast → gateway_orders"],
          ["📡 信号跟单", "skill_signal_aggregate → skill_risk_detect → skill_trade_pipeline"],
          ["🌉 跨链兑换", "skill_crosschain_swap(mode=intent) → 用户EIP-712签名 → intent_create_order → intent_order_status"],
          ["🏦 DeFi投资", "defi_search_products → defi_product_detail → defi_enter → defi_user_platform_list"],
        ],
      });
    },
  );
}
