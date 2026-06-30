# Native Token Addresses

> Reference table for native token addresses used across hchain-skills tools.

| Chain | Native Address | Format |
|-------|---------------|--------|
| Ethereum (and EVM L2s) | `""` (empty string) or `"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"` | EVM |
| Solana | `"11111111111111111111111111111111"` | Base58 |
| Sui | `"0x2::sui::SUI"` | Move |
| TON | `"EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"` | TON |

## Usage

When querying native token balance or price:
- Pass empty string `""` for EVM native tokens
- Pass the specific native address for non-EVM chains

Example with `onchainos_balance_specific_token`:
```json
{
  "address": "0xYourWallet",
  "tokens": "1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,501:"
}
```
The `501:` (empty token address) queries native SOL balance.
