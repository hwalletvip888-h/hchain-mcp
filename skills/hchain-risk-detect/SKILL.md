---
name: hchain-risk-detect
description: "综合风险检测：4维评分0-100，貔貅/Bundle/持仓集中度/开发者Rug历史一站式检测。Use this skill when the user says '这个币安全吗', '查一下是不是貔貅', '有没有rug风险', '代币风险评估', '敢不敢买', '安全审计', '风险扫描', wants to check if a token is safe, or needs a security review before trading."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-risk-detect

4 维并行风险扫描 → 0-100 综合评分。LOW=安全 MEDIUM=谨慎 HIGH=强烈不建议 CRITICAL=禁止交易。

## Token Address Resolution

> 同 `hchain-trade-pipeline`。主链币传 `""`，不确认先调 `onchainos_token_search`。

## Execution Flow

### Step 1 — 收集参数

- **chainIndex**: 链ID（字符串）
- **tokenContractAddress**: 代币合约地址（小写）

### Step 2 — 一键风险扫描

```json
// onchainos_skill_risk_detect
{ "chainIndex": "1", "tokenContractAddress": "0x..." }
```

并行调用 4 个 API：
| 维度 | API | 检测内容 |
|------|-----|----------|
| advanced_info | tokenAdvancedInfo | 貔貅/税率/风险等级 |
| cluster_overview | tokenClusterOverview | 持仓集中度/Rug概率 |
| bundle_info | memepumpBundleInfo | 打包(Bundle)交易 |
| dev_info | memepumpTokenDevInfo | 开发者Rug历史 |

### Step 3 — 解读评分

| 分数 | 等级 | 建议 |
|------|------|------|
| 0-20 | LOW | ✅ 风险可控，可以交易 |
| 21-50 | MEDIUM | ⚠️ 谨慎操作 |
| 51-70 | HIGH | 🔴 强烈不建议 |
| 71-100 | CRITICAL | 🚫 禁止交易 |

## Risk Factors (7 项)

| # | 因素 | 最高扣分 | 触发条件 |
|---|------|----------|----------|
| 1 | 貔貅(HoneyPot) | 30 | isHoneypot=true |
| 2 | 风险等级 | 20 | riskLevel=HIGH/CRITICAL |
| 3 | 高税率 | 10 | buyTax/sellTax > 10% |
| 4 | Rug概率 | 15 | rugPullPercent > 25% |
| 5 | 持仓集中 | 15 | clusterConcentration=HIGH |
| 6 | Bundle交易 | 10 | isBundled=true |
| 7 | 开发者历史 | 10 | hasRugHistory=true |

## Edge Cases

- **主链币**: ETH/SOL/BNB 通常评分为 LOW
- **新代币 (<24h)**: 开发者历史为空，不影响评分
- **评分 = 0**: 所有 API 都失败时才可能出现，检查网络

## Next Steps

- LOW/MEDIUM → 进入 `hchain-trade-pipeline`
- HIGH/CRITICAL → 建议放弃，如坚持则调小金额+提高滑点
