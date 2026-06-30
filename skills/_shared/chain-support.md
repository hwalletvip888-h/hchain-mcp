# Chain Support Reference

> 链 ID 映射表 — hchain-skills 支持的全部公链

| chainIndex | Chain Name | Native Token | Notes |
|:----------:|------------|:------------:|-------|
| `"1"` | Ethereum (ETH) | ETH (0xEeee...) | EVM |
| `"56"` | BSC | BNB | EVM |
| `"137"` | Polygon | MATIC | EVM |
| `"501"` | Solana | SOL (1111...111) | SVM |
| `"8453"` | Base | ETH | EVM L2 |
| `"42161"` | Arbitrum | ETH | EVM L2 |
| `"10"` | Optimism | ETH | EVM L2 |
| `"196"` | X Layer | OKB | EVM ZK L2 |
| `"784"` | Sui | SUI (0x2::sui::SUI) | Move |
| `"607"` | TON | TON (EQAAAAA...) | TON |
| `"43114"` | Avalanche | AVAX | EVM |
| `"250"` | Fantom | FTM | EVM |

## Querying at Runtime

Use `onchainos_balance_supported_chain` or `onchainos_market_supported_chain` to get the latest supported chain list.

## Chain ID Format

> ⚠️ **chainIndex is ALWAYS a string**, never a number. Use `"1"` not `1`.
