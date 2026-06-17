---
name: hchain-signal-aggregate
description: "信号聚合：获取聪明钱/KOL/鲸鱼买入信号 + 自动批量风险过滤，只返回安全信号。Use this skill when the user says '聪明钱在买什么', '有什么信号', '跟单信号', '看看KOL买了什么', '扫描买入信号', or wants to discover trading opportunities from smart money."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-signal-aggregate

信号获取 → 去重 → 批量风险过滤 → 仅返回安全信号。

## Execution Flow

### 调 onchainos_skill_signal_aggregate

```json
{
  "chainIndex": "1",
  "walletType": "1,2,3",
  "minAmountUsd": "1000",
  "limit": "10"
}
```

| 参数 | 说明 |
|------|------|
| chainIndex | 链ID |
| walletType | `1`=聪明钱 `2`=KOL `3`=鲸鱼，逗号分隔 |
| minAmountUsd | 最小交易金额(USD)，过滤小额噪音 |
| limit | 返回条数，默认10，最大20 |

### 处理流程

1. **拉信号**: 拉取 limit×3 条原始信号
2. **去重**: 按 chainIndex+tokenContractAddress 去重
3. **批量风控**: 并发5个一组查 `tokenAdvancedInfo`
4. **过滤**: 剔除貔貅(isHoneypot) + HIGH/CRITICAL 风险等级
5. **排序**: 保留前 limitNum 条

### 返回字段

| 字段 | 说明 |
|------|------|
| tokenSymbol | 代币符号 |
| tokenContractAddress | 合约地址 |
| walletAddress | 信号来源钱包 |
| walletType | 聪明钱/KOL/鲸鱼 |
| amountUsd | 交易金额(USD) |
| riskContext | 风险等级/税率（如有） |

## Next Steps

- 对感兴趣的信号 → `hchain-risk-detect` 深度分析
- 确认安全 → `hchain-trade-pipeline` 跟单
