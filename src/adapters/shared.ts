/**
 * h-mcp — 共享工具层
 * 规范: OnchainOS-API对接规范.md §四/§六 + AGENT-MCP-RULES.md §4/§8
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ── 类型 ────────────────────────────────────────────────────
export interface Auth { apiKey: string; secret: string; passphrase: string; }

export interface NextStep {
  action: string;
  tool: string;
  params?: Record<string, unknown>;
  condition?: string;
}

/** 结构化错误 — OKX 业务错误码 或 HTTP 传输层错误 */
export class OkxError extends Error {
  constructor(
    public code: string,
    msg: string,
    public httpStatus?: number,
  ) {
    super(`OKX ${code}: ${msg}`);
    this.name = "OkxError";
  }
}

// ── 业务错误码 → 用户友好信息映射 ───────────────────────────
const ERROR_MAP: Record<string, { code: string; message: string; fix: string; retryAfter?: number }> = {
  // OKX 业务错误码
  "50001": { code: "SERVICE_UNAVAILABLE", message: "服务暂不可用", fix: "等待几秒后重试", retryAfter: 3000 },
  "50011": { code: "RATE_LIMITED", message: "超出频率限制", fix: "请降低请求频率", retryAfter: 5000 },
  "50103": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50104": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50105": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50106": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50107": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50111": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50112": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "50113": { code: "AUTH_ERROR", message: "API Key 签名错误", fix: "请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" },
  "81001": { code: "BAD_PARAMETER", message: "参数不正确", fix: "请检查参数名/类型/必填项" },
  "81108": { code: "WALLET_TYPE_MISMATCH", message: "钱包类型不匹配", fix: "请确认链和地址格式一致" },
  "81104": { code: "CHAIN_NOT_SUPPORT", message: "该链不支持此操作", fix: "请调用 supported_chain 确认可用链" },
  "81152": { code: "COIN_NOT_EXIST", message: "代币不存在", fix: "请用 onchainos_token_search 搜索正确地址" },
  "81451": { code: "NODE_FAILED", message: "节点返回失败", fix: "请稍后重试", retryAfter: 2000 },
  "84001": { code: "PROTOCOL_NOT_SUPPORT", message: "协议不支持", fix: "请用 onchainos_defi_supported_platforms 确认支持列表" },
  "84003": { code: "PROTOCOL_NOT_SUPPORT", message: "协议不支持", fix: "请用 onchainos_defi_supported_platforms 确认支持列表" },
  "84007": { code: "PRODUCT_NOT_SUPPORT", message: "投资品不支持或不存在", fix: "请用 onchainos_defi_search_products 重新搜索" },
  "84010": { code: "TOKEN_NOT_SUPPORT", message: "代币不支持", fix: "请确认 tokenAddress 正确" },
  "84014": { code: "BALANCE_FAILED", message: "余额验证失败", fix: "请确认钱包余额充足" },
  "84016": { code: "CONTRACT_FAILED", message: "智能合约执行失败", fix: "请检查参数和链上状态" },
  "84019": { code: "ADDRESS_MISMATCH", message: "地址格式不匹配", fix: "请用 onchainos_wallet_validate_address 校验" },
  "84021": { code: "SYNCING", message: "资产正在同步中", fix: "请等待片刻后重试", retryAfter: 3000 },
  "84024": { code: "PRODUCT_NOT_SUPPORT", message: "投资品不支持或不存在", fix: "请用 onchainos_defi_search_products 重新搜索" },
  "84025": { code: "NO_REWARD", message: "当前无可领取的奖励", fix: "" },
  "84029": { code: "LOCKED", message: "本金仍在锁定期，无法领取", fix: "" },
  "84030": { code: "EXPIRED", message: "本金领取已过期", fix: "" },
  "84032": { code: "V3_ONLY", message: "此接口仅适用于 V3 DEX Pool 投资品", fix: "" },
  // HTTP 传输层
  "HTTP_400": { code: "BAD_REQUEST", message: "请求格式错误", fix: "请检查参数格式和必填字段" },
  "HTTP_422": { code: "BUSINESS_REJECT", message: "业务不可行", fix: "请检查余额/授权等条件" },
  "HTTP_429": { code: "RATE_LIMITED", message: "超出频率限制", fix: "请等待 1-2 秒后重试", retryAfter: 1000 },
  "HTTP_500": { code: "SYSTEM_ERROR", message: "系统错误", fix: "不建议重试" },
  "HTTP_503": { code: "UNAVAILABLE", message: "服务暂时不可用", fix: "请等待 5 秒后重试", retryAfter: 5000 },
};

