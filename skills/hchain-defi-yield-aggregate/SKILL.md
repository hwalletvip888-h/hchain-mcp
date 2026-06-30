---
name: hchain-defi-yield-aggregate
description: "DeFi收益聚合器：搜索→并发详情→排名，找到最高APY。中文触发: 哪个收益高, 找最高APY, 对比收益, 收益排行, 理财推荐, 存哪里收益高。English: best yield, highest APY, compare DeFi rates, yield ranking, where to earn, find best returns."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.4.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-defi-yield-aggregate

Find the best DeFi yields: search → parallel detail enrichment → composite score ranking.

## Execution Flow

### Call onchainos_skill_defi_yield_aggregate

```json
{
  "chainIndex": "1",
  "tokenKeyword": "USDC",
  "platformKeyword": "Aave",
  "productGroup": "SINGLE_EARN"
}
```

### 4 Steps

| # | Step | API | Fatal? |
|---|------|-----|--------|
| 1 | Search | defiApi.searchProducts | Yes |
| 2 | Details | defiApi.productDetail (parallel, chunked 5) | No (per-product) |
| 3 | Rate Charts | defiApi.rateChart for top 3 (parallel) | No (per-chart) |
| 4 | Score & Rank | Inline scoring algorithm | — |

## Scoring Methodology (0-100)

| Factor | Max Score | Logic |
|--------|:---------:|-------|
| APY | 50 | Normalized against best APY in results |
| TVL | 20 | Normalized against best TVL (higher = safer) |
| Platform | 15 | 15=major (Aave/Compound/Lido), 10=known, 5=unknown |
| Rate Trend | 10 | 10=rising APY, 5=stable, 0=declining |
| Investable | 5 | 5 if isInvestable=true, 0 if false |

## Risk Flags

Products are flagged with warnings for:
- **High fee rate** (>5%)
- **Low TVL** (<$10,000)
- **Inactive status** (not "active")
- **Not investable** (isInvestable=false)

## Parameter Table

| Param | Required | Description |
|-------|----------|-------------|
| chainIndex | Yes | Chain ID. '1'=ETH '56'=BSC '501'=Solana |
| tokenKeyword | No | Token to find yields for (e.g. 'USDC'). Omit for all |
| platformKeyword | No | Protocol filter (e.g. 'Aave'). Omit for all |
| productGroup | No | SINGLE_EARN (default), DEX_POOL, LENDING |

## Return Value

| Field | Description |
|-------|-------------|
| rankedProducts[] | Ranked list with compositeScore, scoreBreakdown, riskFlags, rateTrend |
| yieldSummary | totalFound, analyzed, avgApy, bestApy, bestProduct |

## Next Steps

1. **View details** — `onchainos_defi_product_detail` for the top pick
2. **Invest now** — `hchain-defi-invest` with the top investmentId
3. **Check APY trend** — `onchainos_defi_rate_chart` with MONTH range
4. **Repeat** — try other chains or product groups

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No products found | Returns empty with "empty" status |
| Some details fail | Skip failed, rank from available (partial results OK) |
| No rate chart data | Trend score defaults to neutral (5) |
| All details fail | Returns "failed" — cannot rank without data |
