/**
 * Help 导航 — Agent 首次连接的"菜单页"
 */
import { readFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toResult } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerHelpTools(server: McpServer, auth: Auth | null): void {

  server.tool("onchainos_help",
    "🧭 链上赚币功能菜单 — 【首次使用务必先调！】返回功能分类+对话示例+斜杠命令+参数规则",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => {
      const { version } = JSON.parse(
        readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
      );
      return toResult({

        // ═══════════════════════════════════════════
        // 1. 名片
        name: "链上赚币",
        version,
        tools: 109,
        chains: "ETH BSC Solana Base Arbitrum Polygon Sui TON Avalanche 等40+",
        engine: "10个专业Agent分工协作 — Orchestrator自动路由",

        // ═══════════════════════════════════════════
        // 2. 功能菜单 (一行一个场景)
        menu: [
          { icon: "💰", scene: "查余额·总资产", tool: "onchainos_balance_*" },
          { icon: "📊", scene: "行情价格·K线走势", tool: "onchainos_market_price / candles" },
          { icon: "🔍", scene: "代币搜索·基本信息", tool: "onchainos_token_search / basic_info" },
          { icon: "🛡️", scene: "风险检测·貔貅·Bundle", tool: "onchainos_skill_risk_detect" },
          { icon: "💱", scene: "DEX兑换·报价·授权", tool: "onchainos_dex_*" },
          { icon: "🌉", scene: "跨链兑换 (Intent/Direct)", tool: "onchainos_skill_crosschain_swap" },
          { icon: "🎯", scene: "限价单·止损单", tool: "onchainos_skill_conditional_order" },
          { icon: "📡", scene: "聪明钱信号·新币扫描", tool: "onchainos_skill_signal_aggregate / scan" },
          { icon: "🏦", scene: "DeFi理财·申购赎回", tool: "onchainos_defi_*" },
          { icon: "📰", scene: "社媒情绪·新闻·KOL", tool: "onchainos_skill_social_narrative" },
          { icon: "⚡", scene: "Gas配置·交易加速", tool: "onchainos_skill_gas_configurator / tx_accelerator" },
          { icon: "📋", scene: "交易历史·持仓明细", tool: "onchainos_transaction_* / balance_*" },
        ],

        // ═══════════════════════════════════════════
        // 3. 直接对话 (用户说→自动路由)
        examples: [
          "我的钱包有多少钱",
          "ETH现在什么价",
          "这个币安全吗 (0x...)",
          "帮我把100 USDT换成ETH",
          "扫一下最近新发的币",
          "聪明钱在买什么",
          "有什么DeFi理财",
          "ETH到3000通知我",
        ],

        // ═══════════════════════════════════════════
        // 4. 用户可以输入的斜杠命令 (自然语言也能触发同样效果)
        commands: [
          "/research 代币地址 — 深度调研",
          "/trade 卖出 买入 数量 — 完整交易",
          "/scan new|hot|smart — 全链扫描",
          "/monitor — 持仓总览",
          "/audit 代币地址 — 安全审计",
          "/dispatch 任务描述 — 智能派发",
        ],
        hint: "以上命令也可以用自然语言替代，如'扫一下新币'等价于 /scan new",

        // ═══════════════════════════════════════════
        // 5. 重要规则
        rules: [
          "chainIndex 是字符串: '1'不是1",
          "金额含decimals: USDT(6位)=1000000, ETH(18位)=1000000000000000000",
          "主链币地址传空字符串 ''",
          "写入操作(✍️)需用户签名，Agent只构建calldata不代签",
          "不确定参数→先调对应的 supported_chain",
        ],

        // ═══════════════════════════════════════════
        // 6. 内部Agent团队 (自动协作, 用户无需手动调用)
        internalAgents: [
          { name: "orchestrator", does: "接收用户意图→分解任务→路由到专业Agent→汇总", model: "Opus" },
          { name: "market-analyst", does: "行情·K线·代币信息", model: "Sonnet" },
          { name: "risk-assessor", does: "风险评分·安全审查", model: "Opus" },
          { name: "trade-executor", does: "交易构建·广播·追踪", model: "Sonnet" },
          { name: "portfolio-tracker", does: "余额·持仓·历史", model: "Haiku" },
          { name: "signal-scout", does: "信号·聪明钱·新币", model: "Sonnet" },
          { name: "defi-strategist", does: "DeFi理财·支付", model: "Sonnet" },
          { name: "social-analyst", does: "社媒·新闻·情绪", model: "Haiku" },
        ],
      });
    },
  );
}
