---
name: hchain-social-narrative
description: "社媒叙事深度分析：情绪+热度+KOL+新闻+排行，5维并行聚合。Use this skill when the user says '这个币社区怎么看', '查一下社媒热度', '舆论分析', '大家都在讨论什么', 'social sentiment', 'vibe check', wants to gauge market sentiment, or analyze social media narrative around a token."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-social-narrative

5 维并行聚合：情绪 + 热度 + KOL + 新闻 + 排行。

## Execution Flow

### 调 onchainos_skill_social_narrative

```json
{
  "chainIndex": "1",
  "tokenContractAddress": "0x...",
  "tokenSymbol": "PEPE",
  "timeFrame": "3"
}
```

| timeFrame | 范围 |
|-----------|------|
| `"1"` | 24h |
| `"2"` | 3天 |
| `"3"` | 7天（默认） |
| `"4"` | 1月 |
| `"5"` | 3月 |

### 5 维并行查询

| # | 维度 | 数据源 | 关键指标 |
|---|------|--------|----------|
| 1 | 情绪 | socialSentimentSymbol | bullish/bearish/neutral % |
| 2 | 热度 | socialVibeTimeline | vibeScore |
| 3 | 新闻 | socialNewsBySymbol | 最新5条 |
| 4 | KOL | socialVibeTopKols | top 5 互动KOL |
| 5 | 排行 | socialSentimentRanking | 排名位置 |

### 情绪解读

| 条件 | 标签 |
|------|------|
| bullish > bearish×1.5 | 强烈看涨 |
| bullish > bearish | 看涨 |
| bearish > bullish×1.5 | 强烈看跌 |
| bearish > bullish | 看跌 |
| bullish ≈ bearish | 中性 |

## Next Steps

- 情绪看涨+热度高 → `hchain-market-overview` 确认行情
- 新闻多+讨论热 → 深入看 `onchainos_social_news_detail`
- 结合风险评估 → `hchain-risk-detect`
