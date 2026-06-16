# hchain-skills — Agent 操作指南

> 版本 2.2 · 专属 Agent 的链上全功能 MCP · 109 tools（含 13 个组合技能），超越官方 OnchainOS

---

## 🧭 用户意图 → 工具映射

当用户提出以下需求时，优先选择对应工具：

### 💰 余额/资产

| 用户说 | 调什么 |
|--------|--------|
| "查一下我的钱包有多少钱" | `onchainos_balance_total_value` — 总资产 USD 估值 |
| "看看我钱包里都有什么币" | `onchainos_balance_all_tokens` — 代币持仓明细 |
| "查一下我某个币有多少" | `onchainos_balance_specific_token` — 批量查指定代币余额 |
| "看看链上余额" | 先调 `onchainos_balance_supported_chain` 确认可用链 |

### 🔍 行情/代币信息

| 用户说 | 调什么 |
|--------|--------|
| "ETH 现在多少钱" | `onchainos_market_price` — 批量查最新价 |
| "一站式了解这个币" | `onchainos_skill_market_overview` — **市场全景速览(价格+K线+安全+情绪)** |
| "看 K 线/走势图" | `onchainos_market_candles` — K 线 OHLCV |
| "查这个币的信息" | `onchainos_token_basic_info` — 代币基础信息 |
| "搜一下这个代币" | `onchainos_token_search` — 跨链搜索 |
| "这个币的流动性怎么样" | `onchainos_token_top_liquidity` — 前 5 流动性池 |
| "热门代币有哪些" | `onchainos_token_hot` — 热门榜单 |
| "综合币价(加权均价)" | `onchainos_index_current_price` — 多数据源加权 |
| "查 DEX 交易动态" | `onchainos_market_trades` — 交易活动 |

### ⚠️ 安全/风险检测

| 用户说 | 调什么 |
|--------|--------|
| "这个币安全吗" | `onchainos_skill_risk_detect` — **4 维风险评分 0-100** |
| "查是不是貔貅盘" | `onchainos_token_advanced_info` — 安全分析 |
| "有没有 Rug 风险" | `onchainos_skill_risk_detect` — 含 Bundle 检测+开发者历史 |
| "看持有人分布" | `onchainos_token_holder` / `onchainos_token_cluster_overview` |
| "检测是不是老鼠仓" | `onchainos_memepump_bundle_info` |

### 🔄 交易/兑换

| 用户说 | 调什么 |
|--------|--------|
| "帮我买/卖/兑换 X 到 Y" | `onchainos_skill_trade_pipeline` — **全自动交易管线** |
| "跨链兑换/把A链的X换成B链的Y" | `onchainos_skill_crosschain_swap` — **跨链原子交换** |
| "帮我挂个限价单/止损/到XX价格买卖" | `onchainos_skill_conditional_order` — **条件订单(限价/止损)** |
| "交易卡住了/加速交易/取消交易" | `onchainos_skill_tx_accelerator` — **交易加速器** |
| "批量兑换/一次换多个币/分散买入" | `onchainos_skill_batch_swap` — **批量兑换** |
| "Nonce乱了/帮我查nonce" | `onchainos_skill_nonce_manager` — **Nonce管理器** |
| "监控价格/盯盘/到了提醒我" | `onchainos_skill_price_alert` — **WS价格预警** |
| "Gas多少/自定义Gas/EIP-1559设置" | `onchainos_skill_gas_configurator` — **Gas配置器** |
| "查报价" | `onchainos_dex_quote` — 最优兑换报价 |
| "建议滑点设多少" | `onchainos_skill_smart_slippage` — 智能滑点推荐 |
| "查兑换状态" | `onchainos_dex_swap_history` / `onchainos_gateway_orders` |
| "授权代币" | `onchainos_dex_approve_transaction` |
| "Gas 多少" | `onchainos_gateway_gas_price` |

### 📡 信号/聪明钱

| 用户说 | 调什么 |
|--------|--------|
| "查买入信号/聪明钱在买什么" | `onchainos_skill_signal_aggregate` — **信号+自动风险过滤** |
| "聪明钱排行榜" | `onchainos_leaderboard_list` |
| "追踪某个地址" | `onchainos_address_tracker_trades` |
| "分析这个地址的盈亏" | `onchainos_portfolio_overview` — 地址画像 |

### 🏦 DeFi

| 用户说 | 调什么 |
|--------|--------|
| "有什么 DeFi 理财" | `onchainos_defi_search_products` — 搜索投资品 |
| "这个产品的详情" | `onchainos_defi_product_detail` — 详情(APY/资产/状态) |
| "申购/存款" | `onchainos_defi_enter` — 需先调 prepare_transaction |
| "赎回" | `onchainos_defi_exit` |
| "领奖励" | `onchainos_defi_claim` |
| "我的 DeFi 持仓" | `onchainos_defi_user_platform_list` |

### 🧾 交易历史

| 用户说 | 调什么 |
|--------|--------|
| "查我的交易记录" | `onchainos_transaction_history` |
| "看这笔交易详情" | `onchainos_transaction_detail` |

### 🌐 Meme/扫链

| 用户说 | 调什么 |
|--------|--------|
| "扫一下新发的币" | `onchainos_memepump_token_list` |
| "这个 meme 币的详情" | `onchainos_memepump_token_details` |
| "查找相似代币" | `onchainos_memepump_similar_token` |
| "同车钱包" | `onchainos_memepump_aped_wallet` |

### 📰 社媒

