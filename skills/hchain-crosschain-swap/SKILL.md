---
name: hchain-crosschain-swap
description: "跨链原子交换：源链→目标链一站式兑换，支持Intent(拍卖结算)和Direct(聚合器路由)双模式。Use this skill when the user says '跨链兑换', '把ETH链的USDT换成Solana的SOL', '跨链swap', '从BSC跨到Arbitrum', wants to swap tokens across different blockchains, or needs cross-chain asset transfer."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-crosschain-swap

源链→目标链一站式兑换。同链用 `hchain-trade-pipeline`。

## Mode Comparison

| 维度 | Intent (推荐) | Direct |
|------|---------------|--------|
| 结算 | Solver拍卖竞价 | 聚合器路由 |
| Gas | 零Gas前置 | 需Gas |
| 原子性 | ✅ 跨链原子结算 | 需两次签名 |
| 签名 | EIP-712 signData | calldata签名 |
| 适用 | 大部分跨链场景 | 特定路由 |

## Execution Flow

### Step 1 — 收集参数

- **fromChain/toChain**: 源链/目标链ID（必不同）
- **fromTokenAddress/toTokenAddress**: 卖出/买入代币
- **amount**: 最小单位
- **userWalletAddress**: 用户钱包
- **mode**: `intent`（默认）或 `direct`
- **slippagePercent**: 默认 `"1.0"`

### Step 2 — 调 onchainos_skill_crosschain_swap

```json
{
  "fromChain": "1",
  "toChain": "501",
  "fromTokenAddress": "0xdac17f958d2ee523a2206206994597c13d831ec7",
  "toTokenAddress": "11111111111111111111111111111111",
  "amount": "1000000",
  "userWalletAddress": "0x...",
  "mode": "intent",
  "slippagePercent": "1.0"
}
```

### Intent 模式流程

```
报价 → 返回 signData → 用户 EIP-712 签名
→ onchainos_intent_create_order → 提交
→ onchainos_intent_order_status → 追踪拍卖结算
```

### Direct 模式流程

```
报价 → 授权(如需) → 构建calldata → 模拟
→ 用户签名 → onchainos_gateway_broadcast (源链广播)
→ onchainos_gateway_orders (追踪)
→ onchainos_transaction_history (目标链确认)
```

## Risk Controls

| 风险 | 动作 |
|------|------|
| 报价无 signData | 改用 mode=direct |
| 模拟失败 | 警告（跨链桥接可能不支持模拟） |
| 同链 fromChain=toChain | 改用 `hchain-trade-pipeline` |
