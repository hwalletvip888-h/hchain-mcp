import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toResult, toError, resolveAuth, AUTH_REQUIRED, errMsg } from "../adapters/shared.js";

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
// toError — OKX error codes
// ═══════════════════════════════════════════════════════
describe("toError", () => {
  it("wraps Error in error response", () => {
    const r = JSON.parse(textContent(toError(new Error("fail"))));
    expect(r.success).toBe(false);
    expect(r.error.code).toBe("ERROR");
  });

  const cases: [string, string, number?][] = [
    ["OKX 50001:srv", "SERVICE_UNAVAILABLE", 3000],
    ["OKX 50011:rate", "RATE_LIMITED", 5000],
    ["OKX 50103:auth", "AUTH_ERROR", undefined],
    ["OKX 50104:auth", "AUTH_ERROR", undefined],
    ["OKX 50105:auth", "AUTH_ERROR", undefined],
    ["OKX 50106:auth", "AUTH_ERROR", undefined],
    ["OKX 50107:auth", "AUTH_ERROR", undefined],
    ["OKX 50111:auth", "AUTH_ERROR", undefined],
    ["OKX 50112:auth", "AUTH_ERROR", undefined],
    ["OKX 50113:auth", "AUTH_ERROR", undefined],
    ["OKX 81001:param", "BAD_PARAMETER", undefined],
    ["OKX 81108:wallet", "WALLET_TYPE_MISMATCH", undefined],
    ["OKX 81104:chain", "CHAIN_NOT_SUPPORT", undefined],
    ["OKX 81152:coin", "COIN_NOT_EXIST", undefined],
    ["OKX 81451:node", "NODE_FAILED", 2000],
    ["OKX 84001:proto", "PROTOCOL_NOT_SUPPORT", undefined],
    ["OKX 84003:proto", "PROTOCOL_NOT_SUPPORT", undefined],
    ["OKX 84007:prod", "PRODUCT_NOT_SUPPORT", undefined],
    ["OKX 84024:prod", "PRODUCT_NOT_SUPPORT", undefined],
    ["OKX 84010:token", "TOKEN_NOT_SUPPORT", undefined],
    ["OKX 84014:bal", "BALANCE_FAILED", undefined],
    ["OKX 84016:contract", "CONTRACT_FAILED", undefined],
    ["OKX 84019:addr", "ADDRESS_MISMATCH", undefined],
    ["OKX 84021:sync", "SYNCING", 3000],
    ["OKX 84025:noreward", "NO_REWARD", undefined],
    ["OKX 84029:locked", "LOCKED", undefined],
    ["OKX 84030:expired", "EXPIRED", undefined],
    ["OKX 84032:v3only", "V3_ONLY", undefined],
  ];
  for (const [msg, code, retry] of cases) {
    it(`${msg.split(":")[0].split(" ")[1]} → ${code}`, () => {
      const r = JSON.parse(textContent(toError(new Error(msg))));
      expect(r.error.code).toBe(code);
      if (retry) expect(r.error.retryAfter).toBe(retry);
    });
  }

  it("HTTP 429 → RATE_LIMITED", () => {
    const r = JSON.parse(textContent(toError(new Error("429 Too Many"))));
    expect(r.error.code).toBe("RATE_LIMITED");
  });
  it("HTTP 503 → UNAVAILABLE", () => {
    const r = JSON.parse(textContent(toError(new Error("503 Service"))));
    expect(r.error.code).toBe("UNAVAILABLE");
    expect(r.error.retryAfter).toBe(5000);
  });
  it("HTTP 400 → BAD_REQUEST", () => {
    const r = JSON.parse(textContent(toError(new Error("400 Bad"))));
    expect(r.error.code).toBe("BAD_REQUEST");
  });
  it("HTTP 422 → BUSINESS_REJECT", () => {
    const r = JSON.parse(textContent(toError(new Error("422 Unprocessable"))));
    expect(r.error.code).toBe("BUSINESS_REJECT");
  });
  it("HTTP 500 → SYSTEM_ERROR", () => {
    const r = JSON.parse(textContent(toError(new Error("500 Internal"))));
    expect(r.error.code).toBe("SYSTEM_ERROR");
  });
  it("handles string error", () => {
    const r = JSON.parse(textContent(toError("network error")));
    expect(r.success).toBe(false);
    expect(r.error.message).toBe("network error");
  });
});

// ═══════════════════════════════════════════════════════
// resolveAuth
// ═══════════════════════════════════════════════════════
describe("resolveAuth", () => {
  const origEnv = { ...process.env };
  const origArgv = [...process.argv];

  beforeEach(() => {
    delete process.env.OKX_API_KEY;
    delete process.env.OKX_SECRET_KEY;
    delete process.env.OKX_PASSPHRASE;
    process.argv = [process.argv[0], process.argv[1]];
  });
  afterEach(() => {
    process.env = { ...origEnv };
    process.argv = [...origArgv];
  });

  it("returns auth from env vars", () => {
    process.env.OKX_API_KEY = "ek"; process.env.OKX_SECRET_KEY = "es"; process.env.OKX_PASSPHRASE = "ep";
    expect(resolveAuth()).toEqual({ apiKey: "ek", secret: "es", passphrase: "ep" });
  });
  it("returns auth from CLI args", () => {
    process.argv.push("--okx-api-key", "ck", "--okx-secret", "cs", "--okx-passphrase", "cp");
    expect(resolveAuth()).toEqual({ apiKey: "ck", secret: "cs", passphrase: "cp" });
  });
  it("returns auth from short CLI flags", () => {
    process.argv.push("-k", "sk", "-s", "ss", "-p", "sp");
    expect(resolveAuth()).toEqual({ apiKey: "sk", secret: "ss", passphrase: "sp" });
  });
  it("prefers env over CLI", () => {
    process.env.OKX_API_KEY = "ek"; process.env.OKX_SECRET_KEY = "es"; process.env.OKX_PASSPHRASE = "ep";
    process.argv.push("--okx-api-key", "ck", "--okx-secret", "cs", "--okx-passphrase", "cp");
    expect(resolveAuth()).toEqual({ apiKey: "ek", secret: "es", passphrase: "ep" });
  });
  it("returns null with no config", () => {
    expect(resolveAuth()).toBeNull();
  });
  it("returns null with incomplete env", () => {
    process.env.OKX_API_KEY = "k";
    expect(resolveAuth()).toBeNull();
  });
  it("returns null with incomplete CLI", () => {
    process.argv.push("--okx-api-key", "k");
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
