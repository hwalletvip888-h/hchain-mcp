# hchain-mcp

[![npm version](https://img.shields.io/npm/v/hchain-mcp?style=flat-square)](https://www.npmjs.com/package/hchain-mcp)
[![npm downloads](https://img.shields.io/npm/dm/hchain-mcp?style=flat-square)](https://www.npmjs.com/package/hchain-mcp)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/hwalletvip888-h/hchain-mcp/ci.yml?style=flat-square)](https://github.com/hwalletvip888-h/hchain-mcp/actions)
[![License](https://img.shields.io/npm/l/hchain-mcp?style=flat-square)](LICENSE)

AI-native multi-chain trading MCP Server — 104 tools over HTTP & stdio.

## Install

```bash
npm install -g hchain-mcp
```

## Usage

### stdio (local Agent)

```bash
hchain-mcp
```

Set API Key:

```bash
export OKX_API_KEY=xxx
export OKX_SECRET_KEY=xxx
export OKX_PASSPHRASE=xxx
hchain-mcp
```

### HTTP (remote Agent)

```bash
hchain-mcp start:http
# → http://127.0.0.1:3000

# or custom port
PORT=3099 hchain-mcp start:http
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
    "hchain-mcp": {
      "command": "npx",
      "args": ["hchain-mcp"],
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
    "hchain-mcp": {
      "url": "http://127.0.0.1:3099/mcp"
    }
  }
}
```

## Tools (104)

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

### Phase 2 — API Composition Skills (8 tools)

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

## Docker

```bash
docker build -t hchain-mcp .
docker run --rm -e OKX_API_KEY=xxx -e OKX_SECRET_KEY=xxx -e OKX_PASSPHRASE=xxx hchain-mcp
# HTTP mode:
docker run --rm -p 3000:3000 -e PORT=3000 -e OKX_API_KEY=xxx -e OKX_SECRET_KEY=xxx -e OKX_PASSPHRASE=xxx hchain-mcp npx hchain-mcp start:http
```

## Test

```bash
npm test
```

## Supported Chains

Ethereum, BSC, Polygon, Arbitrum, Base, Optimism, Solana, Sui, TON, Avalanche, Fantom, and 40+ more.

## License

MIT
