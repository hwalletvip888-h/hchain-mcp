---
name: hchain-batch-swap
description: "批量兑换：一次配置1-10笔交易，依次报价→授权→构建，返回每笔calldata。Use this skill when the user says '帮我换三笔', '批量兑换', '一次换多个币', '分散买入', '同时买几个', wants to execute multiple swaps at once, or spread a large order across tokens."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-batch-swap

1-10 笔交易，顺序执行，每笔独立报价→授权→构建。

## Execution Flow

### 调 onchainos_skill_batch_swap

```json
{
  "chainIndex": "1",
  "swaps": [
    {"fromTokenAddress": "0x...", "toTokenAddress": "0x...", "amount": "1000000", "slippagePercent": "1.0"},
    {"fromTokenAddress": "0x...", "toTokenAddress": "0x...", "amount": "2000000", "slippagePercent": "1.5"}
  ],
  "userWalletAddress": "0x...",
  "autoExecute": false
}
```

### 执行模式

| autoExecute | 行为 |
|-------------|------|
| `false` (推荐) | 逐笔报价→授权→构建，每笔返回 calldata，失败即停 |
| `true` | 同上但不因失败中断，适合批量试单 |

### 返回

| 字段 | 说明 |
|------|------|
| batchInfo.total | 总笔数 |
| batchInfo.succeeded | 成功数 |
| batchInfo.failed | 失败数 |
| steps[].data.txTo | 每笔的 to 地址 |
| steps[].data.dataLen | calldata 长度 |

## Constraints

- 最少1笔，最多10笔
- 同一条链（chainIndex 统一）
- 每笔可用独立滑点
- 非 autoExecute 模式失败即停止后续

## Next Steps

- 每笔 calldata 逐一签名 → `onchainos_gateway_broadcast`
- 追踪 → `onchainos_gateway_orders`
