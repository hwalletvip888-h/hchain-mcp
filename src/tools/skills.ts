/**
 * Skills 模块 — CAT:[链上-Skill]
 * API 组合技能: 将多个 API 调用编排为单步工具
 * Phase 2: 交易全链路 / 风险检测链 / 智能滑点 / 信号聚合
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  tradeApi,
  gatewayApi,
  marketApi,
  intentApi,
} from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth, NextStep } from "../adapters/shared.js";

// ── 常量 ────────────────────────────────────────────────────

/** 主链币地址集合 — 这些地址代表原生代币，无需 approve */
const NATIVE_ADDR = new Set([
  "",
  "0x0000000000000000000000000000000000000000",
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "11111111111111111111111111111111",
  "0x2::sui::SUI",
  "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
]);

function isNative(address: string): boolean {
  return NATIVE_ADDR.has(address) || NATIVE_ADDR.has(address.toLowerCase());
}

// ── 内部类型 ────────────────────────────────────────────────

interface StepResult<T = unknown> {
  step: string;
  status: "ok" | "skipped" | "error";
  data?: T;
  error?: string;
  warning?: string;
}

/** 从 swap API 返回体中提取 calldata/to/value，兼容多种返回结构 */
function extractTxFields(raw: any): {
  to: string; data: string; value: string;
  gasPrice?: string; gas?: string;
} {
  const tx = raw?.tx ?? raw;
  return {
    to: tx?.to ?? "",
    data: tx?.data ?? "",
    value: tx?.value ?? "0",
    gasPrice: tx?.gasPrice ?? tx?.maxPriorityFeePerGas,
    gas: tx?.gas,
  };
}

// ═══════════════════════════════════════════════════════════════
//  Skill 1: 交易全链路
// ═══════════════════════════════════════════════════════════════

