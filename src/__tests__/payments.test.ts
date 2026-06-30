import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPaymentsApi } = vi.hoisted(() => ({
  mockPaymentsApi: {
    create: vi.fn(),
    detail: vi.fn(),
    submit: vi.fn(),
    status: vi.fn(),
    supported: vi.fn(),
    verify: vi.fn(),
    settle: vi.fn(),
    settleStatus: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ paymentsApi: mockPaymentsApi }));

import { registerPaymentsTools } from "../tools/payments.js";
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

describe("registerPaymentsTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 8 tools", () => {
    registerPaymentsTools(s as any, auth);
    expect(s.tools).toHaveLength(8);
  });

  it("registered names match expected", () => {
    registerPaymentsTools(s as any, auth);
    expect(s.tools.map(t => t.name).sort()).toEqual([
      "onchainos_payment_create",
      "onchainos_payment_detail",
      "onchainos_payment_status",
      "onchainos_payment_submit",
      "onchainos_payment_supported",
      "onchainos_payment_x402_settle",
      "onchainos_payment_x402_settle_status",
      "onchainos_payment_x402_verify",
    ]);
  });

  // ── hints ──
  it("create is marked destructive", () => {
    registerPaymentsTools(s as any, auth);
    const t = find(s, "onchainos_payment_create")!;
    expect(t.hints.readOnlyHint).toBe(false);
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("detail is readOnly", () => {
    registerPaymentsTools(s as any, auth);
    expect(find(s, "onchainos_payment_detail")!.hints.readOnlyHint).toBe(true);
  });

  // ── Auth (TRADE) ──
  it("create returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_create")!.handler({
      amount: "10", symbol: "USD₮0", recipient: "0xseller",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  it("x402_settle returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_x402_settle")!.handler({
      authorization: '{"type":"eip-3009"}', signature: "0xsig",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  // ── Auth (READ) ──
  it("supported returns AUTH_REQUIRED(READ) when null", async () => {
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_supported")!.handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("x402_verify returns AUTH_REQUIRED(READ) when null", async () => {
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_x402_verify")!.handler({
      authorization: '{"type":"eip-3009"}', signature: "0xsig",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("x402_settle_status returns AUTH_REQUIRED(READ) when null", async () => {
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_x402_settle_status")!.handler({ settleId: "s1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  // ── No-auth tools (public endpoints) ──
  it("detail works with null auth", async () => {
    mockPaymentsApi.detail.mockResolvedValueOnce({ status: "pending" });
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_detail")!.handler({ paymentId: "a2a_xxx" }));
    expect(mockPaymentsApi.detail).toHaveBeenCalledWith("a2a_xxx");
    expect(r.success).toBe(true);
  });

  it("submit works with null auth", async () => {
    mockPaymentsApi.submit.mockResolvedValueOnce({ status: "completed" });
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_submit")!.handler({
      paymentId: "a2a_xxx",
      authorization: JSON.stringify({ type: "eip-3009", from: "0xb", to: "0xs", value: "1000000" }),
      signature: "0xsig",
    }));
    expect(mockPaymentsApi.submit).toHaveBeenCalledWith("a2a_xxx", expect.objectContaining({
      payload: expect.objectContaining({ type: "transaction" }),
    }));
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("submit returns error on invalid authorization JSON", async () => {
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_submit")!.handler({
      paymentId: "a2a_xxx", authorization: "not-json", signature: "0xsig",
    }));
    expect(r.success).toBe(false);
    expect(r.error.code).toBe("ERROR");
  });

  it("status works with null auth", async () => {
    mockPaymentsApi.status.mockResolvedValueOnce({ status: "completed" });
    registerPaymentsTools(s as any, null);
    const r = parse(await find(s, "onchainos_payment_status")!.handler({ paymentId: "a2a_xxx" }));
    expect(mockPaymentsApi.status).toHaveBeenCalledWith("a2a_xxx");
    expect(r.success).toBe(true);
  });

  // ── Success (auth tools) ──
  it("create calls API and returns nextSteps", async () => {
    mockPaymentsApi.create.mockResolvedValueOnce({ paymentId: "a2a_new123" });
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_create")!.handler({
      amount: "10", symbol: "USD₮0", recipient: "0xrecipient",
      description: "test payment",
    }));
    expect(mockPaymentsApi.create).toHaveBeenCalledWith(auth, expect.objectContaining({
      type: "charge", amount: "10", symbol: "USD₮0", recipient: "0xrecipient",
    }));
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("supported calls API", async () => {
    mockPaymentsApi.supported.mockResolvedValueOnce({ chains: ["1", "501"] });
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_supported")!.handler({}));
    expect(mockPaymentsApi.supported).toHaveBeenCalledWith(auth);
    expect(r.success).toBe(true);
  });

  it("x402_verify calls API with parsed authorization", async () => {
    const authObj = { type: "eip-3009", from: "0xb", to: "0xs", value: "1000000" };
    mockPaymentsApi.verify.mockResolvedValueOnce({ valid: true });
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_x402_verify")!.handler({
      authorization: JSON.stringify(authObj), signature: "0xsig",
    }));
    expect(mockPaymentsApi.verify).toHaveBeenCalledWith(auth, { authorization: authObj, signature: "0xsig" });
    expect(r.success).toBe(true);
  });

  it("x402_verify returns error on invalid JSON", async () => {
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_x402_verify")!.handler({
      authorization: "bad-json", signature: "0xsig",
    }));
    expect(r.success).toBe(false);
  });

  it("x402_settle calls API", async () => {
    mockPaymentsApi.settle.mockResolvedValueOnce({ settleId: "stl1" });
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_x402_settle")!.handler({
      authorization: JSON.stringify({ type: "eip-3009" }), signature: "0xsig",
    }));
    expect(mockPaymentsApi.settle).toHaveBeenCalled();
    expect(r.success).toBe(true);
  });

  it("x402_settle_status calls API", async () => {
    mockPaymentsApi.settleStatus.mockResolvedValueOnce({ status: "confirmed" });
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_x402_settle_status")!.handler({ settleId: "stl1" }));
    expect(mockPaymentsApi.settleStatus).toHaveBeenCalledWith(auth, "stl1");
    expect(r.success).toBe(true);
  });

  // ── Error ──
  it("create returns error on API failure", async () => {
    mockPaymentsApi.create.mockRejectedValueOnce(new OkxError("50001", "Service unavailable"));
    registerPaymentsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_payment_create")!.handler({
      amount: "10", symbol: "USD₮0", recipient: "0xrecipient",
    }));
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });
});
