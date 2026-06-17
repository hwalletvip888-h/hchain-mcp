/**
 * Onchain OS REST API 适配层
 * Base: https://web3.okx.com
 * 按官方文档逐端点对接，杜绝幻觉
 */
import crypto from "node:crypto";
import type { Auth } from "./shared.js";
import { OkxError } from "./shared.js";

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
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new OkxError(`HTTP_${res.status}`, t, res.status); }
  const json = await res.json() as { code: string; msg?: string; data?: T };
  if (json.code && json.code !== "0") throw new OkxError(json.code, json.msg ?? "");
  return (json.data ?? json) as T;
}

// ═══════════════════════════════════════════════════════════════
// 按官方文档逐模块添加
// ═══════════════════════════════════════════════════════════════

// ── Balance API v6 ─────────────────────────────────────────────

export const balanceApi = {
  /** GET /api/v6/dex/balance/supported/chain — 返回 name/logoUrl/shortName/chainIndex */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/balance/supported/chain", { auth }),

  /** GET /api/v6/dex/balance/total-value-by-address?address=&chains=&assetType=&excludeRiskToken= */
  totalValue: (auth: Auth, address: string, chains: string, assetType?: string, excludeRiskToken?: boolean) =>
    request("GET", "/api/v6/dex/balance/total-value-by-address", {
      params: { address, chains, assetType, excludeRiskToken },
      auth,
    }),

  /** GET /api/v6/dex/balance/all-token-balances-by-address?address=&chains=&excludeRiskToken= */
  allTokenBalances: (auth: Auth, address: string, chains: string, excludeRiskToken?: string) =>
    request("GET", "/api/v6/dex/balance/all-token-balances-by-address", {
      params: { address, chains, excludeRiskToken },
      auth,
    }),

  /** POST /api/v6/dex/balance/token-balances-by-address — body: { address, tokenContractAddresses: [{chainIndex, tokenContractAddress}], excludeRiskToken? } */
  specificTokenBalance: (
    auth: Auth,
    address: string,
    tokenContractAddresses: Array<{ chainIndex: string; tokenContractAddress: string }>,
    excludeRiskToken?: string,
  ) =>
    request("POST", "/api/v6/dex/balance/token-balances-by-address", {
      body: { address, tokenContractAddresses, ...(excludeRiskToken !== undefined ? { excludeRiskToken } : {}) },
      auth,
    }),
};

// ── Gateway API v6 (交易上链) ──────────────────────────────────

export const gatewayApi = {
  /** GET /api/v6/dex/pre-transaction/supported/chain */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/pre-transaction/supported/chain", { auth }),

  /** GET /api/v6/dex/pre-transaction/gas-price?chainIndex= */
  gasPrice: (auth: Auth, chainIndex: string) =>
    request("GET", "/api/v6/dex/pre-transaction/gas-price", { params: { chainIndex }, auth }),

  /** POST /api/v6/dex/pre-transaction/gas-limit */
  gasLimit: (auth: Auth, body: { chainIndex: string; fromAddress: string; toAddress: string; txAmount?: string; extJson?: { inputData?: string } }) =>
    request("POST", "/api/v6/dex/pre-transaction/gas-limit", { body, auth }),

  /** POST /api/v6/dex/pre-transaction/simulate — 模拟执行, 返回 intention/assetChange/gasUsed/failReason/risks */
  simulate: (auth: Auth, body: { fromAddress: string; toAddress: string; chainIndex: string; txAmount?: string; extJson: { inputData: string }; priorityFee?: string; gasPrice?: string }) =>
    request("POST", "/api/v6/dex/pre-transaction/simulate", { body, auth }),

  /** POST /api/v6/dex/pre-transaction/broadcast-transaction — 返回 orderId/txHash */
  broadcast: (auth: Auth, body: { signedTx: string; chainIndex: string; address: string; extraData?: string }) =>
    request("POST", "/api/v6/dex/pre-transaction/broadcast-transaction", { body, auth }),
};

// ── Post-transaction API v6 ───────────────────────────────────

