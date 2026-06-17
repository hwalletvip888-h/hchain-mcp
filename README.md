# 🚀 hchain-skills

[![npm version](https://img.shields.io/npm/v/hchain-skills?style=flat-square)](https://www.npmjs.com/package/hchain-skills)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/hwalletvip888-h/hchain-skills/ci.yml?style=flat-square)](https://github.com/hwalletvip888-h/hchain-skills/actions)
[![License](https://img.shields.io/npm/l/hchain-skills?style=flat-square)](LICENSE)

> **AI 原生多链交易 MCP Server** — 109 个工具，让 AI Agent 拥有链上超能力

---

## ✨ 为什么选择 hchain-skills？

| 痛点 | hchain-skills 解法 |
|------|------|
| 😤 多个链多个 RPC，切来切去 | 一个 MCP 搞定 40+ 链 |
| 🔒 交易前不知道代币有没有坑 | 4 维风险评分，貔貅/Bundle/老鼠仓自动检测 |
| 🤯 跨链兑换要操作好几步 | `onchainos_skill_crosschain_swap` 一步完成 |
| 💸 Gas 设置不当多花钱 | EIP-1559 智能配置，3 档可选 |
| 📉 错过买卖时机 | WS 实时价格预警，条件触发自动提醒 |

---

## ⚡ 30 秒开始

```bash
# 1. 安装
npm install -g hchain-skills

# 2. 获取 API Key → https://web3.okx.com/onchainos/dev-portal

# 3. 配置 Claude Code（复制到 ~/.claude/claude.json 或项目 .claude/settings.json）
```

```json
{
  "mcpServers": {
    "hchain-skills": {
      "command": "npx",
      "args": ["hchain-skills"],
      "env": {
        "OKX_API_KEY": "你的API_KEY",
        "OKX_SECRET_KEY": "你的SECRET_KEY",
        "OKX_PASSPHRASE": "你的PASSPHRASE"
      }
    }
  }
}
```

```bash
# 4. 重启 Claude Code，说一句试试：
"看看我 ETH 钱包里有什么币"
"ETH 现在多少钱"
"调研一下 0xABC 这个代币安不安全"
```

---

## 🎯 5 分钟上手

| 时间 | 做什么 | 对 Agent 说 |
|:---:|------|------|
| 第 1 分钟 | 查余额 | "我的钱包有多少钱" |
| 第 2 分钟 | 看行情 | "ETH、BTC、SOL 现在什么价" |
| 第 3 分钟 | 调研代币 | "一站式分析这个代币 0x..." |
| 第 4 分钟 | 安全审查 | "这个币安全吗，有没有 Rug 风险" |
| 第 5 分钟 | 执行交易 | "帮我把 100 USDT 换成 ETH" |

---

## 🧰 功能地图

### 💰 余额 & 资产
| 工具 | 做什么 |
|------|------|
| `onchainos_balance_total_value` | 总资产 USD 估值 |
| `onchainos_balance_all_tokens` | 单链全部持仓 |
| `onchainos_balance_specific_token` | 精确查某个币 |

### 🔍 行情 & 代币
| 工具 | 做什么 |
|------|------|
| `onchainos_market_price` | 实时价格（批量） |
| `onchainos_market_candles` | K 线 OHLCV |
| `onchainos_token_search` | 跨链搜索代币 |
| `onchainos_token_hot` | 热门榜单 |

### ⚠️ 安全 & 风控
| 工具 | 做什么 |
|------|------|
| `onchainos_skill_risk_detect` | 4 维风险 0-100 评分 |
| `onchainos_token_advanced_info` | 貔貅/黑名单/权限分析 |
| `onchainos_memepump_bundle_info` | Bundle/老鼠仓检测 |
| `onchainos_token_cluster_overview` | 持仓集群分析 |

### 🔄 交易 & 兑换
| 工具 | 做什么 |
|------|------|
| `onchainos_skill_trade_pipeline` | 一站式兑换 |
| `onchainos_skill_crosschain_swap` | 跨链原子交换 |
| `onchainos_skill_conditional_order` | 限价单/止损单 |
| `onchainos_skill_batch_swap` | 批量兑换 |

### 📡 信号 & 聪明钱
| 工具 | 做什么 |
|------|------|
| `onchainos_skill_signal_aggregate` | 信号+自动风险过滤 |
| `onchainos_leaderboard_list` | 聪明钱排行榜 |
| `onchainos_address_tracker_trades` | 追踪地址交易 |

### 🏦 DeFi & 支付
| 工具 | 做什么 |
|------|------|
| `onchainos_defi_search_products` | 搜索投资品 |
| `onchainos_defi_enter` | 申购/存款 |
| `onchainos_payment_create` | A2A 支付 |

---

## 🏗️ 链上赚币

hchain-skills 内置 10 个专业 Agent，自动协作处理复杂任务：

```
你的意图 → Orchestrator
              ├── market-analyst   (行情分析)
              ├── risk-assessor    (风控评估)
              ├── trade-executor   (交易执行)
              ├── portfolio-tracker(资产追踪)
              ├── signal-scout     (信号侦察)
              ├── defi-strategist  (DeFi策略)
              └── social-analyst   (社媒分析)
```

只需自然语言描述需求，Orchestrator 自动分解、路由、汇总。

---

## 🚀 运行方式

### stdio 模式（Claude Code 集成）
```bash
hchain-skills
```

### HTTP 模式（远程 Agent / 自定义客户端）
```bash
hchain-skills start:http
# MCP 端点:  POST http://127.0.0.1:3000/mcp
# 健康检查:  GET  http://127.0.0.1:3000/health
```

### Docker
```bash
docker build -t hchain-skills .
docker run --rm -e OKX_API_KEY=xxx -e OKX_SECRET_KEY=xxx -e OKX_PASSPHRASE=xxx hchain-skills
```

---

## 🆘 常见问题

### API Key 哪里获取？
→ [OKX OnchainOS 开发者门户](https://web3.okx.com/onchainos/dev-portal)，免费注册即可获取。

### 报 AUTH_ERROR？
1. 检查 `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` 三个环境变量是否都已设置
2. 确认 API Key 未被吊销，到开发者门户重新生成
3. 确认系统时间与标准时间偏差在 30 秒以内（签名时间戳敏感）

### 报 RATE_LIMITED？
请求频率过高。等待 1-5 秒后重试，或降低并发查询数量。

### 支持哪些链？
Ethereum、BSC、Polygon、Arbitrum、Base、Optimism、Solana、Sui、TON、Avalanche、Fantom 等 40+ 链。具体调 `onchainos_balance_supported_chain` 查看。

### 交易需要签名吗？
所有写入链上的操作（兑换、授权、广播）都需要**用户离线签名**。hchain-skills 只构建 calldata，绝不代签。

### 如何验证 MCP 连接成功？
在 Claude Code 中说 "调用 onchainos_help 看看有哪些功能"，如果返回工具列表则连接成功。

---

## 📦 模块总览（109 tools）

| 模块 | 数量 | 内容 |
|------|:---:|------|
| 🔍 Market | 45 | 价格·K线·代币·信号·社媒 |
| 🏦 DeFi | 14 | 投资品·申购·赎回·持仓 |
| 💱 Trade | 8 | 报价·授权·兑换·历史 |
| 🎯 Intent | 6 | 意图订单·拍卖 |
| 🌉 Gateway | 6 | Gas·模拟·广播 |
| 💳 Payments | 5 | A2A/x402 支付 |
| 💰 Balance | 4 | 多链余额 |
| 📡 WS | 4 | WebSocket 实时推送 |
| 🧠 Skills | 13 | 组合技能（交易管线/风控/跨链等） |
| 📜 History | 3 | 交易历史·详情 |
| ❓ Help | 1 | 交互式导航 |

---

## 🔗 链接

- [OKX OnchainOS 文档](https://web3.okx.com/onchainos/docs)
- [MCP 协议规范](https://modelcontextprotocol.io)
- [GitHub Issues](https://github.com/hwalletvip888-h/hchain-skills/issues)

---

MIT · Made with ❤️ for AI Agents
