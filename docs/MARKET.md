# Market API — 知识总结

> 来源: web3.okx.com 官方 API 参考 · 对接日期 2026-06-14

---

## 定价等级

| 等级 | 月度免费额度 | 超出单价 | 端点数 |
|------|:---------:|:------:|:-----:|
| Free | 无限 | $0 | 8 |
| Basic | 100K | $0.0001/次 | 10 |
| Premium | 100K | $0.0005/次 | 27 |

---

## 模块速查 (45 endpoints)

### 行情价格 (5) — Basic
| # | 端点 | 方法 | 说明 |
|---|------|------|------|
| 1 | `/market/supported/chain?chainIndex=` | GET | 支持链 (Free) |
| 2 | `/market/price` | POST | 实时价格, body数组 |
| 3 | `/market/candles` | GET | K线 OHLCV, bar=1m-3M |
| 4 | `/market/historical-candles` | GET | 历史K线 (Premium) |
| 5 | `/market/trades` | GET | 交易活动, tagFilter 1-9 |

### 综合币价 (2) — Free
| # | 端点 | 说明 |
|---|------|------|
| 6 | `/index/current-price` | POST 批量 |
| 7 | `/index/historical-price` | GET 分页 |

### 代币 API (8)
| # | 端点 | 等级 | 说明 |
|---|------|:--:|------|
| 8 | `/market/token/search` | Basic | 跨链搜索 |
| 9 | `/market/token/basic-info` | Basic | 批量元数据 POST |
| 10 | `/market/token/top-liquidity` | Basic | 前5流动性池 |
| 11 | `/market/price-info` | Premium | 批量交易信息 POST |
| 12 | `/market/token/advanced-info` | Premium | 安全分析(貔貅/狙击手) |
| 13 | `/market/token/hot-token` | Basic | Trending/Xmentioned |
| 14 | `/market/token/holder` | Premium | 前100持有人+PnL |
| 15 | `/market/token/top-trader` | Premium | 前100盈利地址 |

### 聚类 BubbleMap (4)
| # | 端点 | 等级 | 说明 |
|---|------|:--:|------|
| 16 | `/token/cluster/supported/chain` | Free | 支持链 |
| 17 | `/token/cluster/overview` | Premium | 集中度/rugPull% |
| 18 | `/token/cluster/list` | Premium | top100集群列表 |
| 19 | `/token/cluster/top-holders` | Premium | 前10/50/100持仓 |

### Memepump 扫链 (7)
| # | 端点 | 等级 | 说明 |
|---|------|:--:|------|
| 20 | `/memepump/supported/chainsProtocol` | Free | 链+协议 |
| 21 | `/memepump/tokenList` | Premium | 最多30条, 30+筛选维度 |
| 22 | `/memepump/tokenDetails` | Premium | 单币详情 |
| 23 | `/memepump/tokenDevInfo` | Premium | 开发者历史 |
| 24 | `/memepump/similarToken` | Basic | 相似代币 |
| 25 | `/memepump/tokenBundleInfo` | Premium | 捆绑检测 |
| 26 | `/memepump/apedWallet` | Premium | 同车钱包(最多50) |

### 信号 Signal (4)
| # | 端点 | 等级 | 说明 |
|---|------|:--:|------|
| 27 | `/signal/supported/chain` | Free | 支持链 |
| 28 | `/signal/list` | Premium | 信号列表 POST |
| 29 | `/leaderboard/supported/chain` | Free | 聪明钱榜单链 |
| 30 | `/leaderboard/list` | Premium | 聪明钱排行榜 |

### Portfolio 地址分析 (6)
| # | 端点 | 等级 | 说明 |
|---|------|:--:|------|
| 31 | `/portfolio/supported/chain` | Free | 支持链 |
| 32 | `/portfolio/overview` | Premium | 地址画像(PnL/胜率) |
| 33 | `/portfolio/recent-pnl` | Premium | 近期收益列表 |
| 34 | `/portfolio/token/latest-pnl` | Basic | 单代币最新收益 |
| 35 | `/portfolio/dex-history` | Basic | DEX交易历史 |
| 36 | `/address-tracker/trades` | Premium | 聪明钱/KOL追踪 |

### 社媒 Social (9) — Premium
| # | 端点 | 说明 |
|---|------|------|
| 37 | `/social/news/latest` | 最新新闻 |
| 38 | `/social/news/by-symbol` | 按代币查新闻 |
| 39 | `/social/news/search` | 全文搜索 |
| 40 | `/social/news/detail` | 文章详情 |
| 41 | `/social/news/platforms` | 新闻平台列表 |
| 42 | `/social/sentiment/symbol` | 情绪指标 |
| 43 | `/social/sentiment/ranking` | 情绪热度排行 |
| 44 | `/social/vibe/timeline` | Vibe时间线+KOL |
| 45 | `/social/vibe/top-kols` | 热门KOL列表 |

---

## x402 支付

Market API 调用超出免费额度后走 x402 协议：
- 请求 → 402 + PAYMENT-REQUIRED → EIP-3009 签名 → PAYMENT-SIGNATURE 头重试
- X Layer (eip155:196), USDG/USDT0 支付

## 核心参数规则

- chainIndex: 全部 String 类型
- POST 端点: body 为 JSON 数组
- tagFilter: 1=KOL 2=Dev 3=聪明钱 4=鲸鱼 5=新钱包 6=老鼠仓 7=狙击手 8=疑似钓鱼 9=Bundle
- timeFrame: 1=1D/1h 2=3D/4h 3=7D/24h 4=1M 5=3M (各端点有差异)
