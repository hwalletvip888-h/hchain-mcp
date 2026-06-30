---
name: hchain-portfolio-health
description: "钱包健康诊断：持仓分析→风险评估→PnL审计→综合健康评分。中文触发: 钱包健康, 持仓诊断, 风险评估, 资产体检, 仓位检查, 持仓健康度。English: portfolio health check, wallet audit, risk assessment, position analysis, is my portfolio healthy, wallet health score."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.4.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-portfolio-health

Comprehensive wallet health diagnostic: balances → risk scanning → PnL audit → 0-100 score.

## Execution Flow

### Call onchainos_skill_portfolio_health

```json
{
  "address": "0x...",
  "chains": "1,501,56"
}
```

### 5 Steps

| # | Step | API | Fatal? |
|---|------|-----|--------|
| 1 | Balances | balanceApi.allTokenBalances | Yes |
| 2 | Filter | Inline (dust < $1 dropped) | — |
| 3 | Risk Check | marketApi.tokenAdvancedInfo (parallel, chunked 5, top 20) | No (per-token) |
| 4 | PnL Overview | marketApi.portfolioOverview (1M) | No |
| 5 | Score | Inline 4-factor scoring | — |

## Health Score Methodology (0-100)

| Factor | Max Score | Logic |
|--------|:---------:|-------|
| Concentration | 30 | Top token >80%=0, >50%=10, >30%=20, else 30 |
| Risk Exposure | 30 | Start at 30. -15/honeypot, -10/HIGH risk, -5/MEDIUM risk, -5/high tax. Floor 0 |
| PnL | 25 | PnL>0 & winRate>50%=25, PnL>0=20, winRate>50%=15, else gradation |
| Diversity | 15 | 3+ chains=15, 2 chains=10, 1 chain=5 |

## Health Levels

| Score | Level | Description |
|:-----:|-------|-------------|
| 80-100 | EXCELLENT | Healthy holdings, controlled risk, good profitability |
| 60-79 | GOOD | Overall healthy, minor optimization opportunities |
| 40-59 | FAIR | Some risk or concentration issues present |
| 20-39 | POOR | Immediate attention needed for risk exposure |
| 0-19 | CRITICAL | High-risk assets dominate, strong rebalancing recommended |

## Parameter Table

| Param | Required | Description |
|-------|----------|-------------|
| address | Yes | Your wallet address |
| chains | Yes | Comma-separated chain IDs. e.g. '1,501,56' |

## Return Value

| Field | Description |
|-------|-------------|
| healthReport.totalScore | 0-100 composite health score |
| healthReport.healthLevel | EXCELLENT/GOOD/FAIR/POOR/CRITICAL |
| healthReport.levelDescription | Human-readable level explanation |
| healthReport.breakdown | Sub-scores: concentrationScore, riskExposureScore, pnlScore, diversityScore |
| healthReport.portfolioStats | totalValueUsd, tokenCount, dustTokenCount, chainCount |
| healthReport.riskFactors | Top risky tokens with impact percentages |
| healthReport.concentration | Top token symbol and percentage |
| healthReport.pnlSummary | Realized/unrealized PnL, win rate, total transactions |
| healthReport.recommendations | Actionable improvement suggestions |

## Next Steps

- **Risky tokens** → `hchain-risk-detect` for deep analysis
- **Full balances** → `onchainos_balance_all_tokens` for complete view
- **Rebalance** → `hchain-trade-pipeline` to adjust positions
- **Earn yield** → `hchain-defi-yield-aggregate` to find opportunities

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty wallet | Returns EMPTY level with appropriate message |
| All dust (<$1) | Treated as effectively empty |
| PnL unavailable | Defaults to neutral score (15) for PnL factor |
| Some risk checks fail | Token marked as UNKNOWN risk, no deduction |
| Single chain | Diversity score = 5 (minimum) |
