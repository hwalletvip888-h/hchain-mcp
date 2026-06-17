import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBalanceApi } = vi.hoisted(() => ({
  mockBalanceApi: {
    supportedChain: vi.fn(),
    totalValue: vi.fn(),
    allTokenBalances: vi.fn(),
    specificTokenBalance: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ balanceApi: mockBalanceApi }));

import { registerBalanceTools } from "../tools/balance.js";
import type { Auth } from "../adapters/shared.js";

interface RecordedTool {
  name: string; description: string; schema: Record<string, unknown>;
  hints: Record<string, unknown>; handler: (...args: any[]) => any;
}

function mockServer() {
  const tools: RecordedTool[] = [];
  return {
    tools,
    tool(name: string, ...rest: any[]) {
      // balance tools 2 patterns:
      // 4-arg (3 in rest): (name, desc, hints, handler) — supported_chain
      // 5-arg (4 in rest): (name, desc, schema, hints, handler) — others
      const handler = rest[rest.length - 1];
      const hints = rest[rest.length - 2];
      const schema = rest.length === 3 ? {} : rest[1];
      tools.push({ name, description: rest[0], schema: schema as Record<string, unknown>, hints: hints as Record<string, unknown>, handler: handler as (...args: any[]) => any });
    },
  };
}

const auth: Auth = { apiKey: "k", secret: "s", passphrase: "p" };
const find = (s: ReturnType<typeof mockServer>, n: string) => s.tools.find(t => t.name === n);
const parse = (r: any) => JSON.parse(r.content[0].text);

describe("registerBalanceTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 4 tools", () => {
    registerBalanceTools(s as any, auth);
    expect(s.tools).toHaveLength(4);
  });

  it("registered names match expected", () => {
    registerBalanceTools(s as any, auth);
    const names = s.tools.map(t => t.name).sort();
    expect(names).toEqual([
      "onchainos_balance_all_tokens",
      "onchainos_balance_specific_token",
      "onchainos_balance_supported_chain",
      "onchainos_balance_total_value",
    ]);
  });

  it("all tools have readOnlyHint=true", () => {
    registerBalanceTools(s as any, auth);
    for (const t of s.tools) {
      expect(t.hints.readOnlyHint).toBe(true);
      expect(t.hints.destructiveHint).toBe(false);
    }
  });

  // ── supported_chain ──
  it("supported_chain returns auth error when null", async () => {
    registerBalanceTools(s as any, null);
    const r = parse(await find(s, "onchainos_balance_supported_chain")!.handler());
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("supported_chain calls API and wraps result", async () => {
    mockBalanceApi.supportedChain.mockResolvedValueOnce([{ chainIndex: "1", chainName: "Ethereum" }]);
    registerBalanceTools(s as any, auth);
    const r = parse(await find(s, "onchainos_balance_supported_chain")!.handler());
    expect(r.success).toBe(true);
    expect(r.data).toEqual([{ chainIndex: "1", chainName: "Ethereum" }]);
  });

  // ── total_value ──
  it("total_value returns auth error when null", async () => {
    registerBalanceTools(s as any, null);
    const r = parse(await find(s, "onchainos_balance_total_value")!.handler({ address: "0x1", chains: "1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("total_value calls API with all params", async () => {
    mockBalanceApi.totalValue.mockResolvedValueOnce({ totalUsdValue: "1234" });
    registerBalanceTools(s as any, auth);
    const r = parse(await find(s, "onchainos_balance_total_value")!.handler({
      address: "0xabc", chains: "1,56", assetType: "1", excludeRiskToken: true,
    }));
    expect(mockBalanceApi.totalValue).toHaveBeenCalledWith(auth, "0xabc", "1,56", "1", true);
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  // ── all_tokens ──
  it("all_tokens calls API and returns nextSteps", async () => {
    mockBalanceApi.allTokenBalances.mockResolvedValueOnce([{ symbol: "ETH", balance: "1.5" }]);
    registerBalanceTools(s as any, auth);
    const r = parse(await find(s, "onchainos_balance_all_tokens")!.handler({
      address: "0xabc", chains: "1", excludeRiskToken: "0",
    }));
    expect(mockBalanceApi.allTokenBalances).toHaveBeenCalledWith(auth, "0xabc", "1", "0");
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  // ── specific_token ──
  it("specific_token calls API with tokens array", async () => {
    mockBalanceApi.specificTokenBalance.mockResolvedValueOnce([{ tokenContractAddress: "0xdef" }]);
    registerBalanceTools(s as any, auth);
    const tokens = [{ chainIndex: "1", tokenContractAddress: "0xdef" }];
    const r = parse(await find(s, "onchainos_balance_specific_token")!.handler({
      address: "0xabc", tokens, excludeRiskToken: "1",
    }));
    expect(mockBalanceApi.specificTokenBalance).toHaveBeenCalledWith(auth, "0xabc", tokens, "1");
    expect(r.success).toBe(true);
  });

  // ── error paths ──
  it("returns RATE_LIMITED for 429", async () => {
    mockBalanceApi.supportedChain.mockRejectedValueOnce(new Error("429 Too Many"));
    registerBalanceTools(s as any, auth);
    const r = parse(await find(s, "onchainos_balance_supported_chain")!.handler());
    expect(r.error.code).toBe("RATE_LIMITED");
  });

  it("returns CHAIN_NOT_SUPPORT for OKX 81104", async () => {
    mockBalanceApi.totalValue.mockRejectedValueOnce(new Error("OKX 81104: chain not supported"));
    registerBalanceTools(s as any, auth);
    const r = parse(await find(s, "onchainos_balance_total_value")!.handler({ address: "0x1", chains: "999" }));
    expect(r.error.code).toBe("CHAIN_NOT_SUPPORT");
  });
});
