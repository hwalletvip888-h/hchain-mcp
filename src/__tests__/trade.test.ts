import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTradeApi } = vi.hoisted(() => ({
  mockTradeApi: {
    supportedChain: vi.fn(), allTokens: vi.fn(), liquidity: vi.fn(),
    quote: vi.fn(), approveTransaction: vi.fn(), swap: vi.fn(),
    swapInstruction: vi.fn(), swapHistory: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ tradeApi: mockTradeApi }));

import { registerTradeTools } from "../tools/trade.js";
import type { Auth } from "../adapters/shared.js";
import { OkxError } from "../adapters/shared.js";

interface RecordedTool { name: string; hints: Record<string, unknown>; handler: (...args: any[]) => any; }

function mockServer() {
  const tools: RecordedTool[] = [];
  return {
    tools,
    tool(name: string, ...rest: any[]) {
      tools.push({ name, hints: rest[rest.length - 2] as Record<string, unknown>, handler: rest[rest.length - 1] as (...args: any[]) => any });
    },
  };
}

const auth: Auth = { apiKey: "k", secret: "s", passphrase: "p" };
const find = (s: ReturnType<typeof mockServer>, n: string) => s.tools.find(t => t.name === n);
const parse = (r: any) => JSON.parse(r.content[0].text);

describe("registerTradeTools", () => {
  let s: ReturnType<typeof mockServer>;
  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 8 tools", () => {
    registerTradeTools(s as any, auth);
    expect(s.tools).toHaveLength(8);
  });

  it("quote is readOnly", () => {
    registerTradeTools(s as any, auth);
    expect(find(s, "onchainos_dex_quote")!.hints.readOnlyHint).toBe(true);
  });

  it("approve is destructive", () => {
    registerTradeTools(s as any, auth);
    const t = find(s, "onchainos_dex_approve_transaction")!;
    expect(t.hints.readOnlyHint).toBe(false);
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("swap is destructive", () => {
    registerTradeTools(s as any, auth);
    const t = find(s, "onchainos_dex_swap")!;
    expect(t.hints.readOnlyHint).toBe(false);
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("supported_chain returns auth error when null", async () => {
    registerTradeTools(s as any, null);
    const r = parse(await find(s, "onchainos_dex_supported_chain")!.handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("quote returns auth error READ when null", async () => {
    registerTradeTools(s as any, null);
    const r = parse(await find(s, "onchainos_dex_quote")!.handler({
      chainIndex: "1", amount: "100", fromTokenAddress: "0xa", toTokenAddress: "0xb",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("READ");
  });

  it("swap returns auth error TRADE when null", async () => {
    registerTradeTools(s as any, null);
    const r = parse(await find(s, "onchainos_dex_swap")!.handler({
      chainIndex: "1", amount: "1", fromTokenAddress: "", toTokenAddress: "0xb",
      userWalletAddress: "0xu", slippagePercent: "1",
    }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  it("all_tokens calls API", async () => {
    mockTradeApi.allTokens.mockResolvedValueOnce([{ symbol: "ETH" }]);
    registerTradeTools(s as any, auth);
    const r = parse(await find(s, "onchainos_dex_all_tokens")!.handler({ chainIndex: "1" }));
    expect(mockTradeApi.allTokens).toHaveBeenCalledWith(auth, "1");
    expect(r.success).toBe(true);
  });

  it("quote calls API and returns nextSteps", async () => {
    mockTradeApi.quote.mockResolvedValueOnce({ toTokenAmount: "500" });
    registerTradeTools(s as any, auth);
    const r = parse(await find(s, "onchainos_dex_quote")!.handler({
      chainIndex: "1", amount: "100", fromTokenAddress: "0xa", toTokenAddress: "0xb",
    }));
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("returns COIN_NOT_EXIST for bad token", async () => {
    mockTradeApi.swap.mockRejectedValueOnce(new OkxError("81152", "coin not found"));
    registerTradeTools(s as any, auth);
    const r = parse(await find(s, "onchainos_dex_swap")!.handler({
      chainIndex: "1", amount: "1", fromTokenAddress: "0xbad",
      toTokenAddress: "", userWalletAddress: "0xu", slippagePercent: "1",
    }));
    expect(r.error.code).toBe("COIN_NOT_EXIST");
  });
});
