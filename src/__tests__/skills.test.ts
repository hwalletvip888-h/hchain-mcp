/**
 * Skills 模块测试 — 辅助函数 + buildSwapPipeline + Schema + Auth
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTradeApi, mockGatewayApi, mockMarketApi, mockIntentApi, mockPostTxApi, mockWsModule } = vi.hoisted(() => ({
  mockTradeApi: { quote: vi.fn(), swap: vi.fn(), approveTransaction: vi.fn() },
  mockGatewayApi: { simulate: vi.fn(), gasPrice: vi.fn() },
  mockMarketApi: {
    price: vi.fn(), tokenAdvancedInfo: vi.fn(), tokenClusterOverview: vi.fn(),
    memepumpBundleInfo: vi.fn(), memepumpTokenDevInfo: vi.fn(),
    signalList: vi.fn(), socialSentimentSymbol: vi.fn(), socialVibeTimeline: vi.fn(),
    socialNewsBySymbol: vi.fn(), socialVibeTopKols: vi.fn(), socialSentimentRanking: vi.fn(),
  },
  mockIntentApi: { quote: vi.fn() },
  mockPostTxApi: { transactionDetail: vi.fn() },
  mockWsModule: { wsConnect: vi.fn(), wsSubscribe: vi.fn() },
}));

vi.mock("../adapters/onchainos.js", () => ({ tradeApi: mockTradeApi, gatewayApi: mockGatewayApi, marketApi: mockMarketApi, intentApi: mockIntentApi, postTxApi: mockPostTxApi }));
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
    it("registers 13 tools", () => { registerSkillTools(s as any, auth); expect(s.tools).toHaveLength(13); });
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
});
