import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMarketApi } = vi.hoisted(() => ({
  mockMarketApi: {
    supportedChain: vi.fn(), price: vi.fn(), candles: vi.fn(),
    trades: vi.fn(), historicalCandles: vi.fn(), searchToken: vi.fn(),
    tokenPriceInfo: vi.fn(), tokenBasicInfo: vi.fn(),
    tokenTopLiquidity: vi.fn(), tokenHot: vi.fn(), tokenHolders: vi.fn(),
    tokenClusterSupportedChain: vi.fn(), tokenClusterOverview: vi.fn(),
    tokenClusterList: vi.fn(), tokenClusterTopHolders: vi.fn(), tokenTopTrader: vi.fn(),
    signalSupportedChain: vi.fn(), signalList: vi.fn(),
    leaderboardSupportedChain: vi.fn(), leaderboardList: vi.fn(),
    memepumpSupported: vi.fn(), memepumpTokenList: vi.fn(), memepumpTokenDetails: vi.fn(),
    memepumpTokenDevInfo: vi.fn(), memepumpSimilarToken: vi.fn(), memepumpBundleInfo: vi.fn(),
    memepumpApedWallet: vi.fn(),
    portfolioSupportedChain: vi.fn(), portfolioOverview: vi.fn(),
    portfolioRecentPnl: vi.fn(), portfolioTokenLatestPnl: vi.fn(), portfolioDexHistory: vi.fn(),
    addressTrackerTrades: vi.fn(),
    socialNewsLatest: vi.fn(), socialNewsBySymbol: vi.fn(), socialNewsSearch: vi.fn(),
    socialNewsDetail: vi.fn(), socialNewsPlatforms: vi.fn(),
    socialSentimentSymbol: vi.fn(), socialSentimentRanking: vi.fn(),
    socialVibeTimeline: vi.fn(), socialVibeTopKols: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ marketApi: mockMarketApi }));

import { registerMarketTools } from "../tools/market.js";
import type { Auth } from "../adapters/shared.js";

interface RecordedTool { name: string; hints: Record<string, unknown>; handler: (...args: any[]) => any; }
function mockServer() { const tools: RecordedTool[] = []; return { tools, tool(name: string, ...rest: any[]) { tools.push({ name, hints: rest[rest.length - 2] as Record<string, unknown>, handler: rest[rest.length - 1] as (...args: any[]) => any }); } }; }
const auth: Auth = { apiKey: "k", secret: "s", passphrase: "p" };
const find = (s: ReturnType<typeof mockServer>, n: string) => s.tools.find(t => t.name === n)!;
const parse = (r: any) => JSON.parse(r.content[0].text);

describe("registerMarketTools", () => {
  let s: ReturnType<typeof mockServer>;
  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 45+ tools", () => { registerMarketTools(s as any, auth); expect(s.tools.length).toBeGreaterThanOrEqual(45); });

  it("all tools readOnly", () => { registerMarketTools(s as any, auth); for (const t of s.tools) { expect(t.hints.readOnlyHint).toBe(true); expect(t.hints.destructiveHint).toBe(false); } });

  it("price calls API with tokens array", async () => {
    mockMarketApi.price.mockResolvedValueOnce([{ usdPrice: "4500" }]);
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_market_price").handler({ tokens: [{ chainIndex: "1", tokenContractAddress: "" }] }));
    expect(mockMarketApi.price).toHaveBeenCalledWith(auth, [{ chainIndex: "1", tokenContractAddress: "" }]);
    expect(r.success).toBe(true);
  });

  it("candles calls API", async () => {
    mockMarketApi.candles.mockResolvedValueOnce([{ open: "100", close: "110" }]);
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_market_candles").handler({ chainIndex: "1", tokenContractAddress: "0xabc", bar: "1m", limit: "100" }));
    expect(r.success).toBe(true);
  });

  it("token_search calls API", async () => {
    mockMarketApi.searchToken.mockResolvedValueOnce([{ symbol: "ETH" }]);
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_token_search").handler({ chains: "1", search: "ETH" }));
    expect(r.success).toBe(true);
  });

  it("token_hot calls API", async () => {
    mockMarketApi.tokenHot.mockResolvedValueOnce([{ symbol: "HOT" }]);
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_token_hot").handler({ chainIndex: "1", rankingType: "4" }));
    expect(r.success).toBe(true);
  });

  it("token_basic_info calls API", async () => {
    mockMarketApi.tokenBasicInfo.mockResolvedValueOnce({ symbol: "ETH", decimals: 18 });
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_token_basic_info").handler({ chainIndex: "1", tokenContractAddress: "" }));
    expect(r.success).toBe(true);
  });

  it("auth null returns AUTH_REQUIRED", async () => {
    registerMarketTools(s as any, null);
    const r = parse(await find(s, "onchainos_market_supported_chain").handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("auth null for price returns AUTH_REQUIRED", async () => {
    registerMarketTools(s as any, null);
    const r = parse(await find(s, "onchainos_market_price").handler({ tokens: [{ chainIndex: "1", tokenContractAddress: "" }] }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("propagates RATE_LIMITED", async () => {
    mockMarketApi.price.mockRejectedValueOnce(new Error("429 Too Many"));
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_market_price").handler({ tokens: [{ chainIndex: "1", tokenContractAddress: "" }] }));
    expect(r.error.code).toBe("RATE_LIMITED");
  });

  it("propagates AUTH_ERROR", async () => {
    mockMarketApi.candles.mockRejectedValueOnce(new Error("OKX 50103: bad signature"));
    registerMarketTools(s as any, auth);
    const r = parse(await find(s, "onchainos_market_candles").handler({ chainIndex: "1", tokenContractAddress: "0xabc" }));
    expect(r.error.code).toBe("AUTH_ERROR");
  });
});
