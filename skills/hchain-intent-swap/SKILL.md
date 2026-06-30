---
name: hchain-intent-swap
description: "意图交易管线：意图报价→EIP-712签名→提交订单→Solver拍卖结算。中文触发: 意图交易, intent swap, 免Gas交易, 意图兑换, 拍卖交易, MEV抗性。English: intent swap, MEV-resistant swap, gasless trade, solver auction, intent-based trading."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.4.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-intent-swap

Intent-based swap pipeline — alternative to classic DEX. Uses solver auction for execution.

## Intent vs Classic DEX

| Aspect | Intent Swap | Classic DEX (trade_pipeline) |
|--------|------------|------------------------------|
| Execution | Solver auction | Direct DEX routing |
| Gas | Paid from swap amount (no upfront) | User pays gas upfront |
| MEV | Resistant (solver competition) | Vulnerable to sandwich attacks |
| Signing | EIP-712 typed data | Raw calldata |
| Settlement | Atomic cross-chain capable | Single chain |
| Best for | Large trades, cross-chain | Small/medium trades |

## Execution Flow

### Call onchainos_skill_intent_swap

```json
{
  "chainIndex": "1",
  "fromTokenAddress": "0x...",
  "toTokenAddress": "0x...",
  "amount": "1000000",
  "userWalletAddress": "0x...",
  "slippagePercent": "1.0"
}
```

### Workflow

| # | Step | Action |
|---|------|--------|
| 1 | Intent Quote | Server returns EIP-712 signData |
| 2 | User Signs | Sign the signData with EIP-712 (off-chain) |
| 3 | Create Order | Call `onchainos_intent_create_order` with signature |
| 4 | Auction | Solvers compete for best execution price |
| 5 | Settlement | Winner executes on-chain, user receives tokens |

## Parameter Table

| Param | Required | Description |
|-------|----------|-------------|
| chainIndex | Yes | Chain ID. '1'=ETH '56'=BSC '501'=Solana '8453'=Base |
| fromTokenAddress | Yes | Token to sell (lowercase). '' for native |
| toTokenAddress | Yes | Token to buy (lowercase). '' for native |
| amount | Yes | Sell amount in minimal units (with decimals) |
| userWalletAddress | Yes | Your wallet address |
| slippagePercent | No | Slippage tolerance %, default 1.0 |

## EIP-712 Signing

The returned signData contains:
- `domain` — EIP-712 domain separator
- `types` — Type definitions
- `message` — The order payload
- `primaryType` — Root type name

**Sign with your wallet** (MetaMask, Rabby, ethers.js, etc.) using `eth_signTypedData_v4`.

## Order Status States

| Status | Meaning |
|--------|---------|
| PENDING | Order submitted, awaiting solver bids |
| SETTLING | Solver won, executing on-chain |
| COMPLETED | Swap settled, tokens received |
| FAILED | No solver or execution failed |
| CANCELLED | User cancelled the order |

## Next Steps

1. **Sign** — EIP-712 sign the signData (off-chain, no gas needed)
2. **Submit** — `onchainos_intent_create_order` with your signature
3. **Track** — `onchainos_intent_order_status` to monitor progress
4. **Auction info** — `onchainos_intent_auction_info` to see solver bids

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No intent route | Quote fails → use `hchain-trade-pipeline` instead |
| signData missing | Fatal — intent not supported for this pair |
| Auction timeout | Order status → FAILED, retry or use classic DEX |
| Partial fill | Check order status for actual executed amount |
