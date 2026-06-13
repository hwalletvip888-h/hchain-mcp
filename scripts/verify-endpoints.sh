#!/usr/bin/env bash
# H-MCP API Endpoint Verification
# Usage: source ../.env && bash verify-endpoints.sh
set -euo pipefail

BASE="https://web3.okx.com"
KEY="${OKX_API_KEY:-}"
SECRET="${OKX_SECRET_KEY:-}"
PP="${OKX_PASSPHRASE:-}"

if [ -z "$KEY" ]; then echo "❌ source .env first"; exit 1; fi

# ── helpers ──
ts() { date -u +%Y-%m-%dT%H:%M:%S.000Z; }
sign() {
  local ts="$1" method="$2" path="$3" body="$4"
  echo -n "${ts}${method}${path}${body}" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64 -w0
}

okx_get() {
  local path="$1" t s
  t=$(ts); s=$(sign "$t" GET "$path" "")
  curl -s -w " HTTP_%{http_code}" --connect-timeout 5 --max-time 10 \
    -H "OK-ACCESS-KEY: $KEY" -H "OK-ACCESS-SIGN: $s" \
    -H "OK-ACCESS-TIMESTAMP: $t" -H "OK-ACCESS-PASSPHRASE: $PP" \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    "$BASE$path"
}

okx_post() {
  local path="$1" body="$2" t s
  t=$(ts); s=$(sign "$t" POST "$path" "$body")
  curl -s -w " HTTP_%{http_code}" --connect-timeout 5 --max-time 10 \
    -X POST -d "$body" \
    -H "OK-ACCESS-KEY: $KEY" -H "OK-ACCESS-SIGN: $s" \
    -H "OK-ACCESS-TIMESTAMP: $t" -H "OK-ACCESS-PASSPHRASE: $PP" \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    "$BASE$path"
}

pass() { echo "✅ $1"; }
fail() { echo "❌ $1 $2"; }

# ── MARKET (6 endpoints) ──
echo "===== MARKET ====="
r=$(okx_get "/api/v6/dex/market/supported/chain")
[[ "$r" =~ HTTP_200 ]] && pass "market/supported/chain" || fail "market/supported/chain" "$r"

r=$(okx_get "/api/v6/dex/market/token/search?keyword=ETH")
[[ "$r" =~ HTTP_200 ]] && pass "market/token/search" || fail "market/token/search" "$r"

r=$(okx_post "/api/v6/dex/market/token/basic-info" '{"chainIndex":1,"tokenAddress":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}')
[[ "$r" =~ HTTP_200 ]] && pass "market/token/basic-info" || fail "market/token/basic-info" "$r"

r=$(okx_post "/api/v6/dex/market/price" '{"chainIndex":1,"tokenAddress":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}')
[[ "$r" =~ HTTP_200 ]] && pass "market/price" || fail "market/price" "$r"

r=$(okx_get "/api/v6/dex/market/candles?chainIndex=1&tokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&period=1H")
[[ "$r" =~ HTTP_200 ]] && pass "market/candles" || fail "market/candles" "$r"

r=$(okx_get "/api/v6/dex/market/historical-candles?chainIndex=1&tokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&period=1D")
[[ "$r" =~ HTTP_200 ]] && pass "market/historical-candles" || fail "market/historical-candles" "$r"

# ── TRADE (6 endpoints) ──
echo "===== TRADE ====="
r=$(okx_get "/api/v6/dex/aggregator/supported/chain")
[[ "$r" =~ HTTP_200 ]] && pass "aggregator/supported/chain" || fail "aggregator/supported/chain" "$r"

r=$(okx_get "/api/v6/dex/aggregator/all-tokens?chainIndex=1")
[[ "$r" =~ HTTP_200 ]] && pass "aggregator/all-tokens" || fail "aggregator/all-tokens" "$r"

r=$(okx_get "/api/v6/dex/aggregator/get-liquidity?chainIndex=1")
[[ "$r" =~ HTTP_200 ]] && pass "aggregator/get-liquidity" || fail "aggregator/get-liquidity" "$r"

r=$(okx_get "/api/v6/dex/aggregator/quote?chainIndex=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000000000000000")
[[ "$r" =~ HTTP_200 ]] && pass "aggregator/quote" || fail "aggregator/quote" "$r"

r=$(okx_get "/api/v6/dex/aggregator/approve-transaction?chainIndex=1&tokenContractAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7&approveAmount=1000000")
[[ "$r" =~ HTTP_200 ]] && pass "aggregator/approve-transaction" || fail "aggregator/approve-transaction" "$r"

r=$(okx_get "/api/v6/dex/aggregator/history?chainIndex=1&txHash=0x0000000000000000000000000000000000000000000000000000000000000000")
[[ "$r" =~ HTTP_200|HTTP_4[0-9][0-9] ]] && pass "aggregator/history" || fail "aggregator/history" "$r"

