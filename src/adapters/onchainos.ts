/**
 * Onchain OS REST API 适配层
 *
 * 所有端点经 curl 验证 (2025.06)
 * Base: https://web3.okx.com
 */

import crypto from "node:crypto";
import type { Auth } from "./shared.js";

const BASE = "https://web3.okx.com";

function ts(): string { return new Date().toISOString().replace(/(\.\d{3})\d*Z/, "$1Z"); }

function buildQuery(p: Record<string, string | number | boolean | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "") s.append(k, String(v));
  return s.size ? "?" + s.toString() : "";
}

async function request<T>(
  method: "GET" | "POST", path: string,
  opts: { params?: Record<string, string | number | boolean | undefined>; body?: unknown; auth?: Auth } = {},
): Promise<T> {
  const query = opts.params ? buildQuery(opts.params) : "";
  const fullPath = path + query;
  const bodyStr = opts.body ? JSON.stringify(opts.body) : "";
  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json" };

  if (opts.auth) {
    const t = ts();
    const sign = crypto.createHmac("sha256", opts.auth.secret).update(t + method + fullPath + bodyStr).digest("base64");
    headers["OK-ACCESS-KEY"] = opts.auth.apiKey;
    headers["OK-ACCESS-SIGN"] = sign;
    headers["OK-ACCESS-TIMESTAMP"] = t;
    headers["OK-ACCESS-PASSPHRASE"] = opts.auth.passphrase;
  }

  const res = await fetch(BASE + fullPath, { method, headers, ...(bodyStr ? { body: bodyStr } : {}) });
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`HTTP ${res.status}: ${t}`); }
  const json = await res.json() as { code: string; msg?: string; data?: T };
  if (json.code && json.code !== "0") throw new Error(`OKX ${json.code}: ${json.msg ?? ""}`);
  return (json.data ?? json) as T;
}

// ═══════════════════════════════════════════════════════════════
// Market API (行情) — 全部需 Auth
// ═══════════════════════════════════════════════════════════════

export const marketApi = {
  /** GET /api/v6/dex/market/supported/chain ✅ */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/supported/chain", { auth }),

  /** GET /api/v6/dex/market/token/search?search=&chains= ✅ */
  searchToken: (auth: Auth, search: string, chains?: string) =>
    request("GET", "/api/v6/dex/market/token/search", { params: { search, chains }, auth }),

  /** POST /api/v6/dex/market/price ✅ */
  price: (auth: Auth, chainIndex: number, tokenAddress: string) =>
    request("POST", "/api/v6/dex/market/price", { body: { chainIndex, tokenAddress }, auth }),

  /** POST /api/v6/dex/market/price-info (批量) ✅ */
  priceInfo: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/market/price-info", { body, auth }),

  /** GET /api/v6/dex/market/candles?chainIndex=&tokenContractAddress=&period= ✅ */
  candles: (auth: Auth, chainIndex: number, tokenContractAddress: string, period: string, after?: string, before?: string) =>
    request("GET", "/api/v6/dex/market/candles", { params: { chainIndex, tokenContractAddress, period, after, before }, auth }),

  /** GET /api/v6/dex/market/historical-candles ✅ */
  historicalCandles: (auth: Auth, chainIndex: number, tokenContractAddress: string, period: string) =>
    request("GET", "/api/v6/dex/market/historical-candles", { params: { chainIndex, tokenContractAddress, period }, auth }),

  /** POST /api/v6/dex/market/token/basic-info ✅ */
  tokenBasicInfo: (auth: Auth, chainIndex: number, tokenAddress: string) =>
    request("POST", "/api/v6/dex/market/token/basic-info", { body: { chainIndex, tokenAddress }, auth }),
};

// ═══════════════════════════════════════════════════════════════
// Trade / DEX API (交易)
// ═══════════════════════════════════════════════════════════════

export const tradeApi = {
  /** GET /api/v6/dex/aggregator/supported/chain ✅ */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/aggregator/supported/chain", { auth }),

  /** GET /api/v6/dex/aggregator/all-tokens?chainIndex= ✅ */
  allTokens: (auth: Auth, chainIndex: number) =>
    request("GET", "/api/v6/dex/aggregator/all-tokens", { params: { chainIndex }, auth }),

  /** GET /api/v6/dex/aggregator/get-liquidity?chainIndex= ✅ */
  liquidity: (auth: Auth, chainIndex: number) =>
    request("GET", "/api/v6/dex/aggregator/get-liquidity", { params: { chainIndex }, auth }),

  /** GET /api/v6/dex/aggregator/quote ✅ */
  quote: (auth: Auth, params: Record<string, string | number>) =>
    request("GET", "/api/v6/dex/aggregator/quote", { params, auth }),

  /** GET /api/v6/dex/aggregator/approve-transaction ✅ */
  approveTransaction: (auth: Auth, params: Record<string, string | number>) =>
    request("GET", "/api/v6/dex/aggregator/approve-transaction", { params, auth }),

  /** GET /api/v6/dex/aggregator/swap ✅ */
  swap: (auth: Auth, params: Record<string, string | number>) =>
    request("GET", "/api/v6/dex/aggregator/swap", { params, auth }),

  /** GET /api/v6/dex/aggregator/swap-instruction (Solana) */
  swapInstruction: (auth: Auth, params: Record<string, string | number>) =>
    request("GET", "/api/v6/dex/aggregator/swap-instruction", { params, auth }),

  /** GET /api/v6/dex/aggregator/history?chainIndex=&txHash= ✅ */
  swapHistory: (auth: Auth, chainIndex: number, txHash: string) =>
    request("GET", "/api/v6/dex/aggregator/history", { params: { chainIndex, txHash }, auth }),
};

