import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDefiApi } = vi.hoisted(() => ({
  mockDefiApi: {
    supportedChains: vi.fn(),
    supportedPlatforms: vi.fn(),
    searchProducts: vi.fn(),
    productDetail: vi.fn(),
    rateChart: vi.fn(),
    tvlChart: vi.fn(),
    depthPriceChart: vi.fn(),
    prepareTransaction: vi.fn(),
    calcEnterInfo: vi.fn(),
    enter: vi.fn(),
    exit: vi.fn(),
    claim: vi.fn(),
    userPlatformList: vi.fn(),
    userPlatformDetail: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ defiApi: mockDefiApi }));

import { registerDefiTools } from "../tools/defi.js";
import type { Auth } from "../adapters/shared.js";
import { OkxError } from "../adapters/shared.js";

interface RecordedTool {
  name: string; description: string; schema: Record<string, unknown>;
  hints: Record<string, unknown>; handler: (...args: any[]) => any;
}

function mockServer() {
  const tools: RecordedTool[] = [];
  return {
    tools,
    tool(name: string, ...rest: any[]) {
      tools.push({
        name, description: rest[0],
        schema: (rest[1] ?? {}) as Record<string, unknown>,
        hints: rest[2] as Record<string, unknown>,
        handler: rest[3] as (...args: any[]) => any,
      });
    },
  };
}

const auth: Auth = { apiKey: "k", secret: "s", passphrase: "p" };
const find = (s: ReturnType<typeof mockServer>, n: string) => s.tools.find(t => t.name === n);
const parse = (r: any) => JSON.parse(r.content[0].text);

describe("registerDefiTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 14 tools", () => {
    registerDefiTools(s as any, auth);
    expect(s.tools).toHaveLength(14);
  });

  it("registered names match expected", () => {
    registerDefiTools(s as any, auth);
    expect(s.tools.map(t => t.name).sort()).toEqual([
      "onchainos_defi_calc_enter_info",
      "onchainos_defi_claim",
      "onchainos_defi_depth_price_chart",
      "onchainos_defi_enter",
      "onchainos_defi_exit",
      "onchainos_defi_prepare_transaction",
      "onchainos_defi_product_detail",
      "onchainos_defi_rate_chart",
      "onchainos_defi_search_products",
      "onchainos_defi_supported_chains",
      "onchainos_defi_supported_platforms",
      "onchainos_defi_tvl_chart",
      "onchainos_defi_user_platform_detail",
      "onchainos_defi_user_platform_list",
    ]);
  });

  // ── hints ──
  it("supported_chains is readOnly", () => {
    registerDefiTools(s as any, auth);
    expect(find(s, "onchainos_defi_supported_chains")!.hints.readOnlyHint).toBe(true);
    expect(find(s, "onchainos_defi_supported_chains")!.hints.destructiveHint).toBe(false);
  });

  it("enter is marked destructive", () => {
    registerDefiTools(s as any, auth);
    const t = find(s, "onchainos_defi_enter")!;
    expect(t.hints.readOnlyHint).toBe(false);
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("exit is marked destructive", () => {
    registerDefiTools(s as any, auth);
    const t = find(s, "onchainos_defi_exit")!;
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("claim is marked destructive", () => {
    registerDefiTools(s as any, auth);
    const t = find(s, "onchainos_defi_claim")!;
    expect(t.hints.destructiveHint).toBe(true);
  });

  // ── Auth (READ) ──
  it("supported_chains returns AUTH_REQUIRED when null", async () => {
    registerDefiTools(s as any, null);
    const r = parse(await find(s, "onchainos_defi_supported_chains")!.handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("supported_platforms returns AUTH_REQUIRED when null", async () => {
    registerDefiTools(s as any, null);
    const r = parse(await find(s, "onchainos_defi_supported_platforms")!.handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("search_products returns AUTH_REQUIRED when null", async () => {
    registerDefiTools(s as any, null);
    const r = parse(await find(s, "onchainos_defi_search_products")!.handler({ tokenKeywordList: ["USDC"] }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  // ── Auth (TRADE) ──
  it("enter returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerDefiTools(s as any, null);
    const r = parse(await find(s, "onchainos_defi_enter")!.handler({
      investmentId: "inv1", address: "0xuser",
      userInputList: [{ tokenAddress: "0xusdc", chainIndex: "1", coinAmount: "100" }],
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  it("exit returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerDefiTools(s as any, null);
    const r = parse(await find(s, "onchainos_defi_exit")!.handler({ investmentId: "inv1", address: "0xuser" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  it("claim returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerDefiTools(s as any, null);
    const r = parse(await find(s, "onchainos_defi_claim")!.handler({ address: "0xuser", rewardType: "REWARD_INVESTMENT" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  // ── Success: READ tools ──
  it("supported_chains calls API", async () => {
    mockDefiApi.supportedChains.mockResolvedValueOnce([{ chainIndex: "1", network: "Ethereum" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_supported_chains")!.handler({}));
    expect(mockDefiApi.supportedChains).toHaveBeenCalledWith(auth);
    expect(r.success).toBe(true);
    expect(r.data).toEqual([{ chainIndex: "1", network: "Ethereum" }]);
  });

  it("supported_platforms calls API", async () => {
    mockDefiApi.supportedPlatforms.mockResolvedValueOnce([{ platformName: "Aave" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_supported_platforms")!.handler({}));
    expect(mockDefiApi.supportedPlatforms).toHaveBeenCalledWith(auth);
    expect(r.success).toBe(true);
  });

  it("search_products calls API with all params", async () => {
    mockDefiApi.searchProducts.mockResolvedValueOnce([{ investmentId: "i1" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_search_products")!.handler({
      tokenKeywordList: ["USDC", "ETH"], platformKeywordList: ["Aave"],
      pageNum: 1, chainIndex: "1", productGroup: "LENDING",
    }));
    expect(mockDefiApi.searchProducts).toHaveBeenCalledWith(auth, {
      tokenKeywordList: ["USDC", "ETH"], platformKeywordList: ["Aave"],
      pageNum: 1, chainIndex: "1", productGroup: "LENDING",
    });
    expect(r.success).toBe(true);
  });

  it("search_products works with minimal required params", async () => {
    mockDefiApi.searchProducts.mockResolvedValueOnce([]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_search_products")!.handler({
      tokenKeywordList: ["USDC"],
    }));
    expect(r.success).toBe(true);
  });

  it("product_detail calls API", async () => {
    mockDefiApi.productDetail.mockResolvedValueOnce({ apy: "5.2", tvl: "1000000" });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_product_detail")!.handler({ investmentId: "inv1" }));
    expect(mockDefiApi.productDetail).toHaveBeenCalledWith(auth, "inv1");
    expect(r.success).toBe(true);
  });

  it("rate_chart calls API with optional timeRange", async () => {
    mockDefiApi.rateChart.mockResolvedValueOnce([{ ts: "2024-01", apy: "5.0" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_rate_chart")!.handler({ investmentId: "inv1", timeRange: "MONTH" }));
    expect(mockDefiApi.rateChart).toHaveBeenCalledWith(auth, "inv1", "MONTH");
    expect(r.success).toBe(true);
  });

  it("rate_chart defaults to WEEK when no timeRange", async () => {
    mockDefiApi.rateChart.mockResolvedValueOnce([]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_rate_chart")!.handler({ investmentId: "inv1" }));
    expect(mockDefiApi.rateChart).toHaveBeenCalledWith(auth, "inv1", undefined);
    expect(r.success).toBe(true);
  });

  it("tvl_chart calls API", async () => {
    mockDefiApi.tvlChart.mockResolvedValueOnce([{ ts: "2024-01", tvl: "500000" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_tvl_chart")!.handler({ investmentId: "inv1", timeRange: "YEAR" }));
    expect(mockDefiApi.tvlChart).toHaveBeenCalledWith(auth, "inv1", "YEAR");
    expect(r.success).toBe(true);
  });

  it("depth_price_chart calls API with DEPTH type", async () => {
    mockDefiApi.depthPriceChart.mockResolvedValueOnce({ bids: [], asks: [] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_depth_price_chart")!.handler({ investmentId: "inv1", chartType: "DEPTH" }));
    expect(mockDefiApi.depthPriceChart).toHaveBeenCalledWith(auth, "inv1", "DEPTH", undefined);
    expect(r.success).toBe(true);
  });

  it("depth_price_chart calls API with PRICE + timeRange", async () => {
    mockDefiApi.depthPriceChart.mockResolvedValueOnce([{ ts: "2024-01", price: "100" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_depth_price_chart")!.handler({ investmentId: "inv1", chartType: "PRICE", timeRange: "WEEK" }));
    expect(mockDefiApi.depthPriceChart).toHaveBeenCalledWith(auth, "inv1", "PRICE", "WEEK");
    expect(r.success).toBe(true);
  });

  it("prepare_transaction calls API", async () => {
    mockDefiApi.prepareTransaction.mockResolvedValueOnce({ investWithTokenList: [{ tokenAddress: "0xusdc" }] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_prepare_transaction")!.handler({ investmentId: "inv1" }));
    expect(mockDefiApi.prepareTransaction).toHaveBeenCalledWith(auth, "inv1");
    expect(r.success).toBe(true);
  });

  it("calc_enter_info calls API with all required params", async () => {
    mockDefiApi.calcEnterInfo.mockResolvedValueOnce({ token0Amount: "50", token1Amount: "50" });
    registerDefiTools(s as any, auth);
    const params = { inputAmount: "0.05", inputTokenAddress: "0xabc", tokenDecimal: "6", investmentId: "inv1", address: "0xuser", tickLower: "-33500", tickUpper: "-30450" };
    const r = parse(await find(s, "onchainos_defi_calc_enter_info")!.handler(params));
    expect(mockDefiApi.calcEnterInfo).toHaveBeenCalledWith(auth, params);
    expect(r.success).toBe(true);
  });

  it("user_platform_list calls API with wallets", async () => {
    mockDefiApi.userPlatformList.mockResolvedValueOnce([{ platformId: "p1" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_user_platform_list")!.handler({
      walletAddressList: [{ chainIndex: "1", walletAddress: "0xuser" }],
      tag: "test-query",
    }));
    expect(mockDefiApi.userPlatformList).toHaveBeenCalledWith(auth, {
      walletAddressList: [{ chainIndex: "1", walletAddress: "0xuser" }],
      tag: "test-query",
    });
    expect(r.success).toBe(true);
  });

  it("user_platform_detail calls API with wallets and platforms", async () => {
    mockDefiApi.userPlatformDetail.mockResolvedValueOnce([{ investmentId: "i1" }]);
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_user_platform_detail")!.handler({
      walletAddressList: [{ chainIndex: "1", walletAddress: "0xuser" }],
      platformList: [{ chainIndex: "1", analysisPlatformId: "plat1" }],
    }));
    expect(mockDefiApi.userPlatformDetail).toHaveBeenCalledWith(auth, {
      walletAddressList: [{ chainIndex: "1", walletAddress: "0xuser" }],
      platformList: [{ chainIndex: "1", analysisPlatformId: "plat1" }],
    });
    expect(r.success).toBe(true);
  });

  // ── Success: TRADE tools ──
  it("enter calls API and returns nextSteps", async () => {
    mockDefiApi.enter.mockResolvedValueOnce({ dataList: [{ action: "APPROVE", data: {} }, { action: "DEPOSIT", data: {} }] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_enter")!.handler({
      investmentId: "inv1", address: "0xuser",
      userInputList: [{ tokenAddress: "0xusdc", chainIndex: "1", coinAmount: "100" }],
      slippage: "0.01",
    }));
    expect(mockDefiApi.enter).toHaveBeenCalledWith(auth, expect.objectContaining({
      investmentId: "inv1", address: "0xuser", slippage: "0.01",
    }));
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("enter with optional V3 fields", async () => {
    mockDefiApi.enter.mockResolvedValueOnce({ dataList: [] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_enter")!.handler({
      investmentId: "inv1", address: "0xuser",
      userInputList: [{ tokenAddress: "0xusdc", chainIndex: "1", coinAmount: "100" }],
      tickLower: "-33500", tickUpper: "-30450", tokenId: "123",
    }));
    expect(mockDefiApi.enter).toHaveBeenCalledWith(auth, expect.objectContaining({
      tickLower: "-33500", tickUpper: "-30450", tokenId: "123",
    }));
    expect(r.success).toBe(true);
  });

  it("exit calls API with all optional params", async () => {
    mockDefiApi.exit.mockResolvedValueOnce({ dataList: [{ action: "EXIT" }] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_exit")!.handler({
      investmentId: "inv1", address: "0xuser", redeemPercent: "1",
      userInputList: [{ tokenAddress: "", chainIndex: "1" }],
      tokenId: "123", slippage: "0.005",
    }));
    expect(mockDefiApi.exit).toHaveBeenCalledWith(auth, expect.objectContaining({
      investmentId: "inv1", address: "0xuser", redeemPercent: "1",
    }));
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("exit works with minimal required params", async () => {
    mockDefiApi.exit.mockResolvedValueOnce({ dataList: [] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_exit")!.handler({ investmentId: "inv1", address: "0xuser" }));
    expect(r.success).toBe(true);
  });

  it("claim calls API with REWARD_INVESTMENT", async () => {
    mockDefiApi.claim.mockResolvedValueOnce({ dataList: [{ action: "CLAIM" }] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_claim")!.handler({
      address: "0xuser", rewardType: "REWARD_INVESTMENT", investmentId: "inv1",
    }));
    expect(mockDefiApi.claim).toHaveBeenCalledWith(auth, expect.objectContaining({
      address: "0xuser", rewardType: "REWARD_INVESTMENT", investmentId: "inv1",
    }));
    expect(r.success).toBe(true);
  });

  it("claim calls API with REWARD_PLATFORM (no investmentId needed)", async () => {
    mockDefiApi.claim.mockResolvedValueOnce({ dataList: [] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_claim")!.handler({
      address: "0xuser", rewardType: "REWARD_PLATFORM", analysisPlatformId: "plat1",
    }));
    expect(mockDefiApi.claim).toHaveBeenCalledWith(auth, {
      address: "0xuser", rewardType: "REWARD_PLATFORM", analysisPlatformId: "plat1",
    });
    expect(r.success).toBe(true);
  });

  it("claim with V3_FEE calls API with tokenId", async () => {
    mockDefiApi.claim.mockResolvedValueOnce({ dataList: [] });
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_claim")!.handler({
      address: "0xuser", rewardType: "V3_FEE", investmentId: "inv1", tokenId: "456",
    }));
    expect(r.success).toBe(true);
  });

  // ── Error ──
  it("returns SERVICE_UNAVAILABLE for 50001", async () => {
    mockDefiApi.supportedChains.mockRejectedValueOnce(new OkxError("50001", "Service unavailable"));
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_supported_chains")!.handler({}));
    expect(r.success).toBe(false);
    expect(r.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns BALANCE_FAILED for 84014 on enter", async () => {
    mockDefiApi.enter.mockRejectedValueOnce(new OkxError("84014", "insufficient balance"));
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_enter")!.handler({
      investmentId: "inv1", address: "0xuser",
      userInputList: [{ tokenAddress: "0xusdc", chainIndex: "1", coinAmount: "1000000" }],
    }));
    expect(r.success).toBe(false);
    expect(r.error.code).toBe("BALANCE_FAILED");
  });

  it("returns CHAIN_NOT_SUPPORT for 81104 on search", async () => {
    mockDefiApi.searchProducts.mockRejectedValueOnce(new OkxError("81104", "chain not supported"));
    registerDefiTools(s as any, auth);
    const r = parse(await find(s, "onchainos_defi_search_products")!.handler({ tokenKeywordList: ["USDC"], chainIndex: "999" }));
    expect(r.success).toBe(false);
    expect(r.error.code).toBe("CHAIN_NOT_SUPPORT");
  });
});
