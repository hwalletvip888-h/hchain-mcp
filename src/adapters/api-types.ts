/**
 * API Response Type Definitions — OKX OnchainOS v6
 * Provides type safety for adapter return values, reducing `as any` usage in tools layer.
 */

// ═══════════════════════════════════════════════════════════
// Balance API
// ═══════════════════════════════════════════════════════════
export interface ChainBalance {
  chainIndex: string;
  chainName: string;
  totalUsdValue: string;
}

export interface TotalWalletValue {
  totalUsdValue: string;
  chainBalances: ChainBalance[];
  tsIso: string;
}

export interface TokenBalance {
  chainIndex: string;
  tokenContractAddress: string;
  symbol: string;
  tokenName: string;
  decimals: string;
  balance: string;
  usdValue: string;
  price: string;
}

// ═══════════════════════════════════════════════════════════
// Gateway API
// ═══════════════════════════════════════════════════════════
export interface GasPriceResult {
  gasPrice: string;
  suggestedGas: string;
  fast: string;
  standard: string;
  slow: string;
  baseFee: string;
}

export interface GasLimitResult {
  gasLimit: string;
  gasUsed: string;
}

export interface SimulateResult {
  success: boolean;
  gasUsed: string;
  gasLimit: string;
  failReason?: string;
  logs?: unknown[];
}

export interface BroadcastResult {
  orderId: string;
  txHash: string;
}

// ═══════════════════════════════════════════════════════════
// Market / Token API
// ═══════════════════════════════════════════════════════════
export interface PriceData {
  usdPrice: string;
  usdPricePercentChange24h: string;
  chainIndex: string;
  tokenContractAddress: string;
}

export interface CandleData {
  ts: string;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
}

export interface TokenBasicData {
  tokenName: string;
  symbol: string;
  decimals: string;
  totalSupply: string;
  chainIndex: string;
  tokenContractAddress: string;
}

export interface TokenAdvancedData {
  isHoneypot: boolean;
  isHoneyPot: boolean;
  riskLevel: string;
  buyTax: string;
  sellTax: string;
  isOpenSource: boolean;
  isProxy: boolean;
  isMintable: boolean;
  canTakeBackOwnership: boolean;
  ownerAddress: string;
  creatorAddress: string;
}

export interface TokenHotEntry {
  chainIndex: string;
  tokenContractAddress: string;
  symbol: string;
  tokenName: string;
  price: string;
  priceChangePercent24h: string;
  volume24h: string;
  marketCap: string;
  holders: string;
}

export interface TokenHolderEntry {
  walletAddress: string;
  balance: string;
  percent: string;
  tag?: string;
}

export interface ClusterOverview {
  clusterCount: number;
  totalAddresses: number;
  rugPullPercent: string;
  newAddressPercent: string;
}

export interface TopTraderEntry {
  walletAddress: string;
  realizedPnl: string;
  winRate: string;
  totalTrades: string;
  tag?: string;
}

// ═══════════════════════════════════════════════════════════
// Trade / DEX API
// ═══════════════════════════════════════════════════════════
export interface SwapTx {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice?: string;
  gas?: string;
}

export interface SwapRawResult {
  tx: SwapTx;
  txHash?: string;
  signatureData?: unknown;
  orderId?: string;
}

export interface DexQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  priceImpactPercent: string;
  estimateGasFee: string;
  routeInfo: unknown[];
  dexRouter?: string;
}

// ═══════════════════════════════════════════════════════════
// DeFi API
// ═══════════════════════════════════════════════════════════
export interface DefiProduct {
  investmentId: string;
  productName: string;
  platformName: string;
  chainIndex: string;
  apy: string;
  tvl: string;
  tokenSymbol: string;
  productGroup: string;
  isInvestable: boolean;
}

export interface DefiProductDetail extends DefiProduct {
  feeRate: string;
  minAmount: string;
  maxAmount: string;
  description: string;
  status: string;
}

export interface DefiPosition {
  analysisPlatformId: string;
  platformName: string;
  chainIndex: string;
  positionCount: number;
  totalValueUsd: string;
}

export interface DefiRateChartData {
  ts: string;
  apy: string;
}

export interface DefiTvlChartData {
  ts: string;
  tvl: string;
}

// ═══════════════════════════════════════════════════════════
// Social / Sentiment API
// ═══════════════════════════════════════════════════════════
export interface SentimentData {
  tokenSymbol: string;
  bullish: string;
  bearish: string;
  neutral: string;
  score: string;
  level: string;
  trend: string;
}

export interface NewsArticle {
  articleId: string;
  title: string;
  summary: string;
  sentiment: string;
  importance: string;
  platform: string;
  url: string;
  publishedAt: string;
}

// ═══════════════════════════════════════════════════════════
// Intent / Signal API
// ═══════════════════════════════════════════════════════════
export interface IntentQuote {
  signData: unknown;
  priceImpactPercent: string;
  estimateGasFee: string;
  routeInfo: unknown[];
}

export interface IntentOrder {
  orderId: string;
  status: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  createdAt: string;
}

export interface SignalEntry {
  chainIndex: string;
  tokenContractAddress: string;
  walletType: string;
  amountUsd: string;
  tokenSymbol: string;
}

// ═══════════════════════════════════════════════════════════
// Portfolio API
// ═══════════════════════════════════════════════════════════
export interface PortfolioOverviewData {
  realizedPnl: string;
  unrealizedPnl: string;
  winRate: string;
  totalTrades: string;
  totalVolume: string;
  roi: string;
}

export interface PortfolioRecentPnlEntry {
  tokenSymbol: string;
  tokenContractAddress: string;
  realizedPnl: string;
  unrealizedPnl: string;
  winRate: string;
}

// ═══════════════════════════════════════════════════════════
// Generic / Utility
// ═══════════════════════════════════════════════════════════
export interface SupportedChain {
  chainIndex: string;
  chainName: string;
  nativeSymbol: string;
}

export interface ApiListResponse<T> {
  list: T[];
  total: string;
  cursor?: string;
}

// ═══════════════════════════════════════════════════════════
// Skill Result Types
// ═══════════════════════════════════════════════════════════
export interface StepResult {
  step: string;
  status: "ok" | "error" | "skipped";
  data?: unknown;
  error?: string;
}

export interface RiskScore {
  total_score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    contract_security: { score: number; issues: string[] };
    liquidity: { score: number; locked: boolean; total_usd: number };
    holder_distribution: { score: number; top10_pct: number };
    trading_behavior: { score: number; bundle_detected: boolean };
  };
  recommendation: string;
  red_flags: string[];
}

export interface PortfolioHealthScore {
  total_score: number;
  level: "HEALTHY" | "CAUTION" | "RISKY" | "DUST";
  breakdown: {
    diversification: { score: number; chain_count: number };
    concentration: { score: number; top_token_pct: number };
    performance: { score: number; pnl_30d: string };
    activity: { score: number; tx_count_30d: number };
  };
}
