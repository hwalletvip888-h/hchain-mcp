---
name: hchain-defi-invest
description: "DeFi一键投资管线：搜索→详情→准备→申购，一步完成。中文触发: DeFi投资, 存入, 理财, 申购, 赚币, 买理财, 存款生息, 质押。English: invest in DeFi, deposit, earn yield, stake, lend, supply, DeFi investment, put money to work. Covers Aave, Compound, Lido, PancakeSwap, and 50+ more protocols."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.4.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-defi-invest

5-step DeFi investment pipeline: search → detail → rate chart → prepare → enter.

## Execution Flow

### Call onchainos_skill_defi_invest

```json
{
  "chainIndex": "1",
  "tokenKeyword": "USDC",
  "amount": "1000000",
  "userWalletAddress": "0x...",
  "platformKeyword": "Aave"
}
```

### 5 Steps

| # | Step | API | Fatal? | Returns |
|---|------|-----|--------|---------|
| 1 | Search | defiApi.searchProducts | Yes | Top product by match |
| 2 | Detail | defiApi.productDetail | Yes | APY, TVL, platform, status |
| 3 | Rate Chart | defiApi.rateChart (WEEK) | No | APY trend data points |
| 4 | Prepare | defiApi.prepareTransaction | Yes | investWithTokenList |
| 5 | Enter | defiApi.enter | Yes | calldata list (APPROVE→DEPOSIT) |

### Shortcut: investmentId

If you already know the investmentId, pass it directly to skip the search step:

```json
{
  "chainIndex": "1",
  "investmentId": "inv_abc123",
  "amount": "1000000",
  "userWalletAddress": "0x..."
}
```

## Parameter Table

| Param | Required | Description |
|-------|----------|-------------|
| chainIndex | Yes | Chain ID. '1'=ETH '56'=BSC '501'=Solana '8453'=Base |
| tokenKeyword | Yes* | Token to invest (e.g. 'USDC' 'ETH'). *Not needed if investmentId provided |
| amount | Yes | Investment amount in minimal units (with decimals) |
| userWalletAddress | Yes | Your wallet address |
| platformKeyword | No | Protocol filter (e.g. 'Aave' 'Compound') |
| investmentId | No | Skip search — go straight to this product |

## Amount Formula

```
amount = humanReadable × 10^decimals

USDC (decimals=6):  '1' USDC = '1000000'
USDT (decimals=6):  '1' USDT = '1000000'
ETH  (decimals=18): '1' ETH  = '1000000000000000000'
SOL  (decimals=9):  '1' SOL  = '1000000000'
```

⚠️ If unsure about decimals, call `onchainos_token_basic_info` first.

## Return Value

| Field | Description |
|-------|-------------|
| steps | Step-by-step execution log |
| calldata | The dataList from enter (APPROVE + DEPOSIT transactions) |
| productInfo | investmentId, platformName, tokenSymbol, apy, tvlUsd |
| summary.status | "ready" or "failed" |

## Next Steps

1. **Sign calldata** — User signs each tx in the dataList with private key/wallet
2. **Broadcast** — `onchainos_gateway_broadcast` for each signed tx
3. **Check positions** — `hchain-defi-portfolio` to verify your new position

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No products found | Returns `no_products_found` status — try different keywords |
| isInvestable=false | Warning added, but pipeline continues |
| Rate chart fails | Non-fatal — APY trend unavailable but invest still works |
| Prepare fails | Fatal — cannot construct enter transaction |
| Enter fails | Fatal — calldata generation failed |
