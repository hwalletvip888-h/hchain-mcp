/**
 * Skills 模块测试 — 辅助函数 + buildSwapPipeline + Schema + Auth
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTradeApi, mockGatewayApi, mockMarketApi, mockIntentApi, mockPostTxApi, mockDefiApi, mockBalanceApi, mockWsModule } = vi.hoisted(() => ({
  mockTradeApi: { quote: vi.fn(), swap: vi.fn(), approveTransaction: vi.fn() },
  mockGatewayApi: { simulate: vi.fn(), gasPrice: vi.fn() },
  mockMarketApi: {
    price: vi.fn(), tokenAdvancedInfo: vi.fn(), tokenClusterOverview: vi.fn(),
    memepumpBundleInfo: vi.fn(), memepumpTokenDevInfo: vi.fn(),
    signalList: vi.fn(), socialSentimentSymbol: vi.fn(), socialVibeTimeline: vi.fn(),
    socialNewsBySymbol: vi.fn(), socialVibeTopKols: vi.fn(), socialSentimentRanking: vi.fn(),
    portfolioOverview: vi.fn(),
  },
  mockIntentApi: { quote: vi.fn() },
  mockPostTxApi: { transactionDetail: vi.fn() },
  mockDefiApi: {
    searchProducts: vi.fn(), productDetail: vi.fn(), rateChart: vi.fn(),
    prepareTransaction: vi.fn(), enter: vi.fn(),
    userPlatformList: vi.fn(), userPlatformDetail: vi.fn(),
  },
  mockBalanceApi: { allTokenBalances: vi.fn(), totalValue: vi.fn() },
  mockWsModule: { wsConnect: vi.fn(), wsSubscribe: vi.fn() },
}));

vi.mock("../adapters/onchainos.js", () => ({ tradeApi: mockTradeApi, gatewayApi: mockGatewayApi, marketApi: mockMarketApi, intentApi: mockIntentApi, postTxApi: mockPostTxApi, defiApi: mockDefiApi, balanceApi: mockBalanceApi }));
vi.mock("../adapters/onchainos-ws.js", () => mockWsModule);

import { registerSkillTools } from "../tools/skills.js";
import type { Auth } from "../adapters/shared.js";
import { errMsg } from "../adapters/shared.js";

interface RecordedTool { name: string; description: string; schema: Record<string, unknown>; hints: Record<string, unknown>; handler: (...args: any[]) => any; }

function mockServer() {
  const tools: RecordedTool[] = [];
  return { tools, tool(name: string, ...rest: any[]) { tools.push({ name, description: rest[0], schema: (rest[1] ?? {}) as Record<string, unknown>, hints: rest[2] as Record<string, unknown>, handler: rest[3] as (...args: any[]) => any }); } };
}

const auth: Auth = { apiKey: "k", secret: "s", passphrase: "p" };
const find = (srv: ReturnType<typeof mockServer>, n: string) => srv.tools.find(t => t.name === n)!;
const parse = (r: any) => JSON.parse(r.content[0].text);

const Q_OK = { priceImpactPercent: "0.5", estimateGasFee: "0.001" };
const AP_OK = { txHash: "0xapprovehash" };
const SW_OK = { tx: { to: "0xrouterabc", data: "0xdeadbeef", value: "500000000000000000", gasPrice: "10000000000", gas: "250000" } };
const SIM_OK = { intention: "success", gasUsed: "150000" };

const TP = { chainIndex: "1", fromTokenAddress: "0xusdc", toTokenAddress: "0xabc", amount: "1000000", userWalletAddress: "0xuser123", slippagePercent: "0.5", gasLevel: "average" as const };

describe("registerSkillTools", () => {
  let s: ReturnType<typeof mockServer>;
  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  describe("registration", () => {
    it("registers 18 tools", () => { registerSkillTools(s as any, auth); expect(s.tools).toHaveLength(18); });
    it("all names match onchainos_skill_ prefix", () => { registerSkillTools(s as any, auth); for (const t of s.tools) expect(t.name).toMatch(/^onchainos_skill_/); });
  });

  describe("auth — null returns AUTH_REQUIRED", () => {
    it("risk_detect: READ", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_risk_detect").handler({ chainIndex: "1", tokenContractAddress: "0xabc" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("READ"); });
    it("trade_pipeline: TRADE", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler({})); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("TRADE"); });
    it("price_alert: READ", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_price_alert").handler({ chainIndex: "1", tokenContractAddress: "0xabc", targetPrice: "2000", condition: "above" })); expect(r.error.code).toBe("AUTH_REQUIRED"); });
    it("crosschain_swap: TRADE", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_crosschain_swap").handler({ fromChain: "1", toChain: "501", fromTokenAddress: "0xusdc", toTokenAddress: "0xsol", amount: "1000000", userWalletAddress: "0xuser" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("TRADE"); });
  });

  describe("errMsg", () => {
    it("extracts Error message", () => { expect(errMsg(new Error("oh no"))).toBe("oh no"); });
    it("stringifies non-Error", () => { expect(errMsg("raw")).toBe("raw"); expect(errMsg(99)).toBe("99"); });
  });

  describe("isNative — approve skip", () => {
    const setup = () => { mockTradeApi.quote.mockResolvedValueOnce(Q_OK); mockTradeApi.swap.mockResolvedValueOnce(SW_OK); mockGatewayApi.simulate.mockResolvedValueOnce(SIM_OK); };
    it("empty string → skipped", async () => { setup(); registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler({ ...TP, fromTokenAddress: "" })); expect(r.data.steps.find((st: any) => st.step === "approve")!.status).toBe("skipped"); });
    it("0x0000 → skipped", async () => { setup(); registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler({ ...TP, fromTokenAddress: "0x0000000000000000000000000000000000000000" })); expect(r.data.steps.find((st: any) => st.step === "approve")!.status).toBe("skipped"); });
  });

  describe("buildSwapPipeline (via trade_pipeline)", () => {
    it("full success: quote→approve→swap→simulate", async () => {
      mockTradeApi.quote.mockResolvedValueOnce(Q_OK); mockTradeApi.approveTransaction.mockResolvedValueOnce(AP_OK); mockTradeApi.swap.mockResolvedValueOnce(SW_OK); mockGatewayApi.simulate.mockResolvedValueOnce(SIM_OK);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler(TP));
      expect(r.data.steps).toHaveLength(4); expect(r.data.steps.every((st: any) => st.status === "ok")).toBe(true);
      expect(r.data.calldata.to).toBe("0xrouterabc"); expect(r.data.summary.status).toBe("ready");
    });
    it("quote failure → failedAt=quote", async () => {
      mockTradeApi.quote.mockRejectedValueOnce(new Error("insufficient liquidity"));
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler(TP));
      expect(r.data.summary.status).toBe("failed"); expect(r.data.summary.failedAt).toBe("quote");
    });
    it("swap failure → failedAt=swap", async () => {
      mockTradeApi.quote.mockResolvedValueOnce(Q_OK); mockTradeApi.approveTransaction.mockResolvedValueOnce(AP_OK); mockTradeApi.swap.mockRejectedValueOnce(new Error("slippage"));
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler(TP));
      expect(r.data.summary.failedAt).toBe("swap");
    });
    it("simulate failure → warning, calldata still returned", async () => {
      mockTradeApi.quote.mockResolvedValueOnce(Q_OK); mockTradeApi.approveTransaction.mockResolvedValueOnce(AP_OK); mockTradeApi.swap.mockResolvedValueOnce(SW_OK); mockGatewayApi.simulate.mockRejectedValueOnce(new Error("reverted"));
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler(TP));
      expect(r.data.steps.find((st: any) => st.step === "simulate")!.status).toBe("error");
      expect(r.data.calldata).toBeDefined();
    });
    it("approve failure → non-fatal, swap proceeds", async () => {
      mockTradeApi.quote.mockResolvedValueOnce(Q_OK); mockTradeApi.approveTransaction.mockRejectedValueOnce(new Error("rejected")); mockTradeApi.swap.mockResolvedValueOnce(SW_OK); mockGatewayApi.simulate.mockResolvedValueOnce(SIM_OK);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_trade_pipeline").handler(TP));
      expect(r.data.steps.find((st: any) => st.step === "approve")!.status).toBe("error"); expect(r.data.steps.find((st: any) => st.step === "swap")!.status).toBe("ok");
    });
  });

  describe("schema checks", () => {
    it("risk_detect: 2 params", () => { registerSkillTools(s as any, auth); const shape = find(s, "onchainos_skill_risk_detect").schema; expect(Object.keys(shape).length).toBeGreaterThanOrEqual(2); });
    it("trade_pipeline: destructive hint", () => { registerSkillTools(s as any, auth); const t = find(s, "onchainos_skill_trade_pipeline"); expect(t.hints.destructiveHint).toBe(true); expect(t.hints.readOnlyHint).toBe(false); });
    it("risk_detect: readOnly hint", () => { registerSkillTools(s as any, auth); const t = find(s, "onchainos_skill_risk_detect"); expect(t.hints.readOnlyHint).toBe(true); });
    it("price_alert: readOnly=false (WS connection)", () => { registerSkillTools(s as any, auth); expect(find(s, "onchainos_skill_price_alert").hints.readOnlyHint).toBe(false); });
  });

  describe("price_alert", () => {
    it("triggered when current >= target with above", async () => {
      mockMarketApi.price.mockResolvedValueOnce([{ usdPrice: "2500" }]); mockWsModule.wsConnect.mockResolvedValueOnce("c1"); mockWsModule.wsSubscribe.mockResolvedValueOnce(undefined);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_price_alert").handler({ chainIndex: "1", tokenContractAddress: "0xabc", targetPrice: "2000", condition: "above" }));
      expect(r.data.alertConfig.alreadyTriggered).toBe(true);
    });
    it("not triggered when below target", async () => {
      mockMarketApi.price.mockResolvedValueOnce([{ usdPrice: "1500" }]); mockWsModule.wsConnect.mockResolvedValueOnce("c1"); mockWsModule.wsSubscribe.mockResolvedValueOnce(undefined);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_price_alert").handler({ chainIndex: "1", tokenContractAddress: "0xabc", targetPrice: "2000", condition: "above" }));
      expect(r.data.alertConfig.alreadyTriggered).toBe(false);
    });
    it("WS connect + subscribe called", async () => {
      mockMarketApi.price.mockResolvedValueOnce([{ usdPrice: "4500" }]); mockWsModule.wsConnect.mockResolvedValueOnce("conn-42"); mockWsModule.wsSubscribe.mockResolvedValueOnce(undefined);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_price_alert").handler({ chainIndex: "1", tokenContractAddress: "0xabc", targetPrice: "5000", condition: "below" }));
      expect(mockWsModule.wsConnect).toHaveBeenCalledWith(auth); expect(mockWsModule.wsSubscribe).toHaveBeenCalled();
      expect(r.data.steps.find((st: any) => st.step === "ws_setup")!.data.connId).toBe("conn-42");
    });
  });

  describe("risk_detect", () => {
    it("calls 4 APIs in parallel", async () => {
      mockMarketApi.tokenAdvancedInfo.mockResolvedValueOnce({ riskLevel: "LOW", isHoneypot: false }); mockMarketApi.tokenClusterOverview.mockResolvedValueOnce({ rugPullPercent: "5" }); mockMarketApi.memepumpBundleInfo.mockResolvedValueOnce({ isBundled: false }); mockMarketApi.memepumpTokenDevInfo.mockResolvedValueOnce({ isRugHistory: false });
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_risk_detect").handler({ chainIndex: "1", tokenContractAddress: "0xabc" }));
      expect(r.data.steps).toHaveLength(4); expect(r.data.riskScore.level).toBe("LOW");
    });
    it("CRITICAL when honeypot + bundle + rug", async () => {
      mockMarketApi.tokenAdvancedInfo.mockResolvedValueOnce({ riskLevel: "HIGH", isHoneypot: true }); mockMarketApi.tokenClusterOverview.mockResolvedValueOnce({ rugPullPercent: "80" }); mockMarketApi.memepumpBundleInfo.mockResolvedValueOnce({ isBundled: true, bundles: [{}] }); mockMarketApi.memepumpTokenDevInfo.mockResolvedValueOnce({ isRugHistory: true });
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_risk_detect").handler({ chainIndex: "1", tokenContractAddress: "0xabc" }));
      expect(r.data.riskScore.total).toBeGreaterThan(70); expect(r.data.riskScore.level).toBe("CRITICAL");
    });
  });

  // ── Phase 3: New Skills ────────────────────────────────────────

  describe("auth — new skills", () => {
    it("defi_invest: TRADE", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_defi_invest").handler({ chainIndex: "1", tokenKeyword: "USDC", amount: "1000000", userWalletAddress: "0xuser" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("TRADE"); });
    it("defi_yield_aggregate: READ", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_defi_yield_aggregate").handler({ chainIndex: "1" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("READ"); });
    it("defi_portfolio: READ", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_defi_portfolio").handler({ address: "0xuser", chains: "1" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("READ"); });
    it("intent_swap: TRADE", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_intent_swap").handler({ chainIndex: "1", fromTokenAddress: "0xa", toTokenAddress: "0xb", amount: "1000000", userWalletAddress: "0xuser" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("TRADE"); });
    it("portfolio_health: READ", async () => { registerSkillTools(s as any, null); const r = parse(await find(s, "onchainos_skill_portfolio_health").handler({ address: "0xuser", chains: "1" })); expect(r.error.code).toBe("AUTH_REQUIRED"); expect(r.error.message).toContain("READ"); });
  });

  describe("schema checks — new skills", () => {
    it("defi_invest: 5 params", () => { registerSkillTools(s as any, auth); const shape = find(s, "onchainos_skill_defi_invest").schema; expect(Object.keys(shape).length).toBeGreaterThanOrEqual(5); });
    it("defi_yield_aggregate: readOnly", () => { registerSkillTools(s as any, auth); const t = find(s, "onchainos_skill_defi_yield_aggregate"); expect(t.hints.readOnlyHint).toBe(true); expect(t.hints.destructiveHint).toBe(false); });
    it("defi_invest: destructive", () => { registerSkillTools(s as any, auth); const t = find(s, "onchainos_skill_defi_invest"); expect(t.hints.destructiveHint).toBe(true); expect(t.hints.readOnlyHint).toBe(false); });
    it("portfolio_health: readOnly", () => { registerSkillTools(s as any, auth); const t = find(s, "onchainos_skill_portfolio_health"); expect(t.hints.readOnlyHint).toBe(true); });
  });

  describe("defi_invest", () => {
    const DPI = { chainIndex: "1", tokenKeyword: "USDC", amount: "1000000", userWalletAddress: "0xuser123" };
    const SEARCH_OK = [{ investmentId: "inv_42", platformName: "Aave", tokenSymbol: "USDC", apy: "8.5" }];
    const DETAIL_OK = { investmentId: "inv_42", apy: "8.5", tvlUsd: "5000000", platformName: "Aave", tokenSymbol: "USDC", isInvestable: true };
    const RATE_OK = [{ timestamp: 1700000000, value: "8.5" }, { timestamp: 1700100000, value: "8.7" }];
    const PREPARE_OK = { investWithTokenList: [{ tokenAddress: "0xtoken", tokenDecimal: "6" }] };
    const ENTER_OK = { dataList: [{ type: "APPROVE", tx: { to: "0xapp", data: "0xdead", value: "0" } }, { type: "DEPOSIT", tx: { to: "0xdep", data: "0xbeef", value: "1000000" } }] };

    it("full flow with search", async () => {
      mockDefiApi.searchProducts.mockResolvedValueOnce(SEARCH_OK); mockDefiApi.productDetail.mockResolvedValueOnce(DETAIL_OK); mockDefiApi.rateChart.mockResolvedValueOnce(RATE_OK); mockDefiApi.prepareTransaction.mockResolvedValueOnce(PREPARE_OK); mockDefiApi.enter.mockResolvedValueOnce(ENTER_OK);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_invest").handler(DPI));
      expect(r.data.steps).toHaveLength(5); expect(r.data.summary.status).toBe("ready");
      expect(r.data.calldata.dataList).toHaveLength(2); expect(r.data.productInfo.platformName).toBe("Aave");
    });

    it("full flow with investmentId (skip search)", async () => {
      mockDefiApi.productDetail.mockResolvedValueOnce(DETAIL_OK); mockDefiApi.rateChart.mockResolvedValueOnce(RATE_OK); mockDefiApi.prepareTransaction.mockResolvedValueOnce(PREPARE_OK); mockDefiApi.enter.mockResolvedValueOnce(ENTER_OK);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_invest").handler({ ...DPI, investmentId: "inv_42" }));
      expect(r.data.steps.find((st: any) => st.step === "search")!.status).toBe("skipped");
      expect(r.data.summary.status).toBe("ready");
    });

    it("search empty → no_products_found", async () => {
      mockDefiApi.searchProducts.mockResolvedValueOnce([]);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_invest").handler(DPI));
      expect(r.data.summary.status).toBe("no_products_found");
    });

    it("enter failure → failedAt=enter", async () => {
      mockDefiApi.searchProducts.mockResolvedValueOnce(SEARCH_OK); mockDefiApi.productDetail.mockResolvedValueOnce(DETAIL_OK); mockDefiApi.rateChart.mockResolvedValueOnce(RATE_OK); mockDefiApi.prepareTransaction.mockResolvedValueOnce(PREPARE_OK); mockDefiApi.enter.mockRejectedValueOnce(new Error("tx rejected"));
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_invest").handler(DPI));
      expect(r.data.summary.failedAt).toBe("enter");
    });
  });

  describe("defi_yield_aggregate", () => {
    const makeProduct = (id: string, apy: string, tvl: string) => ({ investmentId: id, platformName: `Plat${id}`, tokenSymbol: "USDC", apy, tvlUsd: tvl });
    const SEARCH_MANY = Array.from({ length: 10 }, (_, i) => makeProduct(`inv_${i}`, String(5 + i * 2), String(100000 * (i + 1))));

    it("success flow: search → details → rank", async () => {
      mockDefiApi.searchProducts.mockResolvedValueOnce(SEARCH_MANY);
      for (let i = 0; i < 10; i++) {
        mockDefiApi.productDetail.mockResolvedValueOnce({ investmentId: `inv_${i}`, apy: String(5 + i * 2), tvlUsd: String(100000 * (i + 1)), platformName: `Plat${i}`, tokenSymbol: "USDC", isInvestable: true, feeRate: "0.5", status: "active" });
      }
      for (let i = 0; i < 3; i++) mockDefiApi.rateChart.mockResolvedValueOnce([{ ts: 1, value: "8" }, { ts: 2, value: "9" }, { ts: 3, value: "10" }]);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_yield_aggregate").handler({ chainIndex: "1", tokenKeyword: "USDC" }));
      expect(r.data.steps).toHaveLength(3); expect(r.data.rankedProducts.length).toBeGreaterThan(0);
      expect(r.data.rankedProducts[0].compositeScore).toBeGreaterThan(0);
      expect(r.data.yieldSummary.bestApy).toBeGreaterThan(0);
    });

    it("search empty → graceful empty response", async () => {
      mockDefiApi.searchProducts.mockResolvedValueOnce([]);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_yield_aggregate").handler({ chainIndex: "1" }));
      expect(r.data.summary.status).toBe("empty");
    });

    it("partial detail failures → ranks from available", async () => {
      mockDefiApi.searchProducts.mockResolvedValueOnce(SEARCH_MANY.slice(0, 5));
      mockDefiApi.productDetail.mockResolvedValueOnce({ investmentId: "inv_0", apy: "8", tvlUsd: "100000", platformName: "Aave", tokenSymbol: "USDC", isInvestable: true, feeRate: "0.3", status: "active" });
      mockDefiApi.productDetail.mockRejectedValueOnce(new Error("timeout"));
      mockDefiApi.productDetail.mockResolvedValueOnce({ investmentId: "inv_2", apy: "12", tvlUsd: "300000", platformName: "Compound", tokenSymbol: "USDC", isInvestable: true, feeRate: "0.2", status: "active" });
      mockDefiApi.productDetail.mockResolvedValueOnce({ investmentId: "inv_3", apy: "10", tvlUsd: "400000", platformName: "Lido", tokenSymbol: "USDC", isInvestable: true, feeRate: "0.1", status: "active" });
      mockDefiApi.productDetail.mockResolvedValueOnce({ investmentId: "inv_4", apy: "6", tvlUsd: "500000", platformName: "Curve", tokenSymbol: "USDC", isInvestable: true, feeRate: "0.4", status: "active" });
      // rate charts for top 3
      for (let i = 0; i < 3; i++) mockDefiApi.rateChart.mockResolvedValueOnce([{ ts: 1, value: "10" }, { ts: 2, value: "10" }, { ts: 3, value: "10" }]);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_yield_aggregate").handler({ chainIndex: "1", tokenKeyword: "USDC" }));
      expect(r.data.rankedProducts.length).toBe(4);
      expect(r.data.steps.find((st: any) => st.step === "product_details")!.data.fetched).toBe(4);
    });
  });

  describe("defi_portfolio", () => {
    const PLATFORM_LIST = [{ analysisPlatformId: "aave_v3", platformName: "Aave V3", chainIndex: "1", totalValueUsd: "5000" }];
    const PLATFORM_DETAIL = { investments: [{ investmentId: "i1", tokenSymbol: "USDC", amount: "5000", valueUsd: "5000", apy: "8.5" }] };

    it("success flow: list → details → aggregate", async () => {
      mockDefiApi.userPlatformList.mockResolvedValueOnce(PLATFORM_LIST); mockDefiApi.userPlatformDetail.mockResolvedValueOnce(PLATFORM_DETAIL);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_portfolio").handler({ address: "0xuser", chains: "1" }));
      expect(r.data.steps).toHaveLength(2); expect(r.data.defiPortfolio.totalValueUsd).toBe(5000);
      expect(r.data.defiPortfolio.platforms).toHaveLength(1);
    });

    it("empty portfolio → empty response", async () => {
      mockDefiApi.userPlatformList.mockResolvedValueOnce([]);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_portfolio").handler({ address: "0xuser", chains: "1" }));
      expect(r.data.summary.status).toBe("empty");
    });

    it("partial detail failures → still reports available", async () => {
      mockDefiApi.userPlatformList.mockResolvedValueOnce([
        { analysisPlatformId: "a", platformName: "Aave", chainIndex: "1", totalValueUsd: "3000" },
        { analysisPlatformId: "b", platformName: "Compound", chainIndex: "1", totalValueUsd: "2000" },
      ]);
      mockDefiApi.userPlatformDetail.mockResolvedValueOnce({ investments: [{ tokenSymbol: "USDC", valueUsd: "3000", apy: "8" }] });
      mockDefiApi.userPlatformDetail.mockRejectedValueOnce(new Error("failed"));
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_defi_portfolio").handler({ address: "0xuser", chains: "1" }));
      expect(r.data.defiPortfolio.platformCount).toBe(1);
      expect(r.data.summary.totalValueUsd).toBe(3000);
    });
  });

  describe("intent_swap", () => {
    const ISP = { chainIndex: "1", fromTokenAddress: "0xusdc", toTokenAddress: "0xeth", amount: "1000000", userWalletAddress: "0xuser123" };
    const IQ_OK = { signData: { domain: { name: "Intent" }, types: {}, message: { from: "0xusdc", to: "0xeth" }, primaryType: "Order" }, priceImpactPercent: "0.3", estimateGasFee: "0.002" };

    it("success flow: quote → signData returned", async () => {
      mockIntentApi.quote.mockResolvedValueOnce(IQ_OK);
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_intent_swap").handler(ISP));
      expect(r.data.steps).toHaveLength(2); expect(r.data.summary.status).toBe("awaiting_signature");
      expect(r.data.signData.domain.name).toBe("Intent");
      expect(r.data.intentInfo.mevResistant).toBe(true);
    });

    it("quote failure → failedAt=intent_quote", async () => {
      mockIntentApi.quote.mockRejectedValueOnce(new Error("no route"));
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_intent_swap").handler(ISP));
      expect(r.data.summary.status).toBe("failed"); expect(r.data.summary.failedAt).toBe("intent_quote");
    });

    it("signData missing → failedAt=build", async () => {
      mockIntentApi.quote.mockResolvedValueOnce({ priceImpactPercent: "0.5" }); // no signData
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_intent_swap").handler(ISP));
      expect(r.data.summary.failedAt).toBe("build");
    });
  });

  describe("portfolio_health", () => {
    const PH = { address: "0xuser", chains: "1,501" };
    const BAL_OK = { detailList: [
      { tokenContractAddress: "0xeth", chainIndex: "1", tokenSymbol: "ETH", balance: "1000000000000000000", priceUsd: "2000", valueUsd: "2000" },
      { tokenContractAddress: "0xusdc", chainIndex: "1", tokenSymbol: "USDC", balance: "1000000", priceUsd: "1", valueUsd: "1000" },
      { tokenContractAddress: "0xsol", chainIndex: "501", tokenSymbol: "SOL", balance: "1000000000", priceUsd: "100", valueUsd: "100" },
    ]};

    it("healthy portfolio → EXCELLENT/GOOD", async () => {
      mockBalanceApi.allTokenBalances.mockResolvedValueOnce(BAL_OK);
      for (let i = 0; i < 3; i++) mockMarketApi.tokenAdvancedInfo.mockResolvedValueOnce({ riskLevel: "LOW", isHoneypot: false, buyTax: "0", sellTax: "0" });
      mockMarketApi.portfolioOverview.mockResolvedValueOnce({ realizedPnlUsd: "500", unrealizedPnlUsd: "200", winRate: "65", totalTxs: "150" });
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_portfolio_health").handler(PH));
      expect(r.data.healthReport.totalScore).toBeGreaterThanOrEqual(60);
      expect(["EXCELLENT", "GOOD"]).toContain(r.data.healthReport.healthLevel);
    });

    it("risky portfolio → POOR/CRITICAL", async () => {
      mockBalanceApi.allTokenBalances.mockResolvedValueOnce({ detailList: [{ tokenContractAddress: "0xscam", chainIndex: "1", tokenSymbol: "SCAM", balance: "1", priceUsd: "10000", valueUsd: "10000" }] });
      mockMarketApi.tokenAdvancedInfo.mockResolvedValueOnce({ riskLevel: "HIGH", isHoneypot: true, buyTax: "20", sellTax: "25" });
      mockMarketApi.portfolioOverview.mockResolvedValueOnce({ realizedPnlUsd: "-5000", unrealizedPnlUsd: "-2000", winRate: "20", totalTxs: "10" });
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_portfolio_health").handler(PH));
      expect(r.data.healthReport.totalScore).toBeLessThan(40);
      expect(r.data.healthReport.riskFactors.length).toBeGreaterThan(0);
    });

    it("all dust → empty warning", async () => {
      mockBalanceApi.allTokenBalances.mockResolvedValueOnce({ detailList: [{ tokenContractAddress: "0xdust", chainIndex: "1", tokenSymbol: "DUST", balance: "999999", priceUsd: "0.000001", valueUsd: "0.99" }] });
      registerSkillTools(s as any, auth); const r = parse(await find(s, "onchainos_skill_portfolio_health").handler(PH));
      expect(r.data.healthReport.healthLevel).toBe("EMPTY"); // no non-dust tokens, effectively empty
    });
  });
});
