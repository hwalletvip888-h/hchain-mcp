/**
 * H-MCP 共享工具层
 * 规范: OnchainOS-API对接规范.md §四/§六 + AGENT-MCP-RULES.md
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ── 类型 ────────────────────────────────────────────────────

export interface Auth {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface NextStep {
  action: string;
  tool: string;
  params?: Record<string, unknown>;
  condition?: string;
}

// ── toResult ────────────────────────────────────────────────

export function toResult<T>(
  data: T,
  opts?: { warnings?: string[]; nextSteps?: NextStep[] },
): CallToolResult {
  const body: Record<string, unknown> = {
    success: true,
    data,
    tsIso: new Date().toISOString(),
  };
  if (opts?.warnings?.length) body.warnings = opts.warnings;
  if (opts?.nextSteps?.length) body.nextSteps = opts.nextSteps;
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

// ── toError ─────────────────────────────────────────────────

export function toError(e: unknown): CallToolResult {
  const msg = e instanceof Error ? e.message : String(e);
  let error: { code: string; message: string; fix: string; retryAfter?: number };

  if (msg.includes("429") || msg.includes("RATE")) {
    error = { code: "RATE_LIMITED", message: msg, fix: "请等待 1-2 秒后重试", retryAfter: 1000 };
  } else if (msg.includes("503")) {
    error = { code: "UNAVAILABLE", message: msg, fix: "服务暂时不可用，请等待 5 秒后重试", retryAfter: 5000 };
  } else if (msg.includes("400")) {
    error = { code: "BAD_REQUEST", message: msg, fix: "请检查参数格式和必填字段" };
  } else if (msg.includes("422")) {
    error = { code: "BUSINESS_REJECT", message: msg, fix: "参数合法但业务不可行，请检查余额/授权等条件" };
  } else if (msg.includes("500")) {
    error = { code: "SYSTEM_ERROR", message: msg, fix: "系统错误，不建议重试" };
  } else {
    error = { code: "ERROR", message: msg, fix: "请检查网络和 API 配置" };
  }

  return {
    content: [{ type: "text", text: JSON.stringify({ success: false, error, tsIso: new Date().toISOString() }) }],
    isError: true,
  };
}

// ── AUTH_REQUIRED ───────────────────────────────────────────

export function AUTH_REQUIRED(scope: "READ" | "TRADE" = "READ"): CallToolResult {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        success: false,
        error: {
          code: "AUTH_REQUIRED",
          message: `需要 OKX API Key（${scope} 权限）`,
          fix: "请设置环境变量 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE",
        },
        tsIso: new Date().toISOString(),
      }),
    }],
    isError: true,
  };
}
