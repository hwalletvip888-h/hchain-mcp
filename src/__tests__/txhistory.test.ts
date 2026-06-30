import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPostTxApi } = vi.hoisted(() => ({
  mockPostTxApi: {
    supportedChain: vi.fn(),
    transactions: vi.fn(),
    transactionDetail: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos.js", () => ({ postTxApi: mockPostTxApi }));

import { registerTxHistoryTools } from "../tools/txhistory.js";
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

describe("registerTxHistoryTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 3 tools", () => {
    registerTxHistoryTools(s as any, auth);
    expect(s.tools).toHaveLength(3);
  });

  it("registered names match expected", () => {
    registerTxHistoryTools(s as any, auth);
    expect(s.tools.map(t => t.name).sort()).toEqual([
      "onchainos_transaction_detail",
      "onchainos_transaction_history",
      "onchainos_tx_history_supported_chain",
    ]);
  });

  it("all tools have readOnlyHint=true", () => {
    registerTxHistoryTools(s as any, auth);
    for (const t of s.tools) expect(t.hints.readOnlyHint).toBe(true);
  });

  // ── Auth ──
  it("supported_chain returns AUTH_REQUIRED when null", async () => {
    registerTxHistoryTools(s as any, null);
    const r = parse(await find(s, "onchainos_tx_history_supported_chain")!.handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("transaction_history returns AUTH_REQUIRED when null", async () => {
    registerTxHistoryTools(s as any, null);
    const r = parse(await find(s, "onchainos_transaction_history")!.handler({ address: "0x1", chains: "1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("transaction_detail returns AUTH_REQUIRED when null", async () => {
    registerTxHistoryTools(s as any, null);
    const r = parse(await find(s, "onchainos_transaction_detail")!.handler({ chainIndex: "1", txHash: "0xabc" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  // ── Success ──
  it("supported_chain calls API and returns result", async () => {
    mockPostTxApi.supportedChain.mockResolvedValueOnce([{ chainIndex: "1", chainName: "Ethereum" }]);
    registerTxHistoryTools(s as any, auth);
    const r = parse(await find(s, "onchainos_tx_history_supported_chain")!.handler({}));
    expect(mockPostTxApi.supportedChain).toHaveBeenCalledWith(auth);
    expect(r.success).toBe(true);
    expect(r.data).toEqual([{ chainIndex: "1", chainName: "Ethereum" }]);
  });

  it("transaction_history calls API with all params", async () => {
    mockPostTxApi.transactions.mockResolvedValueOnce([{ txHash: "0xabc", amount: "100" }]);
    registerTxHistoryTools(s as any, auth);
    const r = parse(await find(s, "onchainos_transaction_history")!.handler({
      address: "0xuser", chains: "1,56", tokenContractAddress: "0xusdc",
      begin: "1700000000000", end: "1700100000000", cursor: "page2", limit: "20",
    }));
    expect(mockPostTxApi.transactions).toHaveBeenCalledWith(auth, "0xuser", "1,56", "0xusdc", "1700000000000", "1700100000000", "page2", "20");
    expect(r.success).toBe(true);
    expect(r.nextSteps).toBeDefined();
  });

  it("transaction_detail calls API with itype", async () => {
    mockPostTxApi.transactionDetail.mockResolvedValueOnce({ txHash: "0xabc", status: "success" });
    registerTxHistoryTools(s as any, auth);
    const r = parse(await find(s, "onchainos_transaction_detail")!.handler({
      chainIndex: "1", txHash: "0xabc", itype: "0",
    }));
    expect(mockPostTxApi.transactionDetail).toHaveBeenCalledWith(auth, "1", "0xabc", "0");
    expect(r.success).toBe(true);
  });

  it("transaction_detail works without itype", async () => {
    mockPostTxApi.transactionDetail.mockResolvedValueOnce({ txHash: "0xabc" });
    registerTxHistoryTools(s as any, auth);
    const r = parse(await find(s, "onchainos_transaction_detail")!.handler({
      chainIndex: "1", txHash: "0xabc",
    }));
    expect(mockPostTxApi.transactionDetail).toHaveBeenCalledWith(auth, "1", "0xabc", undefined);
    expect(r.success).toBe(true);
  });

  // ── Error ──
  it("returns error on API failure", async () => {
    mockPostTxApi.supportedChain.mockRejectedValueOnce(new OkxError("50001", "Service unavailable"));
    registerTxHistoryTools(s as any, auth);
    const r = parse(await find(s, "onchainos_tx_history_supported_chain")!.handler({}));
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });
});
