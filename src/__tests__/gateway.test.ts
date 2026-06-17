import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGatewayApi, mockPostTxApi } = vi.hoisted(() => ({
  mockGatewayApi: { supportedChain: vi.fn(), gasPrice: vi.fn(), gasLimit: vi.fn(), simulate: vi.fn(), broadcast: vi.fn() },
  mockPostTxApi: { orders: vi.fn() },
}));

vi.mock("../adapters/onchainos.js", () => ({ gatewayApi: mockGatewayApi, postTxApi: mockPostTxApi }));

import { registerGatewayTools } from "../tools/gateway.js";
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
      // gateway tools: all 5-arg (name, desc, schema, hints, handler)
      // rest = [desc, schema, hints, handler] — length 4
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

describe("registerGatewayTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 6 tools", () => {
    registerGatewayTools(s as any, auth);
    expect(s.tools).toHaveLength(6);
  });

  it("registered names match expected", () => {
    registerGatewayTools(s as any, auth);
    expect(s.tools.map(t => t.name).sort()).toEqual([
      "onchainos_gateway_broadcast", "onchainos_gateway_gas_limit",
      "onchainos_gateway_gas_price", "onchainos_gateway_orders",
      "onchainos_gateway_simulate", "onchainos_gateway_supported_chain",
    ]);
  });

  // ── hints ──
  it("broadcast is marked destructive", () => {
    registerGatewayTools(s as any, auth);
    const t = find(s, "onchainos_gateway_broadcast")!;
    expect(t.hints.readOnlyHint).toBe(false);
    expect(t.hints.destructiveHint).toBe(true);
  });

  it("gas_price is readOnly", () => {
    registerGatewayTools(s as any, auth);
    expect(find(s, "onchainos_gateway_gas_price")!.hints.readOnlyHint).toBe(true);
  });

  // ── auth ──
  it("gas_price returns AUTH_REQUIRED when null", async () => {
    registerGatewayTools(s as any, null);
    const r = parse(await find(s, "onchainos_gateway_gas_price")!.handler({ chainIndex: "1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("READ");
  });

  it("broadcast returns AUTH_REQUIRED(TRADE) when null", async () => {
    registerGatewayTools(s as any, null);
    const r = parse(await find(s, "onchainos_gateway_broadcast")!.handler({ signedTx: "0x", chainIndex: "1", address: "0x1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
    expect(r.error.message).toContain("TRADE");
  });

  // ── success ──
  it("gas_price calls API with chainIndex", async () => {
    mockGatewayApi.gasPrice.mockResolvedValueOnce({ fast: "50", standard: "30" });
    registerGatewayTools(s as any, auth);
    const r = parse(await find(s, "onchainos_gateway_gas_price")!.handler({ chainIndex: "1" }));
    expect(mockGatewayApi.gasPrice).toHaveBeenCalledWith(auth, "1");
    expect(r.success).toBe(true);
  });

  it("gas_limit calls API", async () => {
    mockGatewayApi.gasLimit.mockResolvedValueOnce({ gasLimit: "65000" });
    registerGatewayTools(s as any, auth);
    const r = parse(await find(s, "onchainos_gateway_gas_limit")!.handler({
      chainIndex: "1", fromAddress: "0xf", toAddress: "0xt",
    }));
    expect(r.success).toBe(true);
  });

  it("orders calls postTxApi", async () => {
    mockPostTxApi.orders.mockResolvedValueOnce([{ orderId: "1" }]);
    registerGatewayTools(s as any, auth);
    const r = parse(await find(s, "onchainos_gateway_orders")!.handler({
      address: "0xu", chainIndex: "1", txStatus: "2", orderId: "o1", cursor: "", limit: "50",
    }));
    expect(mockPostTxApi.orders).toHaveBeenCalledWith(auth, "0xu", "1", "2", "o1", "", "50");
    expect(r.success).toBe(true);
  });

  // ── errors ──
  it("simulate returns SYSTEM_ERROR for 500", async () => {
    mockGatewayApi.simulate.mockRejectedValueOnce(new Error("500 Internal"));
    registerGatewayTools(s as any, auth);
    const r = parse(await find(s, "onchainos_gateway_simulate")!.handler({
      fromAddress: "0x1", toAddress: "0x2", chainIndex: "1", inputData: "0x",
    }));
    expect(r.error.code).toBe("SYSTEM_ERROR");
  });
});
