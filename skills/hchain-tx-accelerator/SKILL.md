---
name: hchain-tx-accelerator
description: "交易加速器：诊断pending交易+推荐Gas倍数，指导RBF加速或取消卡住的交易。Use this skill when the user says '交易卡住了', '一直pending', '帮我加速', '取消这笔交易', 'stuck transaction', 'speed up tx', or needs to fix a stuck pending transaction."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-tx-accelerator

诊断 → 推荐Gas → 指导加速/取消。

## Execution Flow

### 调 onchainos_skill_tx_accelerator

```json
{
  "chainIndex": "1",
  "txHash": "0x...",
  "userWalletAddress": "0x...",
  "action": "auto"
}
```

| action | 行为 |
|--------|------|
| `auto` | 自动诊断并推荐（默认） |
| `speed_up` | 强制加速（提高Gas替换） |
| `cancel` | 强制取消（0-value自转） |

### 返回 3 步

1. **tx_detail**: 查交易状态
2. **gas_price**: 查当前网络 Gas
3. **diagnosis**: 判断是否 pending / 已确认

## 加速方案

若 pending → 推荐替换交易参数：

| 字段 | 加速(speed_up) | 取消(cancel) |
|------|---------------|--------------|
| to | 原交易 to | 自己地址 |
| value | 原交易 value | `"0"` |
| data | 原交易 calldata | `"0x"` |
| nonce | 原交易 nonce | 原交易 nonce |
| gasPrice | 当前×1.3 | 当前×1.3 |

## Gas 推荐

```
当前网络 Gas × 130% → 确保矿工优先打包
```

EVM 链可用 `hchain-gas-configurator` 获取更精细的 EIP-1559 参数。

## Edge Cases

- **已确认**: 返回 txStatus，无需加速
- **txHash 找不到**: 确认 chainIndex 是否正确
- **nonce 未知**: 通过 pendingTxHash 查 onchainos_transaction_detail 获取
