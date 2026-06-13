/**
 * Onchain OS REST API 适配层
 *
 * 端点来源: https://web3.okx.com/onchainos/dev-docs
 * ⚠️ 所有端点均需 API Key (2025年起)
 * 公开端点 → onchainosApi (照样带 Key 但只做只读)
 * 鉴权端点 → onchainosPrivateApi (读写)
 */

import crypto from "node:crypto";

const BASE = "https://web3.okx.com";

// ── 工具函数 ──────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString().replace(/(\.\d{3})\d*Z/, "$1Z");
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.append(k, String(v));
  }
  return p.size ? "?" + p.toString() : "";
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  options: {
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    auth?: Auth;
  } = {},
): Promise<T> {
  const query = options.params ? buildQuery(options.params) : "";
  const fullPath = path + query;
  const bodyStr = options.body ? JSON.stringify(options.body) : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  if (options.auth) {
    const ts = timestamp();
    const msg = ts + method + fullPath + bodyStr;
    const sign = crypto.createHmac("sha256", options.auth.secret).update(msg).digest("base64");
    headers["OK-ACCESS-KEY"] = options.auth.apiKey;
    headers["OK-ACCESS-SIGN"] = sign;
    headers["OK-ACCESS-TIMESTAMP"] = ts;
    headers["OK-ACCESS-PASSPHRASE"] = options.auth.passphrase;
  }

  const res = await fetch(BASE + fullPath, {
    method,
    headers,
    ...(bodyStr ? { body: bodyStr } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }

  const json = await res.json() as { code: string; msg?: string; data?: T };
  if (json.code && json.code !== "0") {
    throw new Error(`OKX ${json.code}: ${json.msg ?? "unknown error"}`);
  }
  return (json.data ?? json) as T;
}

// ── 鉴权类型 ──────────────────────────────────────────────────

export interface Auth {
  apiKey: string;
  secret: string;
  passphrase: string;
}

// ── 公共接口（实际也需要 API Key，但操作只读）────────────────

export const onchainosApi = {
  // Market — 搜索代币 GET (已验证 ✅)
  searchToken: (auth: Auth, search: string, chains?: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/token/search", { params: { search, chains }, auth }),

  // Market — 代币基本信息 POST
  getTokenBasicInfo: (auth: Auth, chainIndex: number, tokenAddress: string) =>
    request<unknown>("POST", "/api/v6/dex/market/token/basic-info", { body: { chainIndex, tokenAddress }, auth }),

  // Market — 实时价格 POST
  getPrice: (auth: Auth, chainIndex: number, tokenAddress: string) =>
    request<unknown>("POST", "/api/v6/dex/market/price", { body: { chainIndex, tokenAddress }, auth }),

  // Market — 价格信息 POST（多代币批量查价）
  getPriceInfo: (auth: Auth, chainIndex: number, tokenAddresses: string[]) =>
    request<unknown>("POST", "/api/v6/dex/market/price-info", { body: { chainIndex, tokenAddresses }, auth }),

  // Market — K 线 GET (已验证 ✅，参数名 tokenContractAddress)
  getCandlesticks: (auth: Auth, chainIndex: number, tokenContractAddress: string, period: string, after?: string, before?: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/candles", { params: { chainIndex, tokenContractAddress, period, after, before }, auth }),

  // Market — 历史K线 GET (已验证 ✅)
  getCandlesticksHistory: (auth: Auth, chainIndex: number, tokenContractAddress: string, period: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/historical-candles", { params: { chainIndex, tokenContractAddress, period }, auth }),

  // Market — 支持的市场链 GET
  getMarketSupportedChains: (auth: Auth) =>
    request<unknown[]>("GET", "/api/v6/dex/market/supported/chain", { auth }),

  // Trade — 聚合器支持的链 GET
  getSupportedChains: (auth: Auth) =>
    request<unknown[]>("GET", "/api/v6/dex/aggregator/supported/chain", { auth }),

  // Trade — 获取代币列表 GET
  getTokens: (auth: Auth, chainIndex: number) =>
    request<unknown[]>("GET", "/api/v6/dex/aggregator/all-tokens", { params: { chainIndex }, auth }),

  // Trade — 获取流动性源 GET
  getLiquidity: (auth: Auth, chainIndex: number) =>
    request<unknown[]>("GET", "/api/v6/dex/aggregator/get-liquidity", { params: { chainIndex }, auth }),

  // Trade — 获取报价 GET
  getQuote: (auth: Auth, params: Record<string, string | number>) =>
    request<unknown>("GET", "/api/v6/dex/aggregator/quote", { params, auth }),

  // Trade — 授权交易 GET
  approveTransaction: (auth: Auth, params: Record<string, string | number>) =>
    request<unknown>("GET", "/api/v6/dex/aggregator/approve-transaction", { params, auth }),

  // Trade — Solana swap instructions GET
  getSolanaSwapInstructions: (auth: Auth, params: Record<string, string | number>) =>
    request<unknown>("GET", "/api/v6/dex/aggregator/swap-instruction", { params, auth }),

  // Trade — Swap GET
  swap: (auth: Auth, params: Record<string, string | number>) =>
    request<unknown>("GET", "/api/v6/dex/aggregator/swap", { params, auth }),

  // Trade — 交易状态 GET
  getSwapHistory: (auth: Auth, chainIndex: number, txHash: string) =>
    request<unknown>("GET", "/api/v6/dex/aggregator/history", { params: { chainIndex, txHash }, auth }),
};

// ── 鉴权接口（读写操作）──────────────────────────────────────

export const onchainosPrivateApi = {
  // Wallet — 余额总览 GET
  getTotalValue: (auth: Auth, address: string, chains: string) =>
    request<unknown>("GET", "/api/v6/dex/balance/total-value-by-address", { params: { address, chains }, auth }),

  // Wallet — 所有代币余额 GET
  getAllTokenBalances: (auth: Auth, address: string, chains: string) =>
    request<unknown[]>("GET", "/api/v6/dex/balance/all-token-balances-by-address", { params: { address, chains }, auth }),

  // Wallet — 特定代币余额 POST
  getSpecificTokenBalance: (auth: Auth, body: { address: string; chainIndex: number; tokenAddress: string }) =>
    request<unknown>("POST", "/api/v6/dex/balance/token-balances-by-address", { body, auth }),

  // Wallet — 支持的钱包链 GET
  getBalanceSupportedChains: (auth: Auth) =>
    request<unknown[]>("GET", "/api/v6/dex/balance/supported/chain", { auth }),

  // Wallet — 交易历史 GET (已验证 ✅，参数名 address 单数)
  getTransactionsByAddress: (auth: Auth, address: string, chains: string, limit?: number) =>
    request<unknown[]>("GET", "/api/v6/dex/post-transaction/transactions-by-address", { params: { address, chains, limit }, auth }),

  // Wallet — 交易详情 GET
  getTransactionDetail: (auth: Auth, txHash: string, chainIndex: number) =>
    request<unknown>("GET", "/api/v6/dex/post-transaction/transaction-detail-by-txhash", { params: { txHash, chainIndex }, auth }),

  // Gateway — Pre-transaction 支持的链 GET
  getPreTxSupportedChains: (auth: Auth) =>
    request<unknown[]>("GET", "/api/v6/dex/pre-transaction/supported/chain", { auth }),

  // Gateway — Gas 价格 GET
  getGasPrice: (auth: Auth, chainIndex: number) =>
    request<unknown>("GET", "/api/v6/dex/pre-transaction/gas-price", { params: { chainIndex }, auth }),

  // Gateway — Gas 限制 POST
  getGasLimit: (auth: Auth, body: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/pre-transaction/gas-limit", { body, auth }),

  // Gateway — 模拟交易 POST (已验证 ✅，参数名 fromAddress/toAddress)
  simulateTransaction: (auth: Auth, body: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/pre-transaction/simulate", { body, auth }),

  // Gateway — 广播交易 POST
  broadcastTransaction: (auth: Auth, body: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/pre-transaction/broadcast-transaction", { body, auth }),

  // Gateway — 查询订单 GET
  getOrders: (auth: Auth, address: string, chainIndex: number) =>
    request<unknown>("GET", "/api/v6/dex/post-transaction/orders", { params: { address, chainIndex }, auth }),

  // Payments — 支持的支付信息 GET
  getSupportedPaymentInfo: (auth: Auth) =>
    request<unknown>("GET", "/api/v6/pay/x402/supported", { auth }),

  // Payments — 验证支付 POST
  verifyPayment: (auth: Auth, body: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/pay/x402/verify", { body, auth }),

  // Payments — 结算 POST
  settlePayment: (auth: Auth, body: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/pay/x402/settle", { body, auth }),

  // Payments — 结算状态 GET
  getSettlementStatus: (auth: Auth, txHash: string) =>
    request<unknown>("GET", "/api/v6/pay/x402/settle/status", { params: { txHash }, auth }),
};