export const postTxApi = {
  /** GET /api/v6/dex/post-transaction/orders — 广播订单列表 */
  orders: (auth: Auth, address: string, chainIndex: string, txStatus?: string, orderId?: string, cursor?: string, limit?: string) =>
    request("GET", "/api/v6/dex/post-transaction/orders", {
      params: { address, chainIndex, txStatus, orderId, cursor, limit },
      auth,
    }),

  /** GET /api/v6/dex/post-transaction/supported/chain — 交易历史支持的链 */
  supportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/post-transaction/supported/chain", { auth }),

  /** GET /api/v6/dex/post-transaction/transactions-by-address?address=&chains=&tokenContractAddress=&begin=&end=&cursor=&limit= */
  transactions: (auth: Auth, address: string, chains: string, tokenContractAddress?: string, begin?: string, end?: string, cursor?: string, limit?: string) =>
    request("GET", "/api/v6/dex/post-transaction/transactions-by-address", {
      params: { address, chains, tokenContractAddress, begin, end, cursor, limit },
      auth,
    }),

  /** GET /api/v6/dex/post-transaction/transaction-detail-by-txhash?chainIndex=&txHash=&itype= */
  transactionDetail: (auth: Auth, chainIndex: string, txHash: string, itype?: string) =>
    request("GET", "/api/v6/dex/post-transaction/transaction-detail-by-txhash", {
      params: { chainIndex, txHash, itype },
      auth,
    }),
};

// ── DeFi API v6 ──────────────────────────────────────────────

export const defiApi = {
  /** GET /api/v6/defi/product/supported-chains — 返回 chainIndex(String)+network */
  supportedChains: (auth: Auth) =>
    request("GET", "/api/v6/defi/product/supported-chains", { auth }),

  /** GET /api/v6/defi/product/supported-platforms — 返回 analysisPlatformId+platformName+investmentCount */
  supportedPlatforms: (auth: Auth) =>
    request("GET", "/api/v6/defi/product/supported-platforms", { auth }),

  /** POST /api/v6/defi/product/search — body: { tokenKeywordList, platformKeywordList?, pageNum?, chainIndex?, productGroup? } */
  searchProducts: (auth: Auth, body: { tokenKeywordList: string[]; platformKeywordList?: string[]; pageNum?: number; chainIndex?: string; productGroup?: string }) =>
    request("POST", "/api/v6/defi/product/search", { body, auth }),

  /** GET /api/v6/defi/product/detail?investmentId= */
  productDetail: (auth: Auth, investmentId: string) =>
    request("GET", "/api/v6/defi/product/detail", { params: { investmentId }, auth }),

  /** GET /api/v6/defi/product/rate/chart?investmentId=&timeRange= — APY 折线图 */
  rateChart: (auth: Auth, investmentId: string, timeRange?: string) =>
    request("GET", "/api/v6/defi/product/rate/chart", { params: { investmentId, timeRange }, auth }),

  /** GET /api/v6/defi/product/tvl/chart?investmentId=&timeRange= — TVL 折线图 */
  tvlChart: (auth: Auth, investmentId: string, timeRange?: string) =>
    request("GET", "/api/v6/defi/product/tvl/chart", { params: { investmentId, timeRange }, auth }),

  /** GET /api/v6/defi/product/depth-price/chart?investmentId=&chartType=&timeRange= — V3 深度/价格图 */
  depthPriceChart: (auth: Auth, investmentId: string, chartType?: string, timeRange?: string) =>
    request("GET", "/api/v6/defi/product/depth-price/chart", { params: { investmentId, chartType, timeRange }, auth }),

  /** POST /api/v6/defi/product/detail/prepare — 交易前准备, 返回 investWithTokenList/receiveTokenInfo */
  prepareTransaction: (auth: Auth, investmentId: string) =>
    request("POST", "/api/v6/defi/product/detail/prepare", { body: { investmentId }, auth }),

  /** POST /api/v6/defi/calculator/enter/info — V3 Pool 双币分配计算 */
  calcEnterInfo: (auth: Auth, body: { inputAmount: string; inputTokenAddress: string; tokenDecimal: string; investmentId: string; address: string; tickLower: string; tickUpper: string }) =>
    request("POST", "/api/v6/defi/calculator/enter/info", { body, auth }),

  /** POST /api/v6/defi/transaction/enter — 申购/存款/借款, 返回 dataList(APPROVE→DEPOSIT) */
  enter: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/defi/transaction/enter", { body, auth }),

  /** POST /api/v6/defi/transaction/exit — 赎回/还款, 返回 dataList */
  exit: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/defi/transaction/exit", { body, auth }),

  /** POST /api/v6/defi/transaction/claim — 领取奖励, 返回 dataList */
  claim: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/defi/transaction/claim", { body, auth }),

  /** POST /api/v6/defi/user/asset/platform/list — 用户持仓概览(协议维度) */
  userPlatformList: (auth: Auth, body: { walletAddressList: Array<{ chainIndex: string; walletAddress: string; pubKey?: string }>; tag?: string }) =>
    request("POST", "/api/v6/defi/user/asset/platform/list", { body, auth }),

  /** POST /api/v6/defi/user/asset/platform/detail — 用户持仓明细(投资品维度) */
  userPlatformDetail: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/defi/user/asset/platform/detail", { body, auth }),
};