export function registerSkillTools(server: McpServer, auth: Auth | null): void {

  // ── 1. 交易全链路 ──────────────────────────────────────

  server.tool("onchainos_skill_trade_pipeline",
    "链上-Skill | 全自动交易管线: 报价→授权→构建→模拟。📋 Agent 调用场景: 用户说'帮我买/卖 X 换成 Y'/'做个兑换'/'swap'/'交易'。一步完成报价→授权→构建→模拟, 最后返回 calldata 待用户签名后广播",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana。⚠️ 不确定先调 onchainos_dex_supported_chain 获取可用链列表"),
      fromTokenAddress: z.string().describe("卖出代币合约地址(小写)。主链币传空字符串''。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索代币"),
      toTokenAddress: z.string().describe("买入代币合约地址(小写)。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索代币"),
      amount: z.string().describe(
        "卖出数量(最小单位, 含精度 decimals)。" +
        "⚠️ 不同代币精度不同: USDT(decimals=6)'1'=1000000, SOL(decimals=9)'1'=1000000000, ETH(decimals=18)'1'=1000000000000000000。" +
        "公式: amount = 人类可读数量 × 10^decimals。不确定 decimals 先调 onchainos_token_basic_info"
      ),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().optional().default("1.0").describe("滑点百分比, 默认1.0。建议从 onchainos_skill_smart_slippage 获取"),
      gasLevel: z.enum(["slow","average","fast"]).optional().describe("Gas等级, 默认average"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async (params) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      const steps: StepResult[] = [];
      const warnings: string[] = [];
      const { chainIndex, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent } = params;

      // Step 1: Quote
      try {
        const qParams: Record<string, string> = {
          chainIndex, fromTokenAddress, toTokenAddress, amount,
          swapMode: "exactIn",
        };
        const quoteR = await tradeApi.quote(auth, qParams);
        steps.push({ step: "quote", status: "ok", data: { priceImpactPercent: (quoteR as any).priceImpactPercent, estimateGasFee: (quoteR as any).estimateGasFee } });
      } catch (e) {
        steps.push({ step: "quote", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "quote", reason: "报价失败, 无法继续" } }, { warnings });
      }

      // Step 2: Approve (仅 ERC20 需要)
      const needApprove = !isNative(fromTokenAddress);
      let approveOk = false;
      if (needApprove) {
        try {
          const approveR = await tradeApi.approveTransaction(auth, chainIndex, fromTokenAddress, amount);
          steps.push({ step: "approve", status: "ok", data: { tokenContractAddress: fromTokenAddress, approveAmount: amount } });
          approveOk = true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          steps.push({ step: "approve", status: "error", error: msg });
          warnings.push(`授权失败, 跳过授权继续: ${msg}`);
        }
      } else {
        steps.push({ step: "approve", status: "skipped", warning: "主链币无需授权" });
      }

      // Step 3: Build Swap
      let swapRaw: any;
      try {
        const sParams: Record<string, string> = {
          chainIndex, fromTokenAddress, toTokenAddress, amount,
          userWalletAddress, slippagePercent: slippagePercent ?? "1.0",
        };
        if (params.gasLevel) sParams.gasLevel = params.gasLevel;
        if (approveOk) {
          sParams.approveTransaction = "true";
          sParams.approveAmount = amount;
        }
        swapRaw = await tradeApi.swap(auth, sParams);
        const tx = extractTxFields(swapRaw);
        steps.push({ step: "swap", status: "ok", data: { to: tx.to, dataLen: tx.data?.length ?? 0, value: tx.value, gasPrice: tx.gasPrice, gas: tx.gas } });
      } catch (e) {
        steps.push({ step: "swap", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "swap", reason: "构建交易失败, 无法继续" } }, { warnings });
      }

      // Step 4: Simulate
      const swapTx = extractTxFields(swapRaw);
      try {
        const simR = await gatewayApi.simulate(auth, {
          fromAddress: userWalletAddress,
          toAddress: swapTx.to,
          chainIndex,
          txAmount: swapTx.value,
          extJson: { inputData: swapTx.data },
        });
        steps.push({ step: "simulate", status: "ok", data: simR });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push({ step: "simulate", status: "error", error: msg });
        warnings.push(`模拟执行失败: ${msg}。广播前请手动调用 onchainos_gateway_simulate 确认`);
      }

      const okCount = steps.filter(s => s.status === "ok" || s.status === "skipped").length;
      const isReady = steps.every(s => s.status !== "error" || s.step === "approve");
      const nextSteps: NextStep[] = [
        { action: "用户签名 calldata", tool: "—", condition: "用私钥/钱包对 swap 步骤返回的 data(calldata) 签名" },
      ];
      if (isReady) {
        nextSteps.push({ action: "广播签名交易", tool: "onchainos_gateway_broadcast", params: { chainIndex, address: userWalletAddress } });
        nextSteps.push({ action: "查交易状态", tool: "onchainos_gateway_orders", params: { address: userWalletAddress, chainIndex } });
      }

      return toResult({
        steps,
        calldata: { to: swapTx.to, data: swapTx.data, value: swapTx.value, gasPrice: swapTx.gasPrice, gas: swapTx.gas },
        rawResponses: { swap: swapRaw },
        summary: { status: isReady ? "ready" : "partial", totalSteps: steps.length, okSteps: okCount, failedSteps: steps.filter(s => s.status === "error").map(s => s.step) },
      }, { warnings: warnings.length ? warnings : undefined, nextSteps });
    },
  );

  // ── 2. 风险检测链 ──────────────────────────────────────

  server.tool("onchainos_skill_risk_detect",
    "链上-Skill | 综合风险检测: 安全+集中度+打包+开发者, 输出0-100评分。📋 Agent 调用场景: 用户说'这个币安全吗'/'查一下貔貅'/'有没有rug风险'/'代币风险评估'/'敢不敢买'。并行调用4个API综合打分, LOW=安全 MEDIUM=谨慎 HIGH=强烈不建议 CRITICAL=禁止交易",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串。⚠️ 不知道地址 → 先调 onchainos_token_search 获取"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => {
      if (!auth) return AUTH_REQUIRED("READ");

      // 4 个 API 并行调用，互不依赖
      const results = await Promise.allSettled([
        marketApi.tokenAdvancedInfo(auth, chainIndex, tokenContractAddress)
          .then(d => ({ step: "advanced_info", status: "ok" as const, data: d }))
          .catch(e => ({ step: "advanced_info", status: "error" as const, error: e instanceof Error ? e.message : String(e) })),
        marketApi.tokenClusterOverview(auth, chainIndex, tokenContractAddress)
          .then(d => ({ step: "cluster_overview", status: "ok" as const, data: d }))
          .catch(e => ({ step: "cluster_overview", status: "error" as const, error: e instanceof Error ? e.message : String(e) })),
        marketApi.memepumpBundleInfo(auth, chainIndex, tokenContractAddress)
          .then(d => ({ step: "bundle_info", status: "ok" as const, data: d }))
          .catch(e => ({ step: "bundle_info", status: "error" as const, error: e instanceof Error ? e.message : String(e) })),
        marketApi.memepumpTokenDevInfo(auth, chainIndex, tokenContractAddress)
          .then(d => ({ step: "dev_info", status: "ok" as const, data: d }))
          .catch(e => ({ step: "dev_info", status: "error" as const, error: e instanceof Error ? e.message : String(e) })),
      ]);

      const steps: StepResult[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") steps.push(r.value);
        else steps.push({ step: "unknown", status: "error", error: r.reason?.message ?? String(r.reason) });
      }

      // ── 风险评分 ──────────────────────────────────────
      let score = 0;
      const factors: string[] = [];

      const advInfo = steps.find(s => s.step === "advanced_info" && s.status === "ok")?.data as any;
      const clustInfo = steps.find(s => s.step === "cluster_overview" && s.status === "ok")?.data as any;
      const bundleInfo = steps.find(s => s.step === "bundle_info" && s.status === "ok")?.data as any;
      const devInfo = steps.find(s => s.step === "dev_info" && s.status === "ok")?.data as any;

      // Factor 1: HoneyPot (30 pts)
      if (advInfo?.isHoneypot) { score += 30; factors.push("检测到貔貅(HoneyPot)"); }
      if (advInfo?.isHoneyPot) { score += 30; factors.push("检测到貔貅(HoneyPot)"); }

      // Factor 2: Risk Level (20 pts)
      const riskLevel = (advInfo?.riskLevel ?? "").toUpperCase();
      if (riskLevel === "HIGH" || riskLevel === "CRITICAL") { score += 20; factors.push(`风险等级=${riskLevel}`); }
      else if (riskLevel === "MEDIUM") { score += 10; factors.push(`风险等级=${riskLevel}`); }

      // Factor 3: Tax rate (10 pts — high buy/sell tax)
      const buyTax = parseFloat(advInfo?.buyTax ?? "0");
      const sellTax = parseFloat(advInfo?.sellTax ?? "0");
      if (buyTax > 10 || sellTax > 10) { score += 10; factors.push(`高税率 buy=${buyTax}% sell=${sellTax}%`); }
      else if (buyTax > 5 || sellTax > 5) { score += 5; factors.push(`中等税率 buy=${buyTax}% sell=${sellTax}%`); }

      // Factor 4: Rug Pull % (15 pts)
      const rugPercent = parseFloat(clustInfo?.rugPullPercent ?? "0");
      if (rugPercent > 50) { score += 15; factors.push(`Rug概率>50%: ${rugPercent}%`); }
      else if (rugPercent > 25) { score += 8; factors.push(`Rug概率>25%: ${rugPercent}%`); }

      // Factor 5: Concentration (15 pts)
      const concentration = (clustInfo?.clusterConcentration ?? "").toUpperCase();
      if (concentration === "HIGH") { score += 15; factors.push("持仓高度集中"); }
      else if (concentration === "MEDIUM") { score += 7; factors.push("持仓中度集中"); }

      // Factor 6: Bundle detected (10 pts)
      const hasBundle = bundleInfo && (bundleInfo.isBundled || (Array.isArray(bundleInfo.bundles) && bundleInfo.bundles.length > 0));
      if (hasBundle) { score += 10; factors.push("检测到打包(Bundle)交易"); }

      // Factor 7: Creator/dev history (10 pts)
      const hasDevRisk = devInfo &&
        (devInfo.isRugHistory || devInfo.hasRugHistory ||
         parseFloat(devInfo.rugCount ?? "0") > 0 ||
         devInfo.isRugDev === true);
      if (hasDevRisk) { score += 10; factors.push("开发者有Rug历史"); }

      score = Math.min(score, 100);
      const level = score <= 20 ? "LOW" : score <= 50 ? "MEDIUM" : score <= 70 ? "HIGH" : "CRITICAL";

      const nextSteps: NextStep[] = [];
      if (level === "LOW" || level === "MEDIUM") {
        nextSteps.push({ action: "低/中风险, 可考虑交易", tool: "onchainos_skill_trade_pipeline", condition: "确认风险可接受后" });
      } else {
        nextSteps.push({ action: "高风险, 强烈不建议交易", tool: "—", condition: "风险评分过高, 建议放弃" });
        nextSteps.push({ action: "如仍需交易, 手动调小金额并设高滑点", tool: "onchainos_dex_swap", condition: "了解风险后自行决定" });
      }

      return toResult({
        steps,
        riskScore: { total: score, level, factors },
        summary: {
          status: level === "LOW" ? "safe" : level === "MEDIUM" ? "caution" : "danger",
          recommendation: level === "LOW" ? "风险可控" : level === "MEDIUM" ? "谨慎操作" : level === "HIGH" ? "强烈不建议" : "禁止交易",
        },
      }, { nextSteps });
    },
  );

  // ── 3. 智能滑点推荐 ────────────────────────────────────

  server.tool("onchainos_skill_smart_slippage",
    "链上-Skill | 基于波动率和价格影响智能推荐滑点。📋 Agent 调用场景: 用户说'滑点设多少合适'/'帮我推荐滑点'/'建议滑点'。基于历史K线波动率(CV)+当前报价价格影响, 返回推荐/保守/激进三档滑点值",
    {
      chainIndex: z.string().describe("链ID(字符串)。如 '1'=ETH '501'=Solana。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      fromTokenAddress: z.string().describe("卖出代币合约地址(小写)。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索。主链币传 ''"),
      toTokenAddress: z.string().describe("买入代币合约地址(小写)。主链币传 ''。⚠️ 不知道地址 → 先调 onchainos_token_search 搜索"),
      amount: z.string().optional().describe(
        "交易数量(最小单位, 含精度 decimals)。" +
        "填了会调 quote 评估价格影响, 不填仅用波动率估算。" +
        "⚠️ 精度说明: USDT(decimals=6)'1'=1000000, SOL(decimals=9)'1'=1000000000。公式: amount = 人类可读数量 × 10^decimals"
      ),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, fromTokenAddress, toTokenAddress, amount }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      const steps: StepResult[] = [];
      const warnings: string[] = [];

      // Step 1: 查报价获取价格影响
      let priceImpact = 0;
      if (amount) {
        try {
          const qParams: Record<string, string> = { chainIndex, fromTokenAddress, toTokenAddress, amount, swapMode: "exactIn" };
          const quoteR = await tradeApi.quote(auth, qParams);
          priceImpact = Math.abs(parseFloat((quoteR as any).priceImpactPercent ?? "0"));
          steps.push({ step: "quote_impact", status: "ok", data: { priceImpactPercent: priceImpact } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          steps.push({ step: "quote_impact", status: "error", error: msg });
          warnings.push(`报价查询失败, 跳过价格影响评估: ${msg}`);
        }
      } else {
        steps.push({ step: "quote_impact", status: "skipped", warning: "未提供 amount, 跳过价格影响评估" });
      }

      // Step 2: 查 K 线计算波动率
      let volatility = 0.5; // 默认中等波动
      try {
        const candleR = await marketApi.candles(auth, {
          chainIndex, tokenContractAddress: fromTokenAddress,
          bar: "1H", limit: "100",
        });
        const candles = Array.isArray(candleR) ? candleR : [];
        if (candles.length >= 2) {
          const closes = candles.map((c: any) => parseFloat(Array.isArray(c) ? c[4] : (c.close ?? c.c ?? "0"))).filter((v: number) => !isNaN(v) && v > 0);
          if (closes.length >= 2) {
            const mean = closes.reduce((a: number, b: number) => a + b, 0) / closes.length;
            const variance = closes.reduce((s: number, c: number) => s + Math.pow(c - mean, 2), 0) / closes.length;
            volatility = Math.sqrt(variance) / mean; // CV (coefficient of variation)
          }
        }
        steps.push({ step: "volatility", status: "ok", data: { coefficientOfVariation: +volatility.toFixed(4), candleCount: candles.length } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push({ step: "volatility", status: "error", error: msg });
        warnings.push(`K线查询失败, 使用默认波动率 0.5: ${msg}`);
      }

      // Step 3: 计算推荐滑点
      let baseSlippage = 3.0;
      const vtiers: Array<[number, number]> = [[0.01, 0.3], [0.03, 0.5], [0.08, 1.0], [0.15, 2.0]];
      for (const [maxV, slip] of vtiers) {
        if (volatility <= maxV) { baseSlippage = slip; break; }
      }

      let impactAdjust = 0;
      if (priceImpact > 10) impactAdjust = 2.0;
      else if (priceImpact > 5) impactAdjust = 1.0;
      else if (priceImpact > 1) impactAdjust = 0.5;

      const recommended = Math.min(Math.max(baseSlippage + impactAdjust, 0.1), 15.0);
      const conservative = Math.max(recommended * 0.5, 0.1);
      const aggressive = Math.min(recommended * 2, 15.0);

      return toResult({
        steps,
        recommendation: {
          recommendedSlippagePercent: recommended.toFixed(1),
          reason: [
            `波动率 CV=${(volatility * 100).toFixed(1)}% → 基础滑点 ${baseSlippage}%`,
            impactAdjust > 0 ? `价格影响 ${priceImpact.toFixed(1)}% → 额外 +${impactAdjust}%` : "",
          ].filter(Boolean).join("; "),
          factorsConsidered: {
            volatilityPercent: +(volatility * 100).toFixed(2),
            priceImpactPercent: priceImpact,
            baseSlippagePercent: baseSlippage,
            impactAdjustmentPercent: impactAdjust,
          },
          range: {
            conservativePercent: conservative.toFixed(1),
            recommendedPercent: recommended.toFixed(1),
            aggressivePercent: aggressive.toFixed(1),
          },
        },
      }, {
        warnings: warnings.length ? warnings : undefined,
        nextSteps: [
          { action: "用推荐滑点构建交易", tool: "onchainos_skill_trade_pipeline", params: { chainIndex, fromTokenAddress, toTokenAddress, slippagePercent: recommended.toFixed(1) } },
          { action: "或手动构建", tool: "onchainos_dex_swap", params: { chainIndex, fromTokenAddress, toTokenAddress, slippagePercent: recommended.toFixed(1) } },
        ],
      });
    },
  );

  // ── 4. 信号聚合 ────────────────────────────────────────

  server.tool("onchainos_skill_signal_aggregate",
    "链上-Skill | 信号聚合: 获取买入信号+风险过滤+安全评级。📋 Agent 调用场景: 用户说'聪明钱在买什么'/'有什么信号'/'跟单信号'/'看看KOL买了什么'。自动拉取信号→批量查风险→过滤高风险代币→返回安全信号列表",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana。⚠️ 不确定先调 onchainos_signal_supported_chain 获取可用链"),
      walletType: z.string().optional().describe("钱包类型: '1'=聪明钱 '2'=KOL '3'=鲸鱼, 逗号分隔。不传不过滤"),
      minAmountUsd: z.string().optional().describe("最小交易金额(USD)。如 '1000'=只返回>$1000的信号"),
      maxAmountUsd: z.string().optional().describe("最大交易金额(USD)"),
      limit: z.string().optional().default("10").describe("返回信号条数, 默认10, 最大20"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, walletType, minAmountUsd, maxAmountUsd, limit }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      const steps: StepResult[] = [];
      const limitNum = Math.min(parseInt(limit ?? "10", 10) || 10, 20);

      // Step 1: 获取原始信号
      let signals: any[] = [];
      try {
        const body: Record<string, unknown> = { chainIndex };
        if (walletType) body.walletType = walletType;
        if (minAmountUsd) body.minAmountUsd = minAmountUsd;
        if (maxAmountUsd) body.maxAmountUsd = maxAmountUsd;
        body.limit = Math.min(limitNum * 3, 60);

        const raw = await marketApi.signalList(auth, body);
        signals = (Array.isArray(raw) ? raw : (raw as any)?.dataList ?? (raw as any)?.signals ?? []) as any[];
        steps.push({ step: "signal_list", status: "ok", data: { totalSignals: signals.length } });
      } catch (e) {
        steps.push({ step: "signal_list", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, signals: [], summary: { status: "failed", reason: "信号获取失败" } });
      }

      if (signals.length === 0) {
        return toResult({ steps, signals: [], summary: { status: "empty", message: "当前无匹配信号" } });
      }

      // Step 2: 去重 token 地址
      const tokenMap = new Map<string, { chainIndex: string; tokenContractAddress: string }>();
      for (const sig of signals) {
        const ci = sig.chainIndex ?? chainIndex;
        const addr = sig.tokenContractAddress ?? sig.tokenAddress;
        if (!addr) continue;
        const key = `${ci}:${addr}`;
        if (!tokenMap.has(key)) tokenMap.set(key, { chainIndex: String(ci), tokenContractAddress: String(addr) });
      }
      const tokensToCheck = Array.from(tokenMap.values()).slice(0, limitNum);

      // Step 3: 批量查风险 (并发 5)
      type RiskCache = Record<string, any>;
      const riskCache: RiskCache = {};
      const chunkSize = 5;
      for (let i = 0; i < tokensToCheck.length; i += chunkSize) {
        const chunk = tokensToCheck.slice(i, i + chunkSize);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (t) => {
            const info = await marketApi.tokenAdvancedInfo(auth, t.chainIndex, t.tokenContractAddress);
            const key = `${t.chainIndex}:${t.tokenContractAddress}`;
            return { key, info };
          }),
        );
        for (const r of chunkResults) {
          if (r.status === "fulfilled") {
            riskCache[r.value.key] = r.value.info;
          }
        }
      }
      steps.push({ step: "risk_filter", status: "ok", data: { tokensChecked: tokensToCheck.length, riskDataAvailable: Object.keys(riskCache).length } });

      // Step 4: 过滤 + 排序
      const enriched = signals
        .map(sig => {
          const ci = sig.chainIndex ?? chainIndex;
          const addr = sig.tokenContractAddress ?? sig.tokenAddress ?? "";
          const key = `${ci}:${addr}`;
          const risk = riskCache[key];
          if (risk) {
            const isHoney = risk.isHoneypot || risk.isHoneyPot;
            const rl = (risk.riskLevel ?? "").toUpperCase();
            if (isHoney || rl === "HIGH" || rl === "CRITICAL") return null;
          }
          return {
            chainIndex: String(ci),
            tokenContractAddress: String(addr),
            tokenSymbol: sig.tokenSymbol ?? sig.symbol,
            walletAddress: sig.walletAddress ?? sig.address,
            walletType: sig.walletType ?? walletType,
            amountUsd: sig.amountUsd ?? sig.amountUSD,
            timestamp: sig.timestamp ?? sig.ts,
            riskContext: risk
              ? { riskLevel: risk.riskLevel, isHoneypot: risk.isHoneypot || risk.isHoneyPot, buyTax: risk.buyTax, sellTax: risk.sellTax }
              : { warning: "风险数据未获取" },
          };
        })
        .filter(Boolean)
        .slice(0, limitNum);

      return toResult({
        steps,
        signals: enriched,
        summary: {
          status: enriched.length > 0 ? "ready" : "filtered_empty",
          totalRaw: signals.length,
          afterFilter: enriched.length,
          riskFiltered: signals.length - enriched.length,
        },
      }, {
        nextSteps: enriched.length > 0
          ? [{ action: "深入分析特定代币", tool: "onchainos_skill_risk_detect", params: { chainIndex: enriched[0]?.chainIndex, tokenContractAddress: "{{选中代币地址}}" } }]
          : [{ action: "无安全信号, 放宽条件或检查其他链", tool: "onchainos_signal_list" }],
      });
    },
  );

  // ── 5. 市场全景速览 ───────────────────────────────────

  server.tool("onchainos_skill_market_overview",
    "链上-Skill | 市场全景速览: 价格+K线+情绪+安全, 一站式快速了解代币。📋 Agent 调用场景: 用户说'看看这个币怎么样'/'了解这个代币'/'全面分析'/'查一下行情+K线+安全'",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana。⚠️ 不确定先调 onchainos_market_supported_chain"),
      tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串"),
      tokenSymbol: z.string().optional().describe("代币符号(如 'ETH' 'SOL'), 用于查情绪和新闻。不传则跳过社媒分析"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, tokenSymbol }) => {
      if (!auth) return AUTH_REQUIRED("READ");
      const steps: StepResult[] = [];
      const warnings: string[] = [];

      // Step 1: 价格
      try {
        const price = await marketApi.price(auth, [{ chainIndex, tokenContractAddress }]);
        steps.push({ step: "price", status: "ok", data: price });
      } catch (e) {
        steps.push({ step: "price", status: "error", error: e instanceof Error ? e.message : String(e) });
        warnings.push("价格查询失败");
      }

      // Step 2: K线(24h 1H bars)
      try {
        const candles = await marketApi.candles(auth, { chainIndex, tokenContractAddress, bar: "1H", limit: "24" });
        steps.push({ step: "candles_24h", status: "ok", data: { barCount: Array.isArray(candles) ? candles.length : 0 } });
      } catch (e) {
        steps.push({ step: "candles_24h", status: "error", error: e instanceof Error ? e.message : String(e) });
      }

      // Step 3: 安全分析
      try {
        const security = await marketApi.tokenAdvancedInfo(auth, chainIndex, tokenContractAddress);
        steps.push({ step: "security", status: "ok", data: { riskLevel: (security as any)?.riskLevel, isHoneypot: (security as any)?.isHoneypot } });
      } catch (e) {
        steps.push({ step: "security", status: "error", error: e instanceof Error ? e.message : String(e) });
      }

      // Step 4: 社媒情绪(有 symbol 时)
      if (tokenSymbol) {
        try {
          const sentiment = await marketApi.socialSentimentSymbol(auth, { tokenSymbols: tokenSymbol.toUpperCase(), timeFrame: "3" });
          steps.push({ step: "sentiment", status: "ok", data: sentiment });
        } catch (e) {
          steps.push({ step: "sentiment", status: "error", error: e instanceof Error ? e.message : String(e) });
        }
      } else {
        steps.push({ step: "sentiment", status: "skipped", warning: "未提供 tokenSymbol, 跳过社媒情绪" });
      }

      const okCount = steps.filter(s => s.status === "ok" || s.status === "skipped").length;
      return toResult({
        steps,
        summary: { totalDimensions: steps.length, available: okCount, failed: steps.length - okCount },
      }, {
        warnings: warnings.length ? warnings : undefined,
        nextSteps: [
          { action: "详细风险评估", tool: "onchainos_skill_risk_detect", params: { chainIndex, tokenContractAddress } },
          { action: "如需交易", tool: "onchainos_skill_trade_pipeline" },
        ],
      });
    },
  );

  // ── 6. 跨链原子交换 ─────────────────────────────────────

  server.tool("onchainos_skill_crosschain_swap",
    "链上-Skill | 跨链原子交换: 源链→目标链一站式兑换。📋 Agent 调用场景: 用户说'把ETH主网的USDT跨到Solana换SOL'/'跨链兑换'/'跨链swap'/'把A链的X换成B链的Y'。支持 intent(拍卖结算,推荐)和 direct(聚合器路由)两种模式, 自动检测跨链路由, 返回签名数据+追踪指引",
    {
      fromChain: z.string().describe("源链ID(字符串)。如 '1'=ETH '501'=Solana '56'=BSC '8453'=Base '42161'=Arbitrum。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      toChain: z.string().describe("目标链ID(字符串)。与 fromChain 不同时为跨链兑换。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      fromTokenAddress: z.string().describe("卖出代币合约地址(小写)，在源链上。主链币传空字符串''。⚠️ 不知道地址→先调 onchainos_token_search"),
      toTokenAddress: z.string().describe("买入代币合约地址(小写)，在目标链上。主链币传''。⚠️ 不知道地址→先调 onchainos_token_search 在目标链搜索"),
      amount: z.string().describe(
        "卖出数量(最小单位, 含精度 decimals)。" +
        "⚠️ 不同代币精度不同: USDT(decimals=6) '1'=1000000, SOL(decimals=9) '1'=1000000000, ETH(decimals=18) '1'=1000000000000000000。" +
        "公式: amount = 人类可读数量 × 10^decimals。不确定 decimals 先调 onchainos_token_basic_info"
      ),
      userWalletAddress: z.string().describe("用户钱包地址(源链上的地址)"),
      slippagePercent: z.string().optional().default("1.0").describe("滑点百分比, 默认1.0。建议从 onchainos_skill_smart_slippage 获取"),
      mode: z.enum(["intent", "direct"]).optional().default("intent").describe("intent=拍卖竞价(推荐, 零Gas前置, 原子性跨链结算); direct=聚合器路由(需用户签名+广播交易)"),
      toWalletAddress: z.string().optional().describe("目标链收款地址。不传默认=userWalletAddress(需在目标链上存在)"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async (params) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      const steps: StepResult[] = [];
      const warnings: string[] = [];
      const { fromChain, toChain, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent = "1.0", mode = "intent", toWalletAddress } = params;
      const isCrossChain = fromChain !== toChain;

      // ── Step 1: 报价 ─────────────────────────────────────
      let quoteRaw: any;
      try {
        const qParams: Record<string, string> = {
          fromChain, toChain,
          fromTokenAddress, toTokenAddress, amount,
          swapMode: "exactIn",
          userWalletAddress,
          slippagePercent,
        };
        const useIntent = mode === "intent";
        quoteRaw = useIntent
          ? await intentApi.quote(auth, qParams)
          : await tradeApi.quote(auth, qParams);

        const priceImpact = (quoteRaw as any)?.priceImpactPercent ?? "N/A";
        const estGas = (quoteRaw as any)?.estimateGasFee ?? "N/A";
        const routeInfo = (quoteRaw as any)?.routeInfo ?? (quoteRaw as any)?.route ?? [];
        steps.push({
          step: "quote",
          status: "ok",
          data: {
            mode, fromChain, toChain,
            priceImpactPercent: priceImpact,
            estimateGasFee: estGas,
            routeSteps: Array.isArray(routeInfo) ? routeInfo.length : 1,
            isCrossChain,
          },
        });
      } catch (e) {
        steps.push({ step: "quote", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "quote", reason: "报价失败, 请确认参数或链/代币是否支持跨链路由" } }, { warnings });
      }

      // ── Step 2: 构建执行数据 ─────────────────────────────
      if (mode === "intent") {
        // Intent 模式: 返回 signData, 用户签名后提交 intent order
        const signData = (quoteRaw as any)?.signData;
        if (!signData) {
          steps.push({ step: "build", status: "error", error: "quote 未返回 signData, intent 报价可能不支持此跨链路由" });
          return toResult({ steps, summary: { status: "failed", failedAt: "build", reason: "Intent 报价未包含签名数据, 建议改用 mode=direct" } });
        }
        steps.push({ step: "build", status: "ok", data: { needEip712Signature: true, signDataFields: Object.keys(signData?.message ?? {}) } });

        return toResult({
          steps,
          crossChainInfo: { mode: "intent", fromChain, toChain, isCrossChain },
          signData: {
            ...signData,
            _hint: "请用户用私钥对以上 signData 进行 EIP-712 签名, 得到 signature 后调用 onchainos_intent_create_order 提交订单",
          },
          routeInfo: (quoteRaw as any)?.routeInfo ?? (quoteRaw as any)?.route,
          summary: {
            status: "awaiting_signature",
            message: "报价成功, 请用户签名后提交意图订单",
            availableActions: [
              { action: "用户对 signData 做 EIP-712 签名(离链)", tool: "—" },
              { action: "提交签名订单", tool: "onchainos_intent_create_order" },
              { action: "追踪订单状态", tool: "onchainos_intent_order_status" },
              { action: "查看拍卖进度", tool: "onchainos_intent_auction_info" },
            ],
          },
        });
      }

      // Direct 模式: 构建 swap calldata
      let swapRaw: any;
      try {
        const sParams: Record<string, string> = {
          fromChain, toChain,
          fromTokenAddress, toTokenAddress, amount,
          userWalletAddress,
          slippagePercent,
          swapMode: "exactIn",
        };
        if (toWalletAddress) sParams.swapReceiverAddress = toWalletAddress;
        const needApprove = !isNative(fromTokenAddress);
        if (needApprove) {
          sParams.approveTransaction = "true";
          sParams.approveAmount = amount;
        }
        swapRaw = await tradeApi.swap(auth, sParams);
        const tx = extractTxFields(swapRaw);
        steps.push({
          step: "build",
          status: "ok",
          data: {
            to: tx.to,
            dataLen: tx.data?.length ?? 0,
            value: tx.value,
            gasPrice: tx.gasPrice,
            gas: tx.gas,
            hasSignatureData: !!((swapRaw as any)?.signatureData),
          },
        });
      } catch (e) {
        steps.push({ step: "build", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "build", reason: "构建跨链交易失败" } }, { warnings });
      }

      // ── Step 3: 模拟(可选) ──────────────────────────────
      const swapTx = extractTxFields(swapRaw);
      try {
        await gatewayApi.simulate(auth, {
          fromAddress: userWalletAddress,
          toAddress: swapTx.to,
          chainIndex: fromChain,
          txAmount: swapTx.value,
          extJson: { inputData: swapTx.data },
        });
        steps.push({ step: "simulate", status: "ok", data: { success: true } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push({ step: "simulate", status: "error", error: msg });
        warnings.push(`模拟执行失败: ${msg}。跨链交易可能包含桥接逻辑, 部分链不支持模拟`);
      }

      const nextSteps: NextStep[] = [
        { action: "如有 signatureData(授权calldata), 先执行授权", tool: "onchainos_gateway_broadcast", condition: "swapRaw.signatureData 存在时" },
        { action: "用户签名 calldata", tool: "—", condition: "用私钥/钱包对 swap 步骤返回的 data 签名" },
        { action: "广播签名交易(源链)", tool: "onchainos_gateway_broadcast", params: { chainIndex: fromChain, address: userWalletAddress } },
        { action: "追踪跨链结算状态", tool: "onchainos_gateway_orders", params: { chainIndex: fromChain } },
      ];
      if (isCrossChain) {
        nextSteps.push({ action: "跨链确认: 源链交易确认后, 在目标链查收", tool: "onchainos_transaction_history", params: { chains: toChain } });
      }

      return toResult({
        steps,
        crossChainInfo: { mode: "direct", fromChain, toChain, isCrossChain },
        calldata: { to: swapTx.to, data: swapTx.data, value: swapTx.value, gasPrice: swapTx.gasPrice, gas: swapTx.gas },
        routeInfo: (swapRaw as any)?.routeInfo ?? (swapRaw as any)?.route,
        signatureData: (swapRaw as any)?.signatureData,
        summary: {
          status: "ready",
          message: isCrossChain
            ? `跨链交易已构建: 在 ${fromChain} 广播后, 资产将到达 ${toChain}`
            : `同链交易已构建: 在 ${fromChain} 广播即可`,
        },
      }, { warnings: warnings.length ? warnings : undefined, nextSteps });
    },
  );

  // ── 7. 条件订单: 限价/止损 ─────────────────────────────

  server.tool("onchainos_skill_conditional_order",
    "链上-Skill | 条件订单: 限价买入/卖出 + 止损卖出。📋 Agent 调用场景: 用户说'当ETH到2000的时候帮我买入'/'帮我设置一个止损'/'帮我挂一个限价单'/'到X价格帮我买/卖'。先查当前价对比触发条件, 已满足则立即执行; 未满足则返回价格偏离度 + WS实时监控指引",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '501'=Solana '8453'=Base。⚠️ 不确定先调 onchainos_dex_supported_chain"),
      fromTokenAddress: z.string().describe("卖出代币合约地址(小写)。⚠️ 不知道地址→先调 onchainos_token_search 搜索。主链币传空字符串"),
      toTokenAddress: z.string().describe("买入代币合约地址(小写)。⚠️ 不知道地址→先调 onchainos_token_search 搜索。主链币传空字符串"),
      amount: z.string().describe(
        "卖出数量(最小单位, 含精度 decimals)。" +
        "⚠️ 不同代币精度不同: USDT(decimals=6) '1'=1000000, ETH(decimals=18) '1'=1000000000000000000。" +
        "公式: amount = 人类可读数量 × 10^decimals。不确定 decimals 先调 onchainos_token_basic_info"
      ),
      triggerPrice: z.string().describe("触发价格(USD, 人类可读)。如 '0.5'=0.5USD。系统会自动对比当前价格判断是否触发"),
      orderType: z.enum(["limit_buy", "limit_sell", "stop_loss"]).describe(
        "订单类型: limit_buy=低于此价买入(当前价≤触发价时执行); " +
        "limit_sell=高于此价卖出(当前价≥触发价时执行); " +
        "stop_loss=跌破止损卖出(当前价≤触发价时执行)"
      ),
      userWalletAddress: z.string().describe("用户钱包地址"),
      slippagePercent: z.string().optional().default("1.0").describe("滑点百分比, 默认1.0。建议从 onchainos_skill_smart_slippage 获取"),
    },
    { readOnlyHint: false, idempotentHint: false, destructiveHint: true },
    async (params) => {
      if (!auth) return AUTH_REQUIRED("TRADE");
      const steps: StepResult[] = [];
      const warnings: string[] = [];
      const { chainIndex, fromTokenAddress, toTokenAddress, amount, triggerPrice, orderType, userWalletAddress, slippagePercent = "1.0" } = params;
      const targetPrice = parseFloat(triggerPrice);
      if (isNaN(targetPrice) || targetPrice <= 0) return toError(new Error("triggerPrice 必须是大于0的数字"));

      // ── Step 1: 获取当前价格 ─────────────────────────────
      let currentPrice = 0;
      try {
        const priceRaw = await marketApi.price(auth, [{ chainIndex, tokenContractAddress: fromTokenAddress }]);
        const priceList = Array.isArray(priceRaw) ? priceRaw : [priceRaw];
        const first = priceList[0] as any;
        currentPrice = parseFloat(first?.usdPrice ?? first?.price ?? first?.usd ?? "0");
        if (!currentPrice || currentPrice <= 0) {
          // fallback: 试试 toToken 的价格
          const priceRaw2 = await marketApi.price(auth, [{ chainIndex, tokenContractAddress: toTokenAddress }]);
          const p2 = Array.isArray(priceRaw2) ? priceRaw2[0] : priceRaw2;
          currentPrice = parseFloat((p2 as any)?.usdPrice ?? (p2 as any)?.price ?? "0");
        }
        steps.push({ step: "current_price", status: "ok", data: { usdPrice: currentPrice, triggerPrice: targetPrice } });
      } catch (e) {
        steps.push({ step: "current_price", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "price_check", reason: "价格查询失败, 无法判断触发条件" } });
      }

      // ── Step 2: 判断触发条件 ─────────────────────────────
      const deviations: string[] = [];
      let triggered = false;
      const deviationPercent = ((currentPrice - targetPrice) / targetPrice) * 100;

      if (orderType === "limit_buy") {
        triggered = currentPrice <= targetPrice;
        if (!triggered) deviations.push(`当前价 $${currentPrice} 比目标价 $${targetPrice} 高 ${deviationPercent.toFixed(2)}%, 尚未到买入区`);
        else deviations.push(`✓ 当前价 $${currentPrice} 已 ≤ 目标价 $${targetPrice}, 触发买入`);
      } else if (orderType === "limit_sell") {
        triggered = currentPrice >= targetPrice;
        if (!triggered) deviations.push(`当前价 $${currentPrice} 比目标价 $${targetPrice} 低 ${Math.abs(deviationPercent).toFixed(2)}%, 尚未到卖出区`);
        else deviations.push(`✓ 当前价 $${currentPrice} 已 ≥ 目标价 $${targetPrice}, 触发卖出`);
      } else if (orderType === "stop_loss") {
        triggered = currentPrice <= targetPrice;
        if (!triggered) deviations.push(`当前价 $${currentPrice} 比止损价 $${targetPrice} 高 ${deviationPercent.toFixed(2)}%, 未触发止损`);
        else deviations.push(`⚠ 当前价 $${currentPrice} 已 ≤ 止损价 $${targetPrice}, 触发止损卖出`);
      }

      steps.push({
        step: "condition_check",
        status: triggered ? ("ok" as const) : ("skipped" as const),
        data: { orderType, currentPrice, targetPrice, deviationPercent: +deviationPercent.toFixed(2), triggered },
      });

      // ── 不触发 → 返回监控指引 ──────────────────────────
      if (!triggered) {
        return toResult({
          steps,
          orderInfo: {
            orderType, currentPrice, targetPrice,
            deviationPercent: +deviationPercent.toFixed(2),
            status: "pending",
            message: `尚未触发, 偏离 ${Math.abs(deviationPercent).toFixed(2)}%`,
          },
          summary: {
            status: "pending",
            message: deviations[0],
            monitoringOptions: [
              { method: "WS 实时监控(推荐)", detail: `订阅 price 频道实时监控 ${fromTokenAddress} 的价格变动` },
              { method: "轮询检查", detail: "定期调用 onchainos_market_price 查询最新价" },
            ],
          },
        }, {
          nextSteps: [
            { action: "订阅WS价格频道实时监控", tool: "onchainos_ws_subscribe", params: { channel: "price", chainIndex, tokenContractAddress: fromTokenAddress } },
            { action: "或手动查价判断", tool: "onchainos_market_price" },
          ],
        });
      }

      // ── Step 3: 条件触发 → 执行交易 ────────────────────
      // 先报价
      try {
        const qParams: Record<string, string> = {
          chainIndex, fromTokenAddress, toTokenAddress, amount,
          swapMode: "exactIn",
        };
        const quoteR = await tradeApi.quote(auth, qParams);
        steps.push({ step: "quote", status: "ok", data: { priceImpactPercent: (quoteR as any)?.priceImpactPercent } });
      } catch (e) {
        steps.push({ step: "quote", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "quote", reason: "报价失败, 无法执行条件单" } }, { warnings });
      }

      // Approve (if needed)
      const needApprove = !isNative(fromTokenAddress);
      if (needApprove) {
        try {
          await tradeApi.approveTransaction(auth, chainIndex, fromTokenAddress, amount);
          steps.push({ step: "approve", status: "ok", data: { tokenContractAddress: fromTokenAddress } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          steps.push({ step: "approve", status: "error", error: msg });
          warnings.push(`授权失败, 跳过继续: ${msg}`);
        }
      } else {
        steps.push({ step: "approve", status: "skipped", warning: "主链币无需授权" });
      }

      // Build swap
      let swapRaw: any;
      try {
        const sParams: Record<string, string> = {
          chainIndex, fromTokenAddress, toTokenAddress, amount,
          userWalletAddress, slippagePercent,
        };
        if (needApprove) {
          sParams.approveTransaction = "true";
          sParams.approveAmount = amount;
        }
        swapRaw = await tradeApi.swap(auth, sParams);
        const tx = extractTxFields(swapRaw);
        steps.push({ step: "swap", status: "ok", data: { to: tx.to, dataLen: tx.data?.length ?? 0, value: tx.value } });
      } catch (e) {
        steps.push({ step: "swap", status: "error", error: e instanceof Error ? e.message : String(e) });
        return toResult({ steps, summary: { status: "failed", failedAt: "swap", reason: "构建交易失败" } }, { warnings });
      }

      // Simulate
      const swapTx = extractTxFields(swapRaw);
      try {
        await gatewayApi.simulate(auth, {
          fromAddress: userWalletAddress,
          toAddress: swapTx.to,
          chainIndex,
          txAmount: swapTx.value,
          extJson: { inputData: swapTx.data },
        });
        steps.push({ step: "simulate", status: "ok", data: { success: true } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push({ step: "simulate", status: "error", error: msg });
        warnings.push(`模拟执行失败: ${msg}`);
      }

      return toResult({
        steps,
        orderInfo: {
          orderType,
          triggerPrice: targetPrice,
          executedAtPrice: currentPrice,
          status: "triggered",
        },
        calldata: { to: swapTx.to, data: swapTx.data, value: swapTx.value, gasPrice: swapTx.gasPrice, gas: swapTx.gas },
        signatureData: (swapRaw as any)?.signatureData,
        summary: {
          status: "triggered",
          message: `条件已触发! 当前价 $${currentPrice} 满足 ${orderType} 条件, 交易已构建`,
        },
      }, {
        warnings: warnings.length ? warnings : undefined,
        nextSteps: [
          { action: "如有 signatureData 先执行授权", tool: "onchainos_gateway_broadcast", condition: "swapRaw.signatureData 存在时" },
          { action: "签名后广播交易", tool: "onchainos_gateway_broadcast", params: { chainIndex, address: userWalletAddress } },
          { action: "查交易状态", tool: "onchainos_gateway_orders", params: { chainIndex } },
        ],
      });
    },
  );

}
