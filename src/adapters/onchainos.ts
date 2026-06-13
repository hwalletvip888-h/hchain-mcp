/**
 * Onchain OS REST API 适配层
 *
 * 基于 OnchainOS-API对接规范.md §4 适配器模板
 * 公开端点 → onchainosApi (无 auth)
 * 鉴权端点 → onchainosPrivateApi (需 auth)
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

// ── 公开接口 ──────────────────────────────────────────────────

export const onchainosApi = {
  // Market — 行情价格
  getPrice: (chainId: number, tokenAddress: string) =>
    request<unknown>("GET", "/api/v6/dex/market/price", { params: { chainId, tokenAddress } }),

  // Market — 搜索代币
  searchToken: (keyword: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/search", { params: { keyword } }),

  // Market — K 线
  getCandlesticks: (chainId: number, tokenAddress: string, period: string, after?: string, before?: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/candlesticks", { params: { chainId, tokenAddress, period, after, before } }),

  // Market — K 线历史
  getCandlesticksHistory: (chainId: number, tokenAddress: string, period: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/candlesticks-history", { params: { chainId, tokenAddress, period } }),

  // Payments — 获取支持的支付方案和网络（公开）
  getSupportedPaymentInfo: () =>
    request<unknown>("GET", "/api/v6/dex/payments/supported-info"),

  // Market — 代币详细信息
  getTokenInfo: (chainId: number, tokenAddress: string) =>
    request<unknown>("GET", "/api/v6/dex/market/token-info", { params: { chainId, tokenAddress } }),

  // Trade — 支持的链
  getSupportedChains: () =>
    request<unknown[]>("GET", "/api/v6/dex/aggregator/supported-chains"),

  // Trade — 获取代币列表
  getTokens: (chainId: number) =>
    request<unknown[]>("GET", "/api/v6/dex/aggregator/tokens", { params: { chainId } }),

  // Trade — 获取报价
  getQuote: (params: Record<string, string | number>) =>
    request<unknown>("GET", "/api/v6/dex/aggregator/quote", { params }),

  // Trade — 获取 Solana swap instructions
  getSolanaSwapInstructions: (params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/aggregator/solana/swap-instructions", { body: params }),
};

// ── 鉴权接口 ──────────────────────────────────────────────────

export const onchainosPrivateApi = {
  // Wallet — 余额查询
  getBalance: (auth: Auth, address: string, chainId: number) =>
    request<unknown[]>("GET", "/api/v6/dex/asset/balance", { params: { address, chainId }, auth }),

  // Wallet — 交易历史
  getTransactionHistory: (auth: Auth, address: string, chainId: number, limit?: number) =>
    request<unknown[]>("GET", "/api/v6/dex/asset/transaction-history", { params: { address, chainId, limit }, auth }),

  // Wallet — 交易详情
  getTransactionDetail: (auth: Auth, txHash: string, chainId: number) =>
    request<unknown>("GET", "/api/v6/dex/asset/transaction-detail", { params: { txHash, chainId }, auth }),

  // Gateway — Gas 价格
  getGasPrice: (auth: Auth, chainId: number) =>
    request<unknown>("GET", "/api/v6/dex/onchain-gateway/gas-price", { params: { chainId }, auth }),

  // Gateway — Gas 限制
  getGasLimit: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/onchain-gateway/gas-limit", { body: params, auth }),

  // Gateway — 模拟交易
  simulateTransaction: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/onchain-gateway/simulate-transaction", { body: params, auth }),

  // Gateway — 广播交易
  broadcastTransaction: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/onchain-gateway/broadcast-transaction", { body: params, auth }),

  // Gateway — 查询订单状态
  getOrderStatus: (auth: Auth, orderId: string) =>
    request<unknown>("GET", "/api/v6/dex/onchain-gateway/orders", { params: { orderId }, auth }),

  // Trade — 授权交易 (approve)
  approveTransaction: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/aggregator/approve-transaction", { body: params, auth }),

  // Trade — Swap
  swap: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/aggregator/swap", { body: params, auth }),

  // Payments — 支付验证
  verifyPayment: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/payments/verify", { body: params, auth }),

  // Payments — 结算
  settlePayment: (auth: Auth, params: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/payments/settle", { body: params, auth }),

  // Payments — 查询结算状态
  getSettlementStatus: (auth: Auth, settlementId: string) =>
    request<unknown>("GET", "/api/v6/dex/payments/settlement", { params: { settlementId }, auth }),
};