// ── Payments API (Agent Payments Protocol) ──────────────────
// 路径来源: API 参考 (HTTP端 + Agent端)

export const paymentsApi = {
  // ── Agent 端 A2A (单次支付) ────────────────────────────

  /** POST /api/v6/pay/a2a/payment/create — Seller 创建付款, 返回 paymentId+challenge+付款链接 */
  create: (auth: Auth, body: { type: string; amount: string; symbol: string; recipient: string; description?: string; externalId?: string; expiresIn?: number; realm?: string; deliveries?: Record<string, unknown> }) =>
    request("POST", "/api/v6/pay/a2a/payment/create", { body, auth }),

  /** GET /api/v6/pay/a2a/p/{paymentId} — Buyer 拉取付款详情, PUBLIC */
  detail: (paymentId: string) =>
    request("GET", `/api/v6/pay/a2a/p/${paymentId}`),

  /** POST /api/v6/pay/a2a/p/{paymentId}/credential — Buyer 提交 EIP-3009 签名凭证, PUBLIC */
  submit: (paymentId: string, body: Record<string, unknown>) =>
    request("POST", `/api/v6/pay/a2a/p/${paymentId}/credential`, { body }),

  /** GET /api/v6/pay/a2a/p/{paymentId}/status — 查询支付状态, PUBLIC */
  status: (paymentId: string) =>
    request("GET", `/api/v6/pay/a2a/p/${paymentId}/status`),

  // ── HTTP 端 x402 (单次/批量) ──────────────────────────

  /** GET /api/v6/pay/x402/supported — 支持的网络/代币/scheme */
  supported: (auth: Auth) =>
    request("GET", "/api/v6/pay/x402/supported", { auth }),

  /** POST /api/v6/pay/x402/verify — 验签 */
  verify: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/pay/x402/verify", { body, auth }),

  /** POST /api/v6/pay/x402/settle — 上链结算 */
  settle: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/pay/x402/settle", { body, auth }),

  /** GET /api/v6/pay/x402/settle/status?txHash= — 轮询结算状态 */
  settleStatus: (auth: Auth, txHash: string) =>
    request("GET", "/api/v6/pay/x402/settle/status", { params: { txHash }, auth }),
};

// ── Trade / DEX API v6 (经典兑换) ────────────────────────────
// 来源: Solana/EVM/Sui/Ton 搭建指南 + API 参考