# ── BALANCE/WALLET (4 endpoints) ──
echo "===== WALLET ====="
r=$(okx_get "/api/v6/dex/balance/supported/chain")
[[ "$r" =~ HTTP_200 ]] && pass "balance/supported/chain" || fail "balance/supported/chain" "$r"

r=$(okx_get "/api/v6/dex/balance/total-value-by-address?address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chains=1")
[[ "$r" =~ HTTP_200 ]] && pass "balance/total-value" || fail "balance/total-value" "$r"

r=$(okx_get "/api/v6/dex/balance/all-token-balances-by-address?address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chains=1")
[[ "$r" =~ HTTP_200 ]] && pass "balance/all-token-balances" || fail "balance/all-token-balances" "$r"

r=$(okx_post "/api/v6/dex/balance/token-balances-by-address" '{"address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","chainIndex":1,"tokenAddress":"0xdAC17F958D2ee523a2206206994597C13D831ec7"}')
[[ "$r" =~ HTTP_200 ]] && pass "balance/token-specific" || fail "balance/token-specific" "$r"

# ── GATEWAY (5 endpoints) ──
echo "===== GATEWAY ====="
r=$(okx_get "/api/v6/dex/pre-transaction/supported/chain")
[[ "$r" =~ HTTP_200 ]] && pass "pre-tx/supported/chain" || fail "pre-tx/supported/chain" "$r"

r=$(okx_get "/api/v6/dex/pre-transaction/gas-price?chainIndex=1")
[[ "$r" =~ HTTP_200 ]] && pass "pre-tx/gas-price" || fail "pre-tx/gas-price" "$r"

r=$(okx_post "/api/v6/dex/pre-transaction/gas-limit" '{"chainIndex":1,"from":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","to":"0xdAC17F958D2ee523a2206206994597C13D831ec7","value":"0","data":"0x"}')
[[ "$r" =~ HTTP_200 ]] && pass "pre-tx/gas-limit" || fail "pre-tx/gas-limit" "$r"

r=$(okx_get "/api/v6/dex/pre-transaction/simulate?chainIndex=1&from=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&to=0xdAC17F958D2ee523a2206206994597C13D831ec7&value=0&data=0x")
[[ "$r" =~ HTTP_200 ]] && pass "pre-tx/simulate" || fail "pre-tx/simulate" "$r"

r=$(okx_post "/api/v6/dex/pre-transaction/broadcast-transaction" '{"chainIndex":1,"signedTx":"0x00"}')
[[ "$r" =~ HTTP_200|HTTP_4[0-9][0-9] ]] && pass "pre-tx/broadcast" || fail "pre-tx/broadcast" "$r"

# ── POST-TX (3 endpoints) ──
echo "===== POST-TX ====="
r=$(okx_get "/api/v6/dex/post-transaction/orders?address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chainIndex=1")
[[ "$r" =~ HTTP_200 ]] && pass "post-tx/orders" || fail "post-tx/orders" "$r"

r=$(okx_get "/api/v6/dex/post-transaction/transactions-by-address?addresses=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chains=1")
[[ "$r" =~ HTTP_200 ]] && pass "post-tx/transactions" || fail "post-tx/transactions" "$r"

r=$(okx_get "/api/v6/dex/post-transaction/transaction-detail-by-txhash?txHash=0x0000000000000000000000000000000000000000000000000000000000000000&chainIndex=1")
[[ "$r" =~ HTTP_200|HTTP_4[0-9][0-9] ]] && pass "post-tx/detail" || fail "post-tx/detail" "$r"

# ── PAYMENTS (4 endpoints) ──
echo "===== PAYMENTS ====="
r=$(okx_get "/api/v6/pay/x402/supported")
[[ "$r" =~ HTTP_200 ]] && pass "pay/supported" || fail "pay/supported" "$r"

r=$(okx_post "/api/v6/pay/x402/verify" '{"test":true}')
[[ "$r" =~ HTTP_200|HTTP_4[0-9][0-9] ]] && pass "pay/verify" || fail "pay/verify" "$r"

r=$(okx_post "/api/v6/pay/x402/settle" '{"test":true}')
[[ "$r" =~ HTTP_200|HTTP_4[0-9][0-9] ]] && pass "pay/settle" || fail "pay/settle" "$r"

r=$(okx_get "/api/v6/pay/x402/settle/status?txHash=0x0000000000000000000000000000000000000000000000000000000000000000")
[[ "$r" =~ HTTP_200|HTTP_4[0-9][0-9] ]] && pass "pay/settle/status" || fail "pay/settle/status" "$r"

echo "===== DONE ====="
