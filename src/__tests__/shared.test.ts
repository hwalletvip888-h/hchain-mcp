import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toResult, toError, resolveAuth, AUTH_REQUIRED, errMsg, OkxError } from "../adapters/shared.js";

function textContent(result: { content: unknown[] }): string {
  const c = result.content[0] as any;
  return c?.text ?? "";
}

// ═══════════════════════════════════════════════════════
// errMsg
// ═══════════════════════════════════════════════════════
describe("errMsg", () => {
  it("extracts message from Error", () => {
    expect(errMsg(new Error("test"))).toBe("test");
  });
  it("converts string to itself", () => {
    expect(errMsg("plain")).toBe("plain");
  });
  it("converts number to string", () => {
    expect(errMsg(42)).toBe("42");
  });
});

// ═══════════════════════════════════════════════════════
// toResult
// ═══════════════════════════════════════════════════════
describe("toResult", () => {
  it("wraps data in success response", () => {
    const r = JSON.parse(textContent(toResult({ balance: "100" })));
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ balance: "100" });
    expect(r.tsIso).toBeDefined();
  });

  it("includes warnings if provided", () => {
    const r = JSON.parse(textContent(toResult("ok", { warnings: ["rate limited"] })));
    expect(r.warnings).toEqual(["rate limited"]);
  });

  it("includes nextSteps if provided", () => {
    const r = JSON.parse(textContent(toResult("ok", {
      nextSteps: [{ action: "check", tool: "onchainos_balance_total_value" }],
    })));
    expect(r.nextSteps).toHaveLength(1);
  });

  it("omits warnings when empty array", () => {
    const r = JSON.parse(textContent(toResult("data", { warnings: [] })));
    expect(r.warnings).toBeUndefined();
  });

  it("includes ISO timestamp", () => {
    const r = JSON.parse(textContent(toResult({ key: "v" })));
    expect(r.tsIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ═══════════════════════════════════════════════════════
// toError — 结构化 OkxError
// ═══════════════════════════════════════════════════════
describe("toError", () => {
  it("wraps Error in error response", () => {
    const r = JSON.parse(textContent(toError(new Error("fail"))));
    expect(r.success).toBe(false);
    expect(r.error.code).toBe("ERROR");
  });

  it("handles string error", () => {
    const r = JSON.parse(textContent(toError("network error")));
    expect(r.success).toBe(false);
    expect(r.error.message).toBe("network error");
  });

  // ── 结构化 OkxError 业务错误码 ─────────────────────
  const okxCases: [string, string, number?][] = [
    ["50001", "SERVICE_UNAVAILABLE", 3000],
    ["50011", "RATE_LIMITED", 5000],
    ["50103", "AUTH_ERROR", undefined],
    ["50104", "AUTH_ERROR", undefined],
    ["50105", "AUTH_ERROR", undefined],
    ["50106", "AUTH_ERROR", undefined],
    ["50107", "AUTH_ERROR", undefined],
    ["50111", "AUTH_ERROR", undefined],
    ["50112", "AUTH_ERROR", undefined],
    ["50113", "AUTH_ERROR", undefined],
    ["81001", "BAD_PARAMETER", undefined],
    ["81108", "WALLET_TYPE_MISMATCH", undefined],
    ["81104", "CHAIN_NOT_SUPPORT", undefined],
    ["81152", "COIN_NOT_EXIST", undefined],
    ["81451", "NODE_FAILED", 2000],
    ["84001", "PROTOCOL_NOT_SUPPORT", undefined],
    ["84003", "PROTOCOL_NOT_SUPPORT", undefined],
    ["84007", "PRODUCT_NOT_SUPPORT", undefined],
    ["84024", "PRODUCT_NOT_SUPPORT", undefined],
    ["84010", "TOKEN_NOT_SUPPORT", undefined],
    ["84014", "BALANCE_FAILED", undefined],
    ["84016", "CONTRACT_FAILED", undefined],
    ["84019", "ADDRESS_MISMATCH", undefined],
    ["84021", "SYNCING", 3000],
    ["84025", "NO_REWARD", undefined],
    ["84029", "LOCKED", undefined],
    ["84030", "EXPIRED", undefined],
    ["84032", "V3_ONLY", undefined],
  ];
  for (const [okxCode, expectedCode, retry] of okxCases) {
    it(`${okxCode} → ${expectedCode}`, () => {
      const r = JSON.parse(textContent(toError(new OkxError(okxCode, "test"))));
      expect(r.error.code).toBe(expectedCode);
      if (retry) expect(r.error.retryAfter).toBe(retry);
    });
  }

  it("unknown OKX code falls back to OKX_ERROR", () => {
    const r = JSON.parse(textContent(toError(new OkxError("99999", "unknown"))));
    expect(r.error.code).toBe("OKX_ERROR");
  });

  // ── HTTP 传输层错误 (OkxError with HTTP_ prefix) ──
  it("HTTP 429 → RATE_LIMITED", () => {
    const r = JSON.parse(textContent(toError(new OkxError("HTTP_429", "Too Many", 429))));
    expect(r.error.code).toBe("RATE_LIMITED");
  });
  it("HTTP 503 → UNAVAILABLE", () => {
    const r = JSON.parse(textContent(toError(new OkxError("HTTP_503", "Service", 503))));
    expect(r.error.code).toBe("UNAVAILABLE");
    expect(r.error.retryAfter).toBe(5000);
  });
  it("HTTP 400 → BAD_REQUEST", () => {
    const r = JSON.parse(textContent(toError(new OkxError("HTTP_400", "Bad", 400))));
    expect(r.error.code).toBe("BAD_REQUEST");
  });
  it("HTTP 422 → BUSINESS_REJECT", () => {
    const r = JSON.parse(textContent(toError(new OkxError("HTTP_422", "Unprocessable", 422))));
    expect(r.error.code).toBe("BUSINESS_REJECT");
  });
  it("HTTP 500 → SYSTEM_ERROR", () => {
    const r = JSON.parse(textContent(toError(new OkxError("HTTP_500", "Internal", 500))));
    expect(r.error.code).toBe("SYSTEM_ERROR");
  });

  // ── 兜底: 非 OkxError 的普通 Error ──
  it("non-OkxError Error → ERROR with message", () => {
    const r = JSON.parse(textContent(toError(new Error("something broke"))));
    expect(r.error.code).toBe("ERROR");
    expect(r.error.message).toBe("something broke");
  });
});

// ═══════════════════════════════════════════════════════
// resolveAuth
// ═══════════════════════════════════════════════════════
describe("resolveAuth", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OKX_API_KEY;
    delete process.env.OKX_SECRET_KEY;
    delete process.env.OKX_PASSPHRASE;
  });
  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("returns auth from env vars", () => {
    process.env.OKX_API_KEY = "ek"; process.env.OKX_SECRET_KEY = "es"; process.env.OKX_PASSPHRASE = "ep";
    expect(resolveAuth()).toEqual({ apiKey: "ek", secret: "es", passphrase: "ep" });
  });

  it("returns null with no config", () => {
    expect(resolveAuth()).toBeNull();
  });
  it("returns null with incomplete env", () => {
    process.env.OKX_API_KEY = "k";
    expect(resolveAuth()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
// AUTH_REQUIRED
// ═══════════════════════════════════════════════════════
describe("AUTH_REQUIRED", () => {
  it("returns READ scope by default", () => {
    const r = JSON.parse(textContent(AUTH_REQUIRED()));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("READ");
  });
  it("returns TRADE scope", () => {
    const r = JSON.parse(textContent(AUTH_REQUIRED("TRADE")));
    expect(r.error.message).toContain("TRADE");
  });
});
