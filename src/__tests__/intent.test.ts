import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIntentApi } = vi.hoisted(() => ({
  mockIntentApi: {
    createOrder: vi.fn(),
    orderList: vi.fn(),
    orderStatus: vi.fn(),
    cancelSignData: vi.fn(),
    cancelOrder: vi.fn(),
    auctionInfo: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ intentApi: mockIntentApi }));

import { registerIntentTools } from "../tools/intent.js";
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

describe("registerIntentTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 6 tools", () => {
    registerIntentTools(s as any, auth);
    expect(s.tools).toHaveLength(6);
  });

  it("registered names match expected", () => {
    registerIntentTools(s as any, auth);
    expect(s.tools.map(t => t.name).sort()).toEqual([
      "onchainos_intent_auction_info",
      "onchainos_intent_cancel_order",
      "onchainos_intent_cancel_sign_data",
      "onchainos_intent_create_order",
      "onchainos_intent_order_list",
      "onchainos_intent_order_status",
    ]);
  });

  // ── hints ──
  it("create_order is marked destructive", () => {
    registerIntentTools(s as any, auth);
    const t = find(s, "onchainos_intent_create_order")!;
    expect(t.hints.readOnlyHint).toBe(false);
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("order_status is readOnly", () => {
    registerIntentTools(s as any, auth);
    expect(find(s, "onchainos_intent_order_status")!.hints.readOnlyHint).toBe(true);
  });

  it("cancel_order is marked destructive", () => {
    registerIntentTools(s as any, auth);
    expect(find(s, "onchainos_intent_cancel_order")!.hints.readOnlyHint).toBe(false);
    expect(find(s, "onchainos_intent_cancel_order")!.hints.destructiveHint).toBe(true);
  });

  // ── Auth (TRADE) ──
  it("create_order returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerIntentTools(s as any, null);
    const r = parse(await find(s, "onchainos_intent_create_order")!.handler({
      chainIndex: "1", fromTokenAddress: "0xa", toTokenAddress: "0xb",
      fromTokenAmount: "1000000", toTokenAmount: "500000",
      userWalletAddress: "0xuser", validTo: 1800000000, quoteId: "q1",
      appData: "0xdata", signature: "0xsig",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  it("cancel_order returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerIntentTools(s as any, null);
    const r = parse(await find(s, "onchainos_intent_cancel_order")!.handler({
      userWalletAddress: "0xuser", orderUid: "uid1", signature: "0xsig",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  // ── Auth (READ) ──
  it("order_status returns AUTH_REQUIRED when null", async () => {
    registerIntentTools(s as any, null);
    const r = parse(await find(s, "onchainos_intent_order_status")!.handler({ orderUid: "uid1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("order_list returns AUTH_REQUIRED when null", async () => {
    registerIntentTools(s as any, null);
    const r = parse(await find(s, "onchainos_intent_order_list")!.handler({ userWalletAddress: "0xuser" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("cancel_sign_data returns AUTH_REQUIRED when null", async () => {
    registerIntentTools(s as any, null);
    const r = parse(await find(s, "onchainos_intent_cancel_sign_data")!.handler({
      userWalletAddress: "0xuser", orderUid: "uid1",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("auction_info returns AUTH_REQUIRED when null", async () => {
    registerIntentTools(s as any, null);
    const r = parse(await find(s, "onchainos_intent_auction_info")!.handler({ auctionId: "auc1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  // ── Validation ──
  it("order_list returns error when neither userWalletAddress nor orderUid provided", async () => {
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_order_list")!.handler({}));
    expect(r.success).toBe(false);
    expect(r.error.message).toContain("二选一");
  });

  it("auction_info returns error when neither auctionId nor txHash provided", async () => {
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_auction_info")!.handler({}));
    expect(r.success).toBe(false);
    expect(r.error.message).toContain("二选一");
  });

  // ── Success ──
  it("create_order calls API and returns nextSteps", async () => {
    mockIntentApi.createOrder.mockResolvedValueOnce({ orderUid: "uid1" });
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_create_order")!.handler({
      chainIndex: "1", fromTokenAddress: "0xa", toTokenAddress: "0xb",
      fromTokenAmount: "1000000", toTokenAmount: "500000",
      userWalletAddress: "0xuser", validTo: 1800000000, quoteId: "q1",
      appData: "0xdata", signature: "0xsig",
    }));
    expect(mockIntentApi.createOrder).toHaveBeenCalledWith(auth, expect.objectContaining({
      chainIndex: "1", fromTokenAddress: "0xa", toTokenAddress: "0xb",
      fromTokenAmount: "1000000", toTokenAmount: "500000",
    }));
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("order_list by wallet", async () => {
    mockIntentApi.orderList.mockResolvedValueOnce([{ orderUid: "uid1" }]);
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_order_list")!.handler({
      userWalletAddress: "0xuser", limit: 10,
    }));
    expect(mockIntentApi.orderList).toHaveBeenCalledWith(auth, { userWalletAddress: "0xuser", limit: 10 });
    expect(r.success).toBe(true);
  });

  it("order_list by orderUid", async () => {
    mockIntentApi.orderList.mockResolvedValueOnce([{ orderUid: "uid1" }]);
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_order_list")!.handler({ orderUid: "uid1" }));
    expect(r.success).toBe(true);
  });

  it("order_status calls API", async () => {
    mockIntentApi.orderStatus.mockResolvedValueOnce({ status: "filled" });
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_order_status")!.handler({ orderUid: "uid1" }));
    expect(mockIntentApi.orderStatus).toHaveBeenCalledWith(auth, "uid1");
    expect(r.success).toBe(true);
  });

  it("cancel_sign_data calls API", async () => {
    mockIntentApi.cancelSignData.mockResolvedValueOnce({ signData: { domain: {} } });
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_cancel_sign_data")!.handler({
      userWalletAddress: "0xuser", orderUid: "uid1",
    }));
    expect(mockIntentApi.cancelSignData).toHaveBeenCalledWith(auth, "0xuser", "uid1");
    expect(r.success).toBe(true);
  });

  it("cancel_order calls API", async () => {
    mockIntentApi.cancelOrder.mockResolvedValueOnce({ success: true });
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_cancel_order")!.handler({
      userWalletAddress: "0xuser", orderUid: "uid1", signature: "0xsig",
    }));
    expect(mockIntentApi.cancelOrder).toHaveBeenCalledWith(auth, "0xuser", "uid1", "0xsig");
    expect(r.success).toBe(true);
  });

  it("auction_info by auctionId", async () => {
    mockIntentApi.auctionInfo.mockResolvedValueOnce({ solver: "0xsolver" });
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_auction_info")!.handler({ auctionId: "auc1" }));
    expect(mockIntentApi.auctionInfo).toHaveBeenCalledWith(auth, { auctionId: "auc1" });
    expect(r.success).toBe(true);
  });

  it("auction_info by txHash", async () => {
    mockIntentApi.auctionInfo.mockResolvedValueOnce({ solver: "0xsolver" });
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_auction_info")!.handler({ txHash: "0xtx" }));
    expect(mockIntentApi.auctionInfo).toHaveBeenCalledWith(auth, { txHash: "0xtx" });
    expect(r.success).toBe(true);
  });

  // ── Error ──
  it("create_order returns error on API failure", async () => {
    mockIntentApi.createOrder.mockRejectedValueOnce(new OkxError("50001", "Service unavailable"));
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_create_order")!.handler({
      chainIndex: "1", fromTokenAddress: "0xa", toTokenAddress: "0xb",
      fromTokenAmount: "1000000", toTokenAmount: "500000",
      userWalletAddress: "0xuser", validTo: 1800000000, quoteId: "q1",
      appData: "0xdata", signature: "0xsig",
    }));
    expect(r.success).toBe(false);
  });

  it("order_status returns error on API failure", async () => {
    mockIntentApi.orderStatus.mockRejectedValueOnce(new OkxError("50001", "Not found"));
    registerIntentTools(s as any, auth);
    const r = parse(await find(s, "onchainos_intent_order_status")!.handler({ orderUid: "bad" }));
    expect(r.success).toBe(false);
  });
});
