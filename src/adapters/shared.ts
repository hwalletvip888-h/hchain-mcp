/**
 * H-MCP Shared Utilities
 *
 * 所有 MCP 工具共用的 toResult / toError / 错误处理 / 常量
 * 规范依据: AGENT-MCP-RULES.md + OnchainOS-API对接规范.md
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ── 标准返回结构 ──────────────────────────────────────────────

/** 成功返回 — 含 nextSteps 提示链 */
export function toResult<T>(
  data: T,
  opts?: {
    meta?: Partial<ResultMeta>;
    warnings?: string[];
    nextSteps?: NextStep[];
  },
): CallToolResult {
  const r: Record<string, unknown> = {
    success: true,
    data,
    tsIso: new Date().toISOString(),
    meta: {
      source: "okx-onchainos",
      cached: false,
      ...opts?.meta,
    },
  };
  if (opts?.warnings?.length) r.warnings = opts.warnings;
  if (opts?.nextSteps?.length) r.nextSteps = opts.nextSteps;
  return {
    content: [{ type: "text", text: JSON.stringify(r) }],
  };
}

/** 错误返回 — 区分错误类型，给出可执行的 fix */
export function toError(e: unknown): CallToolResult {
  const msg = e instanceof Error ? e.message : String(e);
  const httpMatch = msg.match(/HTTP (\d{3})/);
  const okxMatch = msg.match(/OKX (\w+): (.+)/);

  let error: ErrorBody;

  if (httpMatch) {
    const code = parseInt(httpMatch[1]);
    if (code === 429 || code === 503) {
      error = { code: "RATE_LIMITED", message: msg, fix: "稍后重试，建议等待 1-2 秒", retryAfter: code === 429 ? 1000 : 5000 };
    } else if (code === 400) {
      error = { code: "BAD_REQUEST", message: msg, fix: "检查参数格式，确认必填字段和类型无误" };
    } else if (code === 422) {
      error = { code: "BUSINESS_REJECT", message: msg, fix: "参数合法但业务上不可行，请检查余额/滑点/授权等条件" };
    } else {
      error = { code: "SYSTEM_ERROR", message: msg, fix: "系统问题，不建议重试。请联系管理员" };
    }
  } else if (okxMatch) {
    error = { code: okxMatch[1], message: okxMatch[2], fix: "参见 OKX 错误码文档" };
  } else {
    error = { code: "UNKNOWN", message: msg, fix: "请检查网络连接和 API 配置" };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        success: false,
        error,
        tsIso: new Date().toISOString(),
      }),
    }],
    isError: true,
  };
}

interface ErrorBody {
  code: string;
  message: string;
  fix: string;
  retryAfter?: number;
}

interface ResultMeta {
  source: string;
  cached: boolean;
  requestId?: string;
}

// ── 鉴权提示（无需 Key 时返回 null 即可） ──────────────────────

export const AUTH_REQUIRED = (scope: "READ" | "TRADE" = "READ"): CallToolResult => ({
  content: [{
    type: "text",
    text: JSON.stringify({
      success: false,
      error: {
        code: "AUTH_REQUIRED",
        message: `需要 OKX API Key（${scope} 权限）`,
        fix: "请提供 apiKey、secret、passphrase 三个参数，或配置环境变量 OKX_API_KEY / OKX_SECRET / OKX_PASSPHRASE",
      },
      tsIso: new Date().toISOString(),
    }),
  }],
  isError: true,
});

// ── 枚举常量 ──────────────────────────────────────────────────

/** 仅行情类（公开） */
export const INST_TYPE_MARKET = ["SPOT", "SWAP", "FUTURES"] as const;
/** 所有产品类型 */
export const INST_TYPE_ALL = ["SPOT", "SWAP", "FUTURES", "OPTION", "MARGIN"] as const;

// ── 类型导出 ──────────────────────────────────────────────────

export interface Auth {
  apiKey: string;
  secret: string;
  passphrase: string;
}

/** 9 字段描述模板所需的鉴权标注 */
export type AuthLevel = "PUBLIC" | "READ" | "TRADE";

/** 9 字段描述模板所需的风险标注 */
export type RiskLevel = "READ" | "WRITE";

/** 9 字段描述模板所需的返回量标注 */
export type ReturnSize = "微小 ~1KB" | "微小 ~2KB" | "中等 ~10KB" | "中等 ~30KB" | "大 ~100KB" | "大 ~500KB";

/** 链式提示下一步 */
export interface NextStep {
  action: string;
  tool: string;
  params?: Record<string, unknown>;
  condition?: string;
}