// ── errMsg — 统一错误消息提取 ────────────────────────────────
/** 提取错误对象的消息文本，用于日志/steps/返回体 */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ── toResult ────────────────────────────────────────────────
export function toResult<T>(data: T, opts?: { warnings?: string[]; nextSteps?: NextStep[] }): CallToolResult {
  const body: Record<string, unknown> = { success: true, data, tsIso: new Date().toISOString() };
  if (opts?.warnings?.length) body.warnings = opts.warnings;
  if (opts?.nextSteps?.length) body.nextSteps = opts.nextSteps;
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

// ── toError ─────────────────────────────────────────────────
export function toError(e: unknown): CallToolResult {
  // 结构化错误: 用 OkxError.code 精确匹配
  if (e instanceof OkxError) {
    const entry = ERROR_MAP[e.code];
    if (entry) {
      return {
        content: [{ type: "text", text: JSON.stringify({
          success: false,
          error: { code: entry.code, message: e.message, fix: entry.fix, ...(entry.retryAfter ? { retryAfter: entry.retryAfter } : {}) },
          tsIso: new Date().toISOString(),
        }) }],
        isError: true,
      };
    }
    // 未在映射表中的业务错误码 — 透传原始信息
    return {
      content: [{ type: "text", text: JSON.stringify({
        success: false,
        error: { code: "OKX_ERROR", message: e.message, fix: `未知业务错误码 ${e.code}, 请参考 OKX API 文档` },
        tsIso: new Date().toISOString(),
      }) }],
      isError: true,
    };
  }

  // HTTP 状态码错误 (非 OkxError)
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Error && "httpStatus" in e) {
    const status = String((e as any).httpStatus);
    const entry = ERROR_MAP[`HTTP_${status}`];
    if (entry) {
      return {
        content: [{ type: "text", text: JSON.stringify({
          success: false,
          error: { code: entry.code, message: msg, fix: entry.fix, ...(entry.retryAfter ? { retryAfter: entry.retryAfter } : {}) },
          tsIso: new Date().toISOString(),
        }) }],
        isError: true,
      };
    }
  }

  // 兜底: 非预期错误
  return {
    content: [{ type: "text", text: JSON.stringify({
      success: false,
      error: { code: "ERROR", message: msg, fix: "请检查网络和 API 配置" },
      tsIso: new Date().toISOString(),
    }) }],
    isError: true,
  };
}

// ── resolveAuth ──────────────────────────────────────────────
export function resolveAuth(): Auth | null {
  const k = process.env.OKX_API_KEY, s = process.env.OKX_SECRET_KEY, p = process.env.OKX_PASSPHRASE;
  if (k && s && p) return { apiKey: k, secret: s, passphrase: p };
  // ⚠️ 不再从命令行读取密钥 — 命令行参数在 ps/proc 中全局可见, 存在泄露风险
  // 请使用环境变量: OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE
  return null;
}

// ── AUTH_REQUIRED ───────────────────────────────────────────
export function AUTH_REQUIRED(scope: "READ" | "TRADE" = "READ"): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({
      success: false,
      error: { code: "AUTH_REQUIRED", message: `需要 OKX API Key（${scope} 权限）`, fix: "请设置环境变量 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE" },
      tsIso: new Date().toISOString(),
    }) }],
    isError: true,
  };
}
