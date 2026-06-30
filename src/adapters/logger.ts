/**
 * Structured JSON Logger — hchain-skills
 *
 * All logs go to stderr (stdout is reserved for MCP transport in stdio mode).
 * Format: {"ts":"ISO","level":"info|warn|error|debug","module":"name","message":"...","correlationId?":"...","data?":{...}}
 *
 * Usage:
 *   import { logger, nextCorrelationId } from "../adapters/logger.js";
 *   const cid = nextCorrelationId();
 *   logger.info("http", "request received", { method: "POST", path: "/mcp" }, cid);
 *   logger.error("api", "fetch failed", { status: 500 }, cid);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  module: string;
  message: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

let correlationIdCounter = 0;

export function nextCorrelationId(): string {
  return `hchain-${Date.now()}-${(++correlationIdCounter).toString(36)}`;
}

const MIN_LEVEL = (process.env.LOG_LEVEL || "info") as LogLevel;
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
  correlationId?: string,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const entry: LogEntry = { ts: new Date().toISOString(), level, module, message, correlationId, data };
  console.error(JSON.stringify(entry));
}

export const logger = {
  debug: (m: string, msg: string, data?: Record<string, unknown>, cid?: string) =>
    log("debug", m, msg, data, cid),
  info: (m: string, msg: string, data?: Record<string, unknown>, cid?: string) =>
    log("info", m, msg, data, cid),
  warn: (m: string, msg: string, data?: Record<string, unknown>, cid?: string) =>
    log("warn", m, msg, data, cid),
  error: (m: string, msg: string, data?: Record<string, unknown>, cid?: string) =>
    log("error", m, msg, data, cid),
};