| 用户说 | 调什么 |
|--------|--------|
| "查这个币的新闻" | `onchainos_social_news_by_symbol` |
| "市场情绪怎么样" | `onchainos_social_sentiment_symbol` |
| "这个代币热度如何" | `onchainos_social_vibe_timeline` |
| "社媒全景/大家都在说什么/舆论分析" | `onchainos_skill_social_narrative` — **社媒叙事分析(情绪+热度+KOL+新闻)** |

---

## 📐 参数填写规则（重要！）

### chainIndex — 链ID（全部是字符串，不是数字）

```
'1'     = Ethereum (ETH)
'56'    = BSC
'137'   = Polygon
'501'   = Solana
'8453'  = Base
'42161' = Arbitrum
'10'    = Optimism
'196'   = X Layer
'784'   = Sui
'607'   = TON
'43114' = Avalanche
'250'   = Fantom
```

> ⚠️ **如果不确定可用值，先调对应模块的 `supported_chain` 工具**

### 金额/数量 — 最小单位（含 decimals）

```
公式: amount = 人类可读数量 × 10^decimals

USDT  (decimals=6):  '1' USDT = '1000000'
USDC  (decimals=6):  '1' USDC = '1000000'
ETH   (decimals=18): '1' ETH  = '1000000000000000000'
SOL   (decimals=9):  '1' SOL  = '1000000000'
DAI   (decimals=18): '1' DAI  = '1000000000000000000'
```

> ⚠️ **如果不确定 decimals，先调 `onchainos_token_basic_info` 查 decimals 字段**

### 地址格式

- **全部小写**（OKX API 要求小写地址）
- 主链币地址传**空字符串 `""`** 或 `"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"`
- Solana 原生代币: `"11111111111111111111111111111111"`
- Sui 原生代币: `"0x2::sui::SUI"`
- TON 原生代币: `"EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"`

### tagFilter（地址标签含义）

```
'1'=KOL   '2'=Dev   '3'=聪明钱   '4'=鲸鱼
'5'=新钱包  '6'=老鼠仓  '7'=狙击手  '8'=疑似钓鱼  '9'=Bundle
```

### timeFrame（时间范围）

```
'1'=1D/1h   '2'=3D/4h   '3'=7D/24h   '4'=1M   '5'=3M
```

---

## 🔗 常用工作流

### 代币快速调研
```
onchainos_token_search → 找代币
  → onchainos_token_basic_info → 基础信息
  → onchainos_market_price → 当前价格
  → onchainos_market_candles → K 线走势
  → onchainos_skill_risk_detect → 风险评分
  → onchainos_social_sentiment_symbol → 情绪
```

### 完整交易（Agent 需用户签名）
```
onchainos_skill_trade_pipeline → 报价→授权→构建→模拟
  → 用户签名 calldata（离链操作）
  → onchainos_gateway_broadcast → 广播
  → onchainos_gateway_orders → 追踪状态
```

### 信号筛选
```
onchainos_skill_signal_aggregate → 获取信号+自动过滤高风险
  → onchainos_skill_risk_detect → 进一步分析某代币
  → onchainos_skill_trade_pipeline → 交易
```

### 跨链交换（Intent 模式）
```
onchainos_skill_crosschain_swap(mode=intent) → 跨链报价+signData
  → 用户 EIP-712 签名 signData（离链操作）
  → onchainos_intent_create_order → 提交意图订单
  → onchainos_intent_order_status → 追踪拍卖结算
```

### 跨链交换（Direct 模式）
```
onchainos_skill_crosschain_swap(mode=direct) → 跨链报价+构建交易
  → 用户签名 calldata（离链操作）
  → onchainos_gateway_broadcast → 在源链广播
  → onchainos_gateway_orders → 追踪状态
  → onchainos_transaction_history → 在目标链确认到账
```

---

## ⚠️ 重要约束

| 规则 | 说明 |
|------|------|
| **只读工具** | readOnlyHint=true 的可以安全重复调用。其他会写链上状态 |
| **x402 付费** | Market API 超免费额度后需 x402 支付（需 USDG/USDT0） |
| **WS 推送** | WebSocket 数据通过 stderr 日志输出，标签 `[WS-DATA]` |
| **API Key 范围** | READ 权限足够查询类工具，TRADE 权限需要申购/兑换/广播 |

---

## 📋 工具速查（按模块）

| 模块 | 工具数 | 前缀 | 主要功能 |
|------|:------:|------|----------|
| 行情 | 45 | `onchainos_market_*` / `onchainos_token_*` | 价格/K线/代币/信号/社媒 |
| DeFi | 14 | `onchainos_defi_*` | 投资品/申购/赎回/持仓 |
| 交易 | 8 | `onchainos_dex_*` | 报价/授权/兑换/历史 |
| 意图 | 6 | `onchainos_intent_*` | 意图订单/拍卖 |
| 网关 | 6 | `onchainos_gateway_*` | Gas/模拟/广播 |
| 支付 | 5 | `onchainos_payment_*` | A2A/x402 支付 |
| 余额 | 4 | `onchainos_balance_*` | 多链余额 |
| WS | 4 | `onchainos_ws_*` | WebSocket 连接 |
| 市场全景 | 1 | `onchainos_skill_market_overview` | 价格+K线+安全+情绪一站式 |
| 历史 | 3 | `onchainos_tx_*` / `onchainos_transaction_*` | 交易历史 |
| Skill | 9 | `onchainos_skill_*` | 组合技能（跨链/条件单/加速/社媒叙事） |
