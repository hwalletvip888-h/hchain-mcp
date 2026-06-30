import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWsModule } = vi.hoisted(() => ({
  mockWsModule: {
    wsConnect: vi.fn(),
    wsSubscribe: vi.fn(),
    wsUnsubscribe: vi.fn(),
    wsDisconnect: vi.fn(),
  },
}));

vi.mock("../adapters/onchainos-ws.js", () => mockWsModule);

import { registerWsTools } from "../tools/ws.js";
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

describe("registerWsTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 4 tools", () => {
    registerWsTools(s as any, auth);
    expect(s.tools).toHaveLength(4);
  });

  it("registered names match expected", () => {
    registerWsTools(s as any, auth);
    expect(s.tools.map(t => t.name).sort()).toEqual([
      "onchainos_ws_connect",
      "onchainos_ws_disconnect",
      "onchainos_ws_subscribe",
      "onchainos_ws_unsubscribe",
    ]);
  });

  it("all tools have readOnlyHint=true", () => {
    registerWsTools(s as any, auth);
    for (const t of s.tools) {
      expect(t.hints.readOnlyHint).toBe(true);
    }
  });

  // ── Auth ──
  it("connect returns AUTH_REQUIRED when null", async () => {
    registerWsTools(s as any, null);
    const r = parse(await find(s, "onchainos_ws_connect")!.handler({}));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("subscribe returns AUTH_REQUIRED when null", async () => {
    registerWsTools(s as any, null);
    const r = parse(await find(s, "onchainos_ws_subscribe")!.handler({ channel: "price", chainIndex: "1" }));
    expect(r.error.code).toBe("AUTH_REQUIRED");
  });

  it("unsubscribe works with null auth (no auth check)", async () => {
    mockWsModule.wsUnsubscribe.mockResolvedValueOnce(undefined);
    registerWsTools(s as any, null);
    const r = parse(await find(s, "onchainos_ws_unsubscribe")!.handler({ channel: "price", chainIndex: "1" }));
    expect(r.success).toBe(true);
    expect(r.data.status).toBe("unsubscribed");
  });

  it("disconnect works with null auth (no auth check)", async () => {
    registerWsTools(s as any, null);
    const r = parse(await find(s, "onchainos_ws_disconnect")!.handler({}));
    expect(r.success).toBe(true);
    expect(r.data.status).toBe("disconnected");
  });

  // ── Success ──
  it("connect calls wsConnect and returns connId", async () => {
    mockWsModule.wsConnect.mockResolvedValueOnce("conn-abc-123");
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_connect")!.handler({}));
    expect(mockWsModule.wsConnect).toHaveBeenCalledWith(auth);
    expect(r.success).toBe(true);
    expect(r.data.connId).toBe("conn-abc-123");
    expect(r.data.status).toBe("connected");
  });

  it("subscribe calls wsSubscribe with channel params", async () => {
    mockWsModule.wsSubscribe.mockResolvedValueOnce(undefined);
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_subscribe")!.handler({
      channel: "price", chainIndex: "1", tokenContractAddress: "0xabc",
    }));
    expect(mockWsModule.wsSubscribe).toHaveBeenCalledWith({
      channel: "price", chainIndex: "1", tokenContractAddress: "0xabc",
    });
    expect(r.success).toBe(true);
    expect(r.data.status).toBe("subscribed");
  });

  it("subscribe with walletAddress", async () => {
    mockWsModule.wsSubscribe.mockResolvedValueOnce(undefined);
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_subscribe")!.handler({
      channel: "address-tracker-activity", chainIndex: "501",
      walletAddress: "0xaddr1,0xaddr2",
    }));
    expect(mockWsModule.wsSubscribe).toHaveBeenCalledWith({
      channel: "address-tracker-activity", chainIndex: "501",
      walletAddress: "0xaddr1,0xaddr2",
    });
    expect(r.success).toBe(true);
  });

  it("unsubscribe calls wsUnsubscribe", async () => {
    mockWsModule.wsUnsubscribe.mockResolvedValueOnce(undefined);
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_unsubscribe")!.handler({
      channel: "price", chainIndex: "1",
    }));
    expect(mockWsModule.wsUnsubscribe).toHaveBeenCalled();
    expect(r.success).toBe(true);
  });

  it("disconnect calls wsDisconnect", async () => {
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_disconnect")!.handler({}));
    expect(mockWsModule.wsDisconnect).toHaveBeenCalledOnce();
    expect(r.success).toBe(true);
  });

  // ── Error ──
  it("connect returns error on WS failure", async () => {
    mockWsModule.wsConnect.mockRejectedValueOnce(new Error("Connection refused"));
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_connect")!.handler({}));
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("subscribe returns error on API failure", async () => {
    mockWsModule.wsSubscribe.mockRejectedValueOnce(new Error("Subscribe failed"));
    registerWsTools(s as any, auth);
    const r = parse(await find(s, "onchainos_ws_subscribe")!.handler({ channel: "price", chainIndex: "1" }));
    expect(r.success).toBe(false);
  });
});
