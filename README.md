# hchain-mcp

AI-native multi-chain trading MCP Server — 99 tools, HTTP & stdio dual transport.

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

## Tools (99)

### Phase 1 — Base APIs (95 tools)

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

### Phase 2 — API Composition Skills (4 tools)

| Tool | Description |
|------|-------------|
| `onchainos_skill_trade_pipeline` | One-shot swap: quote → approve → swap → simulate |
| `onchainos_skill_risk_detect` | 4-dimension risk scan with 0-100 scoring |
| `onchainos_skill_smart_slippage` | Volatility-based slippage recommendation |
| `onchainos_skill_signal_aggregate` | Signal discovery with automatic risk filtering |

## Supported Chains

Ethereum, BSC, Polygon, Arbitrum, Base, Optimism, Solana, Sui, TON, Avalanche, Fantom, and 40+ more.

## License

MIT
