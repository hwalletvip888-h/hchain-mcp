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

// ── toResult ────────────────────────────────────────────────
export function toResult<T>(data: T, opts?: { warnings?: string[]; nextSteps?: NextStep[] }): CallToolResult {
  const body: Record<string, unknown> = { success: true, data, tsIso: new Date().toISOString() };
  if (opts?.warnings?.length) body.warnings = opts.warnings;
  if (opts?.nextSteps?.length) body.nextSteps = opts.nextSteps;
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

// ── toError ─────────────────────────────────────────────────
export function toError(e: unknown): CallToolResult {
  const msg = e instanceof Error ? e.message : String(e);
  let error: { code: string; message: string; fix: string; retryAfter?: number };

  // OKX 业务错误码 (HTTP 200, code != "0")
  if (msg.includes("OKX 50001")) {
    error = { code: "SERVICE_UNAVAILABLE", message: msg, fix: "服务暂不可用, 等待几秒后重试", retryAfter: 3000 };
  } else if (msg.includes("OKX 50011")) {
    error = { code: "RATE_LIMITED", message: msg, fix: "超出频率限制, 请降低请求频率", retryAfter: 5000 };
  } else if (msg.includes("OKX 50103") || msg.includes("OKX 50104") || msg.includes("OKX 50105") || msg.includes("OKX 50106") || msg.includes("OKX 50107") || msg.includes("OKX 50111") || msg.includes("OKX 50112") || msg.includes("OKX 50113")) {
    error = { code: "AUTH_ERROR", message: msg, fix: "API Key 签名错误, 请检查 OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE" };
  } else if (msg.includes("OKX 81001")) {
    error = { code: "BAD_PARAMETER", message: msg, fix: "参数不正确, 请检查参数名/类型/必填项" };
  } else if (msg.includes("OKX 81108")) {
    error = { code: "WALLET_TYPE_MISMATCH", message: msg, fix: "钱包类型不匹配, 请确认链和地址格式一致" };
  } else if (msg.includes("OKX 81104")) {
    error = { code: "CHAIN_NOT_SUPPORT", message: msg, fix: "该链不支持此操作, 请调用 supported_chain 确认可用链" };
  } else if (msg.includes("OKX 81152")) {
    error = { code: "COIN_NOT_EXIST", message: msg, fix: "代币不存在, 请用 onchainos_token_search 搜索正确地址" };
  } else if (msg.includes("OKX 81451")) {
    error = { code: "NODE_FAILED", message: msg, fix: "节点返回失败, 请稍后重试", retryAfter: 2000 };
  } else if (msg.includes("OKX 84001") || msg.includes("OKX 84003")) {
    error = { code: "PROTOCOL_NOT_SUPPORT", message: msg, fix: "协议不支持, 请用 onchainos_defi_supported_platforms 确认支持列表" };
  } else if (msg.includes("OKX 84007") || msg.includes("OKX 84024")) {
    error = { code: "PRODUCT_NOT_SUPPORT", message: msg, fix: "投资品不支持或不存在, 请用 onchainos_defi_search_products 重新搜索" };
  } else if (msg.includes("OKX 84010")) {
    error = { code: "TOKEN_NOT_SUPPORT", message: msg, fix: "代币不支持, 请确认 tokenAddress 正确" };
  } else if (msg.includes("OKX 84014")) {
    error = { code: "BALANCE_FAILED", message: msg, fix: "余额验证失败, 请确认钱包余额充足" };
  } else if (msg.includes("OKX 84016")) {
    error = { code: "CONTRACT_FAILED", message: msg, fix: "智能合约执行失败, 请检查参数和链上状态" };
  } else if (msg.includes("OKX 84019")) {
    error = { code: "ADDRESS_MISMATCH", message: msg, fix: "地址格式不匹配, 请用 onchainos_wallet_validate_address 校验" };
  } else if (msg.includes("OKX 84021")) {
    error = { code: "SYNCING", message: msg, fix: "资产正在同步中, 请等待片刻后重试", retryAfter: 3000 };
  } else if (msg.includes("OKX 84025")) {
    error = { code: "NO_REWARD", message: msg, fix: "当前无可领取的奖励" };
  } else if (msg.includes("OKX 84029")) {
    error = { code: "LOCKED", message: msg, fix: "本金仍在锁定期, 无法领取" };
  } else if (msg.includes("OKX 84030")) {
    error = { code: "EXPIRED", message: msg, fix: "本金领取已过期" };
  } else if (msg.includes("OKX 84032")) {
    error = { code: "V3_ONLY", message: msg, fix: "此接口仅适用于 V3 DEX Pool 投资品" };
  }
  // HTTP 传输层错误
  else if (msg.includes("429") || msg.includes("RATE")) {
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
    content: [{ type: "text", text: JSON.stringify({
      success: false,
      error: { code: "AUTH_REQUIRED", message: `需要 OKX API Key（${scope} 权限）`, fix: "请设置环境变量 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE" },
      tsIso: new Date().toISOString(),
    }) }],
    isError: true,
  };
}