export const tradeApi = {
  /** GET /api/v6/dex/aggregator/supported/chain?chainIndex= — 返回 chainIndex/chainName/dexTokenApproveAddress */
  supportedChain: (auth: Auth, chainIndex?: string) =>
    request("GET", "/api/v6/dex/aggregator/supported/chain", { params: { chainIndex }, auth }),

  allTokens: (auth: Auth, chainIndex: string) =>
    request("GET", "/api/v6/dex/aggregator/all-tokens", { params: { chainIndex }, auth }),

  liquidity: (auth: Auth, chainIndex: string) =>
    request("GET", "/api/v6/dex/aggregator/get-liquidity", { params: { chainIndex }, auth }),

  approveTransaction: (auth: Auth, chainIndex: string, tokenContractAddress: string, approveAmount: string) =>
    request("GET", "/api/v6/dex/aggregator/approve-transaction", { params: { chainIndex, tokenContractAddress, approveAmount }, auth }),

  quote: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/aggregator/quote", { params, auth }),

  swap: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/aggregator/swap", { params, auth }),

  swapInstruction: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/aggregator/swap-instruction", { params, auth }),

  swapHistory: (auth: Auth, chainIndex: string, txHash: string, isFromMyProject?: boolean) =>
    request("GET", "/api/v6/dex/aggregator/history", { params: { chainIndex, txHash, isFromMyProject }, auth }),
};

// ── Intent Swap API v6 ──────────────────────────────────────

export const intentApi = {
  /** GET /api/v6/dex/aggregator/quote with mode=intent — 意图模式报价(支持跨链), 返回 signData 含 EIP-712 签名字段 */
  quote: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/aggregator/quote", { params: { ...params, mode: "intent" }, auth }),

  /** POST /api/v6/dex/aggregator/intent/create-order — 创建意图订单, 返回 orderUid */
  createOrder: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/aggregator/intent/create-order", { body, auth }),

  /** GET /api/v6/dex/aggregator/intent/order-list?userWalletAddress=&orderUid=&cursor=&limit= — 订单列表 */
  orderList: (auth: Auth, params: { userWalletAddress?: string; orderUid?: string; cursor?: string; limit?: number }) =>
    request("GET", "/api/v6/dex/aggregator/intent/order-list", { params, auth }),

  /** GET /api/v6/dex/aggregator/intent/order-status?orderUid= — 查订单状态 */
  orderStatus: (auth: Auth, orderUid: string) =>
    request("GET", "/api/v6/dex/aggregator/intent/order-status", { params: { orderUid }, auth }),

  /** POST /api/v6/dex/aggregator/intent/cancel-signdata — 获取取消签名数据 */
  cancelSignData: (auth: Auth, userWalletAddress: string, orderUid: string) =>
    request("POST", "/api/v6/dex/aggregator/intent/cancel-signdata", { body: { userWalletAddress, orderUid }, auth }),

  /** POST /api/v6/dex/aggregator/intent/cancel-order — 取消订单 */
  cancelOrder: (auth: Auth, userWalletAddress: string, orderUid: string, signature: string) =>
    request("POST", "/api/v6/dex/aggregator/intent/cancel-order", { body: { userWalletAddress, orderUid, signature }, auth }),

  /** GET /api/v6/dex/aggregator/intent/auction-info?auctionId=&txHash= — 查拍卖结果 */
  auctionInfo: (auth: Auth, params: { auctionId?: string; txHash?: string }) =>
    request("GET", "/api/v6/dex/aggregator/intent/auction-info", { params, auth }),
};

// ── Market API v6 (行情 — x402 付费) ──────────────────────

