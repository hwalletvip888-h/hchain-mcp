---
name: hchain-gas-configurator
description: "EIP-1559 Gas精细配置：当前baseFee+三档推荐(slow/average/fast)+成本估算，仅EVM链。Use this skill when the user says 'Gas多少', '帮我设置gas', 'priority fee调多少', 'EIP-1559', 'gas费太贵', '自定义gas参数', wants to check gas prices, or needs fine-tuned gas configuration."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-gas-configurator

三档 EIP-1559 Gas 推荐 + 成本估算。

## Supported Chains

仅 EVM：ETH(1) BSC(56) Polygon(137) Base(8453) Arbitrum(42161) Optimism(10)

## Execution Flow

### 调 onchainos_skill_gas_configurator

```json
{
  "chainIndex": "1",
  "gasLevel": "average",
  "txValue": "0.1"
}
```

### 返回三档

| 等级 | maxPriorityFee | maxFeePerGas | 确认速度 | 适用 |
|------|---------------|--------------|----------|------|
| slow | 低 | 低 | 慢 | 非紧急 |
| average | 中 | 中 | 正常 | **大多数** |
| fast | 高 | 高 | 优先 | 抢跑/Meme |

### EIP-1559 参数说明

```
maxPriorityFeePerGas = 小费（给矿工）
maxFeePerGas         = 总Gas费上限
实际支付 = min(maxFeePerGas, baseFee + maxPriorityFeePerGas)
```

### 成本估算

```
Gas Limit = 65000 (ERC20兑换默认)
估算费用 = maxFeePerGas × 65000 Gwei
```

传 `txValue` 可获取精确估算。

## 当前网络状态

| 字段 | 说明 |
|------|------|
| baseFee | 基础费 |
| gasUsedRatio | 区块使用率 |
| congestion | 拥堵程度 |

## Next Steps

用推荐等级作为 `hchain-trade-pipeline` 的 `gasLevel` 参数。