// ═══════════════════════════════════════════════════════════════
// Balance / Wallet API (账户)
// ═══════════════════════════════════════════════════════════════

export const balanceApi = {
  /** GET /api/v6/dex/balance/supported/chain ✅ */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/balance/supported/chain", { auth }),

  /** GET /api/v6/dex/balance/total-value-by-address?address=&chains= ✅ */
  totalValue: (auth: Auth, address: string, chains: string) =>
    request("GET", "/api/v6/dex/balance/total-value-by-address", { params: { address, chains }, auth }),

  /** GET /api/v6/dex/balance/all-token-balances-by-address ✅ */
  allTokenBalances: (auth: Auth, address: string, chains: string) =>
    request("GET", "/api/v6/dex/balance/all-token-balances-by-address", { params: { address, chains }, auth }),

  /** POST /api/v6/dex/balance/token-balances-by-address ✅ */
  specificTokenBalance: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/balance/token-balances-by-address", { body, auth }),
};

// ═══════════════════════════════════════════════════════════════
// Pre-transaction / Gateway API (网关)
// ═══════════════════════════════════════════════════════════════

export const gatewayApi = {
  /** GET /api/v6/dex/pre-transaction/supported/chain ✅ */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/pre-transaction/supported/chain", { auth }),

  /** GET /api/v6/dex/pre-transaction/gas-price?chainIndex= ✅ */
  gasPrice: (auth: Auth, chainIndex: number) =>
    request("GET", "/api/v6/dex/pre-transaction/gas-price", { params: { chainIndex }, auth }),

  /** POST /api/v6/dex/pre-transaction/gas-limit ✅ */
  gasLimit: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/pre-transaction/gas-limit", { body, auth }),

  /** POST /api/v6/dex/pre-transaction/simulate ✅ */
  simulate: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/pre-transaction/simulate", { body, auth }),

  /** POST /api/v6/dex/pre-transaction/broadcast-transaction ✅ */
  broadcast: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/pre-transaction/broadcast-transaction", { body, auth }),
};

// ═══════════════════════════════════════════════════════════════
// Post-transaction API (交易历史)
// ═══════════════════════════════════════════════════════════════

export const postTxApi = {
  /** GET /api/v6/dex/post-transaction/orders?address=&chainIndex= ✅ */
  orders: (auth: Auth, address: string, chainIndex: number) =>
    request("GET", "/api/v6/dex/post-transaction/orders", { params: { address, chainIndex }, auth }),

  /** GET /api/v6/dex/post-transaction/transactions-by-address?address=&chains= ⚠️ 504 */
  transactions: (auth: Auth, address: string, chains: string, limit?: number) =>
    request("GET", "/api/v6/dex/post-transaction/transactions-by-address", { params: { address, chains, limit }, auth }),

  /** GET /api/v6/dex/post-transaction/transaction-detail-by-txhash ✅ */
  detail: (auth: Auth, txHash: string, chainIndex: number) =>
    request("GET", "/api/v6/dex/post-transaction/transaction-detail-by-txhash", { params: { txHash, chainIndex }, auth }),
};

// ═══════════════════════════════════════════════════════════════
// Payments API (x402)
// ═══════════════════════════════════════════════════════════════

export const paymentsApi = {
  /** GET /api/v6/pay/x402/supported ✅ */
  supported: (auth: Auth) =>
    request("GET", "/api/v6/pay/x402/supported", { auth }),

  /** POST /api/v6/pay/x402/verify ✅ */
  verify: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/pay/x402/verify", { body, auth }),

  /** POST /api/v6/pay/x402/settle ✅ */
  settle: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/pay/x402/settle", { body, auth }),

  /** GET /api/v6/pay/x402/settle/status?txHash= ✅ */
  settleStatus: (auth: Auth, txHash: string) =>
    request("GET", "/api/v6/pay/x402/settle/status", { params: { txHash }, auth }),
};
