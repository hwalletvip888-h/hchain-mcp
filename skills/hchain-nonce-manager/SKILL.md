---
name: hchain-nonce-manager
description: "Nonce管理器：查询地址nonce状态+诊断pending nonce gap+指导覆盖卡住的交易。Use this skill when the user says 'nonce乱了', '帮我查nonce', '指定nonce发交易', 'nonce gap', or has transactions stuck due to nonce issues."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-nonce-manager

诊断 nonce 状态 + 自动填充 + 覆盖指引。

## Supported Chains

仅 EVM 链：ETH(1) BSC(56) Polygon(137) Base(8453) Arbitrum(42161) Optimism(10)

## Execution Flow

### 调 onchainos_skill_nonce_manager

```json
{
  "chainIndex": "1",
  "userWalletAddress": "0x...",
  "pendingTxHash": "0x..."
}
```

### 返回诊断

| 状态 | 含义 | 动作 |
|------|------|------|
| healthy | 无 pending 异常 | 正常发送新交易 |
| nonce_gap | 存在 pending 交易阻塞 | 用相同 nonce 覆盖 |

### nonce_gap 时

如果提供了 pendingTxHash → 自动从交易详情提取 nonce → 填充 targetNonce。

### 手动指定 nonce

```json
{
  "chainIndex": "1",
  "userWalletAddress": "0x...",
  "targetNonce": 5
}
```

## Nonce 原理

```
EVM 交易 nonce 从 0 递增，每确认一笔 +1
卡住 nonce=5 的交易 → nonce 6,7,8... 全部排队
→ 用相同 nonce=5 发送替换交易覆盖
```

## Next Steps

- nonce_gap → `hchain-tx-accelerator` 加速/取消
- healthy → `hchain-trade-pipeline` 正常交易
