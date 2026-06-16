---
name: dispatch
description: 任务派发 — 将复杂任务分解并派发给Agent团队并行执行
---

# /dispatch — 多Agent任务派发

将复杂任务分解为子任务，派发给专业Agent团队并行执行。

## 参数
- `$1`: 任务描述 (自然语言)
- `$2`: 执行模式 (parallel/serial/auto) (可选，默认 auto)

## 派发模式

### auto — 智能派发 (默认)
Orchestrator 自动分析任务依赖关系:
- 无依赖的子任务 → 并行派发
- 有依赖的子任务 → 串行派发
- 不确定的 → 先派发一个 Agent 收集信息

### parallel — 全部并行
所有子任务同时启动，最后聚合。适合:
- 多代币同时调研
- 多链同时扫描
- 多维度独立分析

### serial — 全部串行
按顺序逐个执行。适合:
- 有严格顺序的交易流程
- 依赖前一步结果的决策链

## 使用示例

### 调研 3 个代币
```
/dispatch "调研 0xABC, 0xDEF, 0xGHI 三个代币" parallel
→ 3 个 market-analyst 同时启动
→ 3 个 risk-assessor 同时启动
→ 1 个 orchestrator 汇总
```

### 完整交易流程
```
/dispatch "用 100 USDT 买入 0xABC" serial
→ risk-assessor → market-analyst → trade-executor
```

### 智能分析
```
/dispatch "分析我的持仓，找出该减仓的币" auto
→ portfolio-tracker (获取持仓)
→ risk-assessor (并行扫描所有持仓)
→ orchestrator (汇总 + 建议)
```

## Agent 团队映射

| 任务关键词 | 派发给 |
|-----------|--------|
| 价格/行情/K线/代币信息 | market-analyst |
| 安全/风险/貔貅/审计 | risk-assessor |
| 交易/兑换/买入/卖出 | trade-executor |
| 余额/资产/持仓/历史 | portfolio-tracker |
| 信号/聪明钱/新币 | signal-scout |
| DeFi/理财/申购/赎回 | defi-strategist |
| 社媒/新闻/情绪/KOL | social-analyst |
| 代码/审查/PR/质量 | code-reviewer |
| 测试/单测/覆盖率 | test-engineer |

## 写作原则
1. 先分析任务 → 分解为子任务
2. 判断依赖关系 → 决定 parallel/serial
3. 对每个子任务 → 选择合适的 Agent + 写入 bus.jsonl
4. 启动所有 Agent（用 Agent 工具）
5. 等待结果 → 从 bus.jsonl 读取
6. 汇总输出
