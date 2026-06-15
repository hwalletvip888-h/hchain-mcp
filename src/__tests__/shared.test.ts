import { describe, it, expect } from "vitest";
import { toResult, toError } from "../adapters/shared.js";

function textContent(result: { content: unknown[] }): string {
  const c = result.content[0] as any;
  return c?.text ?? "";
}

describe("toResult", () => {
  it("should wrap data in success response", () => {
    const result = toResult({ balance: "100" });
    const parsed = JSON.parse(textContent(result));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ balance: "100" });
    expect(parsed.tsIso).toBeDefined();
  });

  it("should include warnings if provided", () => {
    const result = toResult("ok", { warnings: ["rate limited"] });
    const parsed = JSON.parse(textContent(result));
    expect(parsed.warnings).toEqual(["rate limited"]);
  });

  it("should include nextSteps if provided", () => {
    const result = toResult("ok", {
      nextSteps: [{ action: "check balance", tool: "onchainos_balance_total_value" }],
    });
    const parsed = JSON.parse(textContent(result));
    expect(parsed.nextSteps).toHaveLength(1);
    expect(parsed.nextSteps[0].tool).toBe("onchainos_balance_total_value");
  });
});

describe("toError", () => {
  it("should wrap Error in error response", () => {
    const result = toError(new Error("Something went wrong"));
    const parsed = JSON.parse(textContent(result));
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe("ERROR");
    expect(result.isError).toBe(true);
  });

  it("should categorize OKX 50001 as SERVICE_UNAVAILABLE", () => {
    const result = toError(new Error("OKX 50001: server error"));
    const parsed = JSON.parse(textContent(result));
    expect(parsed.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(parsed.error.retryAfter).toBe(3000);
  });

  it("should categorize OKX 50103 as AUTH_ERROR", () => {
    const result = toError(new Error("OKX 50103: signature mismatch"));
    const parsed = JSON.parse(textContent(result));
    expect(parsed.error.code).toBe("AUTH_ERROR");
  });

  it("should categorize 429 as RATE_LIMITED", () => {
    const result = toError(new Error("HTTP 429 Too Many Requests"));
    const parsed = JSON.parse(textContent(result));
    expect(parsed.error.code).toBe("RATE_LIMITED");
  });

  it("should handle string errors", () => {
    const result = toError("network error");
    const parsed = JSON.parse(textContent(result));
    expect(parsed.success).toBe(false);
    expect(parsed.error.message).toBe("network error");
  });
});
