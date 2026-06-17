---
name: hchain-market-overview
description: "市场全景速览：价格+K线+安全+情绪，一站式了解代币。Use this skill when the user says '看看这个币怎么样', '全面分析', '了解这个代币', '查一下行情', '这个币什么情况', wants a quick overview of a token, or needs price+charts+security+sentiment all at once."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-market-overview

4 维一站式速览：价格 + K线 + 安全 + 情绪。

## Execution Flow

### 调 onchainos_skill_market_overview

```json
{
  "chainIndex": "1",
  "tokenContractAddress": "0x...",
  "tokenSymbol": "ETH"
}
```

### 4 个维度（前3必查，第4按需）

| # | 维 | 数据源 | 返回 |
|---|-----|--------|------|
| 1 | 价格 | marketApi.price | 最新 USD 价格 |
| 2 | K线 | marketApi.candles (1H×24) | 24小时走势 |
| 3 | 安全 | tokenAdvancedInfo | 风险等级/貔貅 |
| 4 | 情绪 | socialSentimentSymbol | 看涨/看跌比例（需传 tokenSymbol） |

### tokenSymbol 说明

- 传了 → 额外返回社媒情绪分析
- 不传 → 跳过第4维，只返回价格+K线+安全

## 返回解读

| 维度状态 | 含义 |
|----------|------|
| ok | 数据正常 |
| error | 该维度不可用（不影响其他维度） |
| skipped | 因缺少参数跳过（如无 symbol 跳过情绪） |

## Next Steps

- 安全存疑 → `hchain-risk-detect` 深度扫描
- 决定交易 → `hchain-trade-pipeline`
- 关注热度 → `hchain-social-narrative` 社媒全景
