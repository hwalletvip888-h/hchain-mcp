---
name: trade
description: 完整交易流水线 — 一键买入/卖出/兑换代币
---

# /trade — 完整交易流水线

执行完整的链上交易：风控 → 行情确认 → 报价 → 授权 → 构建 → 模拟 → 等待签名 → 广播 → 追踪

## 参数
- `$1`: 卖出代币地址 (from_token)
- `$2`: 买入代币地址 (to_token)
- `$3`: 卖出数量 (人类可读，如 "100" USDT)
- `$4`: 链ID (可选，默认 '1'=ETH)

## 流水线

### 阶段 1: 并行预备 (并行)
同时启动 3 个 Agent:
- `risk-assessor` → 对 $2 进行4维风险评分
- `market-analyst` → 获取 $1 和 $2 的当前行情
- `portfolio-tracker` → 确认 $1 余额是否足够

### 阶段 2: 风控判决 (门禁)
Orchestrator 检查 risk-assessor 的评分:
- 评分 < 51 → ✅ 继续
- 评分 51-70 → ⚠️ 显示警告，请用户确认
- 评分 >= 71 → 🚫 **自动拒绝，终止流水线**

### 阶段 3: 交易构建 (串行)
`trade-executor` 依次执行:
1. `onchainos_dex_quote` → 获取报价
2. `onchainos_skill_smart_slippage` → 建议滑点
3. `onchainos_dex_approve_transaction` → 授权（如需）
4. `onchainos_skill_trade_pipeline` → 一站式构建+模拟

### 阶段 4: 人机确认
展示完整交易预览:
- 卖出/买入数量
- 预期价格/滑点
- Gas 费用估算
- 风险评分
用户回复 "确认" 继续

### 阶段 5: 广播 + 追踪
1. `onchainos_gateway_broadcast` → 广播交易
2. `onchainos_gateway_orders` → 追踪状态直到确认/失败
3. 输出最终结果

## 写作原则
请按以上 5 个阶段执行。将每个阶段的结果写入 `.claude/memory/bus.jsonl`。