export const marketApi = {
  /** GET /api/v6/dex/market/supported/chain?chainIndex= */
  supportedChain: (auth: Auth, chainIndex?: string) =>
    request("GET", "/api/v6/dex/market/supported/chain", { params: { chainIndex }, auth }),

  /** POST /api/v6/dex/market/price — body: [{chainIndex, tokenContractAddress}] */
  price: (auth: Auth, body: Array<{ chainIndex: string; tokenContractAddress: string }>) =>
    request("POST", "/api/v6/dex/market/price", { body, auth }),

  /** GET /api/v6/dex/market/candles?chainIndex=&tokenContractAddress=&bar=&after=&before=&limit= */
  candles: (auth: Auth, params: { chainIndex: string; tokenContractAddress: string; bar?: string; after?: string; before?: string; limit?: string }) =>
    request("GET", "/api/v6/dex/market/candles", { params, auth }),

  /** GET /api/v6/dex/market/historical-candles?chainIndex=&tokenContractAddress=&bar=&after=&before=&limit= */
  historicalCandles: (auth: Auth, params: { chainIndex: string; tokenContractAddress: string; bar?: string; after?: string; before?: string; limit?: string }) =>
    request("GET", "/api/v6/dex/market/historical-candles", { params, auth }),

  // ── 综合币价 ──────────────────────────────────────

  /** POST /api/v6/dex/index/current-price — body: [{chainIndex, tokenContractAddress}] */
  indexCurrentPrice: (auth: Auth, body: Array<{ chainIndex: string; tokenContractAddress: string }>) =>
    request("POST", "/api/v6/dex/index/current-price", { body, auth }),

  /** GET /api/v6/dex/index/historical-price?chainIndex=&tokenContractAddress=&limit=&cursor=&begin=&end=&period= */
  indexHistoricalPrice: (auth: Auth, params: { chainIndex: string; tokenContractAddress?: string; limit?: string; cursor?: string; begin?: string; end?: string; period?: string }) =>
    request("GET", "/api/v6/dex/index/historical-price", { params, auth }),

  // ── 代币 API ──────────────────────────────────────

  /** GET /api/v6/dex/market/token/search?chains=&search=&cursor=&limit= — 搜索代币 */
  searchToken: (auth: Auth, chains: string, search: string, cursor?: string, limit?: string) =>
    request("GET", "/api/v6/dex/market/token/search", { params: { chains, search, cursor, limit }, auth }),

  /** POST /api/v6/dex/market/token/basic-info — body: [{chainIndex, tokenContractAddress}] */
  tokenBasicInfo: (auth: Auth, body: Array<{ chainIndex: string; tokenContractAddress: string }>) =>
    request("POST", "/api/v6/dex/market/token/basic-info", { body, auth }),

  /** GET /api/v6/dex/market/token/top-liquidity?chainIndex=&tokenContractAddress= — 流动性池 */
  tokenTopLiquidity: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/token/top-liquidity", { params: { chainIndex, tokenContractAddress }, auth }),

  /** POST /api/v6/dex/market/price-info — 批量交易信息, body: [{chainIndex, tokenContractAddress}], max 100 */
  priceInfo: (auth: Auth, body: Array<{ chainIndex: string; tokenContractAddress: string }>) =>
    request("POST", "/api/v6/dex/market/price-info", { body, auth }),

  /** GET /api/v6/dex/market/token/advanced-info?chainIndex=&tokenContractAddress= — 代币安全分析(貔貅/开发者/狙击手) */
  tokenAdvancedInfo: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/token/advanced-info", { params: { chainIndex, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/token/hot-token?rankingType=&chainIndex=&rankBy=... — 热门代币(最多100) */
  tokenHot: (auth: Auth, params: Record<string, string | number | boolean | undefined>) =>
    request("GET", "/api/v6/dex/market/token/hot-token", { params, auth }),

  /** GET /api/v6/dex/market/token/holder?chainIndex=&tokenContractAddress=&tagFilter=&cursor=&limit= — 前100持有人 */
  tokenHolder: (auth: Auth, params: { chainIndex: string; tokenContractAddress: string; tagFilter?: string; cursor?: string; limit?: string }) =>
    request("GET", "/api/v6/dex/market/token/holder", { params, auth }),

  /** GET /api/v6/dex/market/token/cluster/supported/chain — 聚类支持链 */
  tokenClusterSupportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/token/cluster/supported/chain", { auth }),

  /** GET /api/v6/dex/market/token/cluster/overview?chainIndex=&tokenContractAddress= — 持仓集中度 */
  tokenClusterOverview: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/token/cluster/overview", { params: { chainIndex, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/token/cluster/list?chainIndex=&tokenContractAddress= — 聚类列表(top100集群) */
  tokenClusterList: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/token/cluster/list", { params: { chainIndex, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/token/cluster/top-holders?chainIndex=&tokenContractAddress=&rangeFilter= — 前10/50/100持仓 */
  tokenClusterTopHolders: (auth: Auth, chainIndex: string, tokenContractAddress: string, rangeFilter: string) =>
    request("GET", "/api/v6/dex/market/token/cluster/top-holders", { params: { chainIndex, tokenContractAddress, rangeFilter }, auth }),

  /** GET /api/v6/dex/market/token/top-trader?chainIndex=&tokenContractAddress=&tagFilter=&cursor=&limit= — 前100盈利地址 */
  tokenTopTrader: (auth: Auth, params: { chainIndex: string; tokenContractAddress: string; tagFilter?: string; cursor?: string; limit?: string }) =>
    request("GET", "/api/v6/dex/market/token/top-trader", { params, auth }),

  // ── 信号 API ──────────────────────────────────────

  /** GET /api/v6/dex/market/signal/supported/chain — 信号支持链 */
  signalSupportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/signal/supported/chain", { auth }),

  /** POST /api/v6/dex/market/signal/list — 获取信号 */
  signalList: (auth: Auth, body: Record<string, unknown>) =>
    request("POST", "/api/v6/dex/market/signal/list", { body, auth }),

  /** GET /api/v6/dex/market/leaderboard/supported/chain — 聪明钱榜单支持链 */
  leaderboardSupportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/leaderboard/supported/chain", { auth }),

  /** GET /api/v6/dex/market/leaderboard/list?chainIndex=&timeFrame=&sortBy=&walletType=... — 聪明钱榜单 */
  leaderboardList: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/leaderboard/list", { params, auth }),

  // ── Memepump / 扫链 ──────────────────────────────────

  /** GET /api/v6/dex/market/memepump/supported/chainsProtocol — 支持的链+协议 */
  memepumpSupported: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/memepump/supported/chainsProtocol", { auth }),

  /** GET /api/v6/dex/market/memepump/tokenList?chainIndex=&stage=&... — 代币列表(最多30) */
  memepumpTokenList: (auth: Auth, params: Record<string, string | boolean | undefined>) =>
    request("GET", "/api/v6/dex/market/memepump/tokenList", { params, auth }),

  /** GET /api/v6/dex/market/memepump/tokenDetails?chainIndex=&tokenContractAddress=&walletAddress= */
  memepumpTokenDetails: (auth: Auth, chainIndex: string, tokenContractAddress: string, walletAddress?: string) =>
    request("GET", "/api/v6/dex/market/memepump/tokenDetails", { params: { chainIndex, tokenContractAddress, walletAddress }, auth }),

  /** GET /api/v6/dex/market/memepump/tokenDevInfo?chainIndex=&tokenContractAddress= */
  memepumpTokenDevInfo: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/memepump/tokenDevInfo", { params: { chainIndex, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/memepump/similarToken?chainIndex=&tokenContractAddress= */
  memepumpSimilarToken: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/memepump/similarToken", { params: { chainIndex, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/memepump/tokenBundleInfo?chainIndex=&tokenContractAddress= */
  memepumpBundleInfo: (auth: Auth, chainIndex: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/memepump/tokenBundleInfo", { params: { chainIndex, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/memepump/apedWallet?chainIndex=&tokenContractAddress=&walletAddress= */
  memepumpApedWallet: (auth: Auth, chainIndex: string, tokenContractAddress: string, walletAddress?: string) =>
    request("GET", "/api/v6/dex/market/memepump/apedWallet", { params: { chainIndex, tokenContractAddress, walletAddress }, auth }),

  // ── Portfolio / 地址分析 ─────────────────────────────

  /** GET /api/v6/dex/market/portfolio/supported/chain */
  portfolioSupportedChain: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/portfolio/supported/chain", { auth }),

  /** GET /api/v6/dex/market/portfolio/overview?chainIndex=&walletAddress=&timeFrame= */
  portfolioOverview: (auth: Auth, chainIndex: string, walletAddress: string, timeFrame: string) =>
    request("GET", "/api/v6/dex/market/portfolio/overview", { params: { chainIndex, walletAddress, timeFrame }, auth }),

  /** GET /api/v6/dex/market/portfolio/recent-pnl?chainIndex=&walletAddress=&cursor=&limit= */
  portfolioRecentPnl: (auth: Auth, params: { chainIndex: string; walletAddress: string; cursor?: string; limit?: string }) =>
    request("GET", "/api/v6/dex/market/portfolio/recent-pnl", { params, auth }),

  /** GET /api/v6/dex/market/portfolio/token/latest-pnl?chainIndex=&walletAddress=&tokenContractAddress= */
  portfolioTokenLatestPnl: (auth: Auth, chainIndex: string, walletAddress: string, tokenContractAddress: string) =>
    request("GET", "/api/v6/dex/market/portfolio/token/latest-pnl", { params: { chainIndex, walletAddress, tokenContractAddress }, auth }),

  /** GET /api/v6/dex/market/portfolio/dex-history?chainIndex=&walletAddress=&begin=&end=&... */
  portfolioDexHistory: (auth: Auth, params: { chainIndex: string; walletAddress: string; begin: string; end: string; tokenContractAddress?: string; type?: string; cursor?: string; limit?: string }) =>
    request("GET", "/api/v6/dex/market/portfolio/dex-history", { params, auth }),

  /** GET /api/v6/dex/market/address-tracker/trades?trackerType=&walletAddress=&tradeType=... */
  addressTrackerTrades: (auth: Auth, params: { trackerType: string; walletAddress?: string; tradeType?: string; chainIndex?: string; minVolume?: string; maxVolume?: string; minHolders?: string; minMarketCap?: string; maxMarketCap?: string; minLiquidity?: string; maxLiquidity?: string }) =>
    request("GET", "/api/v6/dex/market/address-tracker/trades", { params, auth }),

  // ── Social / 社媒 ──────────────────────────────────

  /** GET /api/v6/dex/market/social/news/latest */
  socialNewsLatest: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/news/latest", { params, auth }),

  /** GET /api/v6/dex/market/social/news/by-symbol */
  socialNewsBySymbol: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/news/by-symbol", { params, auth }),

  /** GET /api/v6/dex/market/social/news/search */
  socialNewsSearch: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/news/search", { params, auth }),

  /** GET /api/v6/dex/market/social/news/detail?articleId= */
  socialNewsDetail: (auth: Auth, articleId: string, language?: string) =>
    request("GET", "/api/v6/dex/market/social/news/detail", { params: { articleId, language }, auth }),

  /** GET /api/v6/dex/market/social/news/platforms */
  socialNewsPlatforms: (auth: Auth) =>
    request("GET", "/api/v6/dex/market/social/news/platforms", { auth }),

  /** GET /api/v6/dex/market/social/sentiment/symbol?tokenSymbols=&timeFrame=&trendPoints= */
  socialSentimentSymbol: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/sentiment/symbol", { params, auth }),

  /** GET /api/v6/dex/market/social/sentiment/ranking?timeFrame=&sortBy=&limit= */
  socialSentimentRanking: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/sentiment/ranking", { params, auth }),

  /** GET /api/v6/dex/market/social/vibe/timeline?chainIndex=&tokenAddress=&timeFrame= */
  socialVibeTimeline: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/vibe/timeline", { params, auth }),

  /** GET /api/v6/dex/market/social/vibe/top-kols?chainIndex=&tokenAddress=&sortBy=&timeFrame=&limit= */
  socialVibeTopKols: (auth: Auth, params: Record<string, string>) =>
    request("GET", "/api/v6/dex/market/social/vibe/top-kols", { params, auth }),

  /** GET /api/v6/dex/market/trades?chainIndex=&tokenContractAddress=&after=&limit=&tagFilter=&walletAddressFilter= */
  trades: (auth: Auth, params: { chainIndex: string; tokenContractAddress: string; after?: string; limit?: string; tagFilter?: string; walletAddressFilter?: string }) =>
    request("GET", "/api/v6/dex/market/trades", { params, auth }),
};
