# hchain-skills

[![npm version](https://img.shields.io/npm/v/hchain-skills?style=flat-square)](https://www.npmjs.com/package/hchain-skills)
[![npm downloads](https://img.shields.io/npm/dm/hchain-skills?style=flat-square)](https://www.npmjs.com/package/hchain-skills)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/hwalletvip888-h/hchain-skills/ci.yml?style=flat-square)](https://github.com/hwalletvip888-h/hchain-skills/actions)
[![License](https://img.shields.io/npm/l/hchain-skills?style=flat-square)](LICENSE)

AI-native multi-chain trading MCP Server — 109 tools over HTTP & stdio.

## Install

```bash
npm install -g hchain-skills
```

## Usage

### stdio (local Agent)

```bash
hchain-skills
```

Set API Key:

```bash
export OKX_API_KEY=xxx
export OKX_SECRET_KEY=xxx
export OKX_PASSPHRASE=xxx
hchain-skills
```

### HTTP (remote Agent)

```bash
hchain-skills start:http
# → http://127.0.0.1:3000

# or custom port
PORT=3099 hchain-skills start:http
```

Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp` | MCP StreamableHTTP |
| GET | `/health` | Health check |

### Claude Code Config

```json
{
  "mcpServers": {
    "hchain-skills": {
      "command": "npx",
      "args": ["hchain-skills"],
      "env": {
        "OKX_API_KEY": "xxx",
        "OKX_SECRET_KEY": "xxx",
        "OKX_PASSPHRASE": "xxx"
      }
    }
  }
}
```

Or HTTP mode:

```json
{
  "mcpServers": {
    "hchain-skills": {
      "url": "http://127.0.0.1:3099/mcp"
    }
  }
}
```

## Tools (109)

### Phase 1 — Base APIs (96 tools)

| Module | Count | Description |
|--------|:-----:|-------------|
| Market | 45 | Prices, candles, token info, signals, social |
| DeFi | 14 | Yield, staking, lending, pool |
| Trade | 8 | DEX aggregation, quote, swap |
| Intent | 6 | Intent-based swap + auction |
| Gateway | 6 | Gas, simulate, broadcast |
| Payments | 5 | Agent-to-Agent payments (x402) |
| Balance | 4 | Multi-chain balance |
| WS | 4 | WebSocket connect/subscribe |
| TxHistory | 3 | Transaction history |
| Help | 1 | Interactive help & navigation |

### Phase 2 — API Composition Skills (13 tools)

| Tool | Description |
|------|-------------|
| `onchainos_skill_trade_pipeline` | One-shot swap: quote → approve → swap → simulate |
| `onchainos_skill_risk_detect` | 4-dimension risk scan with 0-100 scoring |
| `onchainos_skill_smart_slippage` | Volatility-based slippage recommendation |
| `onchainos_skill_signal_aggregate` | Signal discovery with automatic risk filtering |
| `onchainos_skill_market_overview` | Market overview: price + candles + security + sentiment |
| `onchainos_skill_crosschain_swap` | Cross-chain atomic swap: source → destination chain (intent/direct) |
| `onchainos_skill_conditional_order` | Conditional order: limit buy/sell + stop-loss with price trigger |
| `onchainos_skill_tx_accelerator` | Stuck tx accelerator: RBF speed-up or cancel guidance |
| `onchainos_skill_social_narrative` | Social narrative: sentiment + vibe + KOLs + news aggregation |
| `onchainos_skill_batch_swap` | Batch swap: execute multiple swaps sequentially |
| `onchainos_skill_nonce_manager` | Nonce manager: query address nonce, build replacement tx |
| `onchainos_skill_price_alert` | Price alert: WS-driven price monitoring with condition triggers |
| `onchainos_skill_gas_configurator` | EIP-1559 gas config: slow/average/fast with priority fees |

## Docker

```bash
docker build -t hchain-skills .
docker run --rm -e OKX_API_KEY=xxx -e OKX_SECRET_KEY=xxx -e OKX_PASSPHRASE=xxx hchain-skills
# HTTP mode:
docker run --rm -p 3000:3000 -e PORT=3000 -e OKX_API_KEY=xxx -e OKX_SECRET_KEY=xxx -e OKX_PASSPHRASE=xxx hchain-skills npx hchain-skills start:http
```

## Test

```bash
npm test
```

## Supported Chains

Ethereum, BSC, Polygon, Arbitrum, Base, Optimism, Solana, Sui, TON, Avalanche, Fantom, and 40+ more.

## License

MIT
