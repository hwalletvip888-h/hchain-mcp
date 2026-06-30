import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => JSON.stringify({ version: "1.4.2", name: "hchain-skills" })),
}));

import { registerHelpTools } from "../tools/help.js";

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

const parse = (r: any) => JSON.parse(r.content[0].text);

describe("registerHelpTools", () => {
  let s: ReturnType<typeof mockServer>;

  beforeEach(() => { s = mockServer(); vi.clearAllMocks(); });

  it("registers 1 tool", () => {
    registerHelpTools(s as any, null);
    expect(s.tools).toHaveLength(1);
  });

  it("registers onchainos_help", () => {
    registerHelpTools(s as any, null);
    expect(s.tools[0].name).toBe("onchainos_help");
  });

  it("has readOnlyHint", () => {
    registerHelpTools(s as any, null);
    expect(s.tools[0].hints.readOnlyHint).toBe(true);
  });

  it("returns version and tools count from package.json", async () => {
    registerHelpTools(s as any, null);
    const r = parse(await s.tools[0].handler());
    expect(r.success).toBe(true);
    expect(r.data.version).toBe("1.4.2");
    expect(r.data.tools).toBe(113);
    expect(r.data.name).toBe("链上赚币");
  });

  it("returns menu array", async () => {
    registerHelpTools(s as any, null);
    const r = parse(await s.tools[0].handler());
    expect(r.data.menu).toBeInstanceOf(Array);
    expect(r.data.menu.length).toBeGreaterThan(10);
  });

  it("returns examples array", async () => {
    registerHelpTools(s as any, null);
    const r = parse(await s.tools[0].handler());
    expect(r.data.examples).toBeInstanceOf(Array);
  });

  it("returns commands array", async () => {
    registerHelpTools(s as any, null);
    const r = parse(await s.tools[0].handler());
    expect(r.data.commands).toBeInstanceOf(Array);
  });

  it("returns rules array", async () => {
    registerHelpTools(s as any, null);
    const r = parse(await s.tools[0].handler());
    expect(r.data.rules).toBeInstanceOf(Array);
  });

  it("returns internalAgents array", async () => {
    registerHelpTools(s as any, null);
    const r = parse(await s.tools[0].handler());
    expect(r.data.internalAgents).toBeInstanceOf(Array);
  });

  it("works with null auth (help is public)", async () => {
    const s2 = mockServer();
    registerHelpTools(s2 as any, null);
    const r = parse(await s2.tools[0].handler());
    expect(r.success).toBe(true);
  });
});
