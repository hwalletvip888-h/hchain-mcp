---
name: hchain-smart-slippage
description: "智能滑点推荐：基于K线波动率+价格影响，返回推荐/保守/激进三档。Use this skill when the user asks '滑点设多少', '推荐滑点', 'slippage recommendation', '帮我看看滑点', or needs to determine optimal slippage for a swap."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-smart-slippage

基于历史波动率(CV) + 当前报价价格影响 → 智能推荐三档滑点。

## Execution Flow

### 调 onchainos_skill_smart_slippage

```json
{
  "chainIndex": "1",
  "fromTokenAddress": "0x...",
  "toTokenAddress": "",
  "amount": "1000000000000000000"
}
```

### 返回三档

| 档位 | 公式 | 适用场景 |
|------|------|----------|
| conservative | max(recommended×0.5, 0.1%) | 稳定币对、高流动性 |
| recommended | 波动率基础 + 价格影响调整 | **大多数情况** |
| aggressive | min(recommended×2, 15%) | Meme、低流动性 |

### 计算因子

- **波动率 CV**: 取近100根1H K线，计算收盘价变异系数
- **价格影响**: 从报价API获取 priceImpactPercent
- **波动率分档**: ≤1%→0.3% / ≤3%→0.5% / ≤8%→1.0% / ≤15%→2.0% / >15%→3.0%
- **价格影响加成**: >1%→+0.5% / >5%→+1.0% / >10%→+2.0%

## Next Steps

用 recommended 值作为 `onchainos_skill_trade_pipeline` 的 `slippagePercent` 参数。
