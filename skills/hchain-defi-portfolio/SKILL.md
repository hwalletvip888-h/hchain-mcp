---
name: hchain-defi-portfolio
description: "DeFi持仓分析：全协议持仓总览+按平台细分+APY汇总。中文触发: 我的DeFi持仓, 理财持仓, 存款分布, 收益总览, 查理财, DeFi portfolio。English: my DeFi positions, yield portfolio, staking overview, farming dashboard, DeFi holdings, show my earn positions."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.4.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-defi-portfolio

Aggregated DeFi position view: all protocols → per-platform breakdown → APY summary.

## Execution Flow

### Call onchainos_skill_defi_portfolio

```json
{
  "address": "0x...",
  "chains": "1,501,56"
}
```

### 3 Steps

| # | Step | API | Fatal? |
|---|------|-----|--------|
| 1 | Platform List | defiApi.userPlatformList | Yes |
| 2 | Platform Details | defiApi.userPlatformDetail (parallel, chunked 5) | No (per-platform) |
| 3 | Aggregate | Inline rollup | — |

## Parameter Table

| Param | Required | Description |
|-------|----------|-------------|
| address | Yes | Your wallet address |
| chains | Yes | Comma-separated chain IDs. e.g. '1,501,56' or 'ethereum,solana,bsc' |

## Return Value

| Field | Description |
|-------|-------------|
| defiPortfolio.totalValueUsd | Total DeFi value across all protocols |
| defiPortfolio.platformCount | Number of protocols with positions |
| defiPortfolio.investmentCount | Total individual investments |
| defiPortfolio.platforms[] | Per-platform: platformName, chainIndex, totalValueUsd, investmentCount |
| defiPortfolio.topInvestments[] | Top 5 investments by value |
| defiPortfolio.apySummary | avgApy, maxApy, minApy across all investments |

## Next Steps

1. **View platform detail** — `onchainos_defi_position_detail` for specific platform
2. **Collect rewards** — `onchainos_defi_collect` if rewards available
3. **Find better yields** — `hchain-defi-yield-aggregate` to compare alternatives

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No DeFi positions | Returns empty portfolio with "empty" status |
| Multi-chain wallet | All chains queried; chain mismatch on address may cause zero results |
| Some platforms fail | Skip failed, aggregate from available (partial results OK) |
| No APY data | apySummary returns empty object |
