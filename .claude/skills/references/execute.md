# hchain 并行执行参考

## 执行模式

### 模式 1: 并行扇出 (Fan-Out)
```
Orchestrator
  ├→ Agent A ──┐
  ├→ Agent B ──┼→ Orchestrator (汇总)
  ├→ Agent C ──┘
```
使用: 多数据源查询、多代币调研、多链扫描

### 模式 2: 串行流水线 (Pipeline)
```
Agent A → Agent B → Agent C → 结果
```
使用: 交易流程、多步骤依赖操作

### 模式 3: 扇出-扇入 (Fan-Out/Fan-In)
```
Orchestrator
  ├→ Agent A (并行) ──┐
  ├→ Agent B (并行) ──┼→ Aggregator → 结果
  ├→ Agent C (并行) ──┘
```
使用: 调研报告、综合评级

### 模式 4: 循环反馈 (Writer-Critic Loop)
```
Agent A ⇄ Agent B (审查→修改→审查→修改→通过)
```
使用: 代码审查、交易策略优化

## 并发控制
- 最多同时 4 个 Agent
- 优先级: 用户等待的 > 后台的
- Haiku Agent 优先调度（快）

### 模式 5: 双链并行 + 汇合 (Dual-Chain Fan-In)
```
Orchestrator
  ├→ [源链] Gas ──┐
  ├→ [源链] Info ──┼→ Crosschain Quote ──→ Risk ──→ Submit ──→ Track
  ├→ [目标链] Gas ─┘
  └→ [目标链] Info
```
使用: crosschain-swap.yaml — 跨链兑换时双链数据并行准备

### 模式 6: 多源信号聚合 + 批量过滤 (Signal Aggregation)
```
Orchestrator
  ├→ Signal Scout (ETH)  ──┐
  ├→ Signal Scout (BSC)  ──┼→ Merge & Dedup ──→ Batch Risk Filter ──→ Tradable List
  ├→ Signal Scout (SOL)  ──┘                                              │
  └→ Smart Money Ranking ─────────────────────────────────────────────────┘
                                                                          ↓
                                                              Auto-Trade Gate → Execute
```
使用: signal-pipeline.yaml — 多链信号聚合→去重→批量风控→可交易列表

### 模式 7: 全链扫描 + 批量风险矩阵 (Portfolio Audit)
```
Orchestrator
  ├→ Balance (ETH)  ──┐
  ├→ Balance (BSC)  ──┤
  ├→ Balance (SOL)  ──┼→ Aggregate Holdings ──→ Batch Risk Scan ──→ Risk Matrix ──→ Alert Gate
  ├→ Balance (Base) ──┤       (N tokens)         (parallel 5)
  └→ Balance (Arb)  ──┘
```
使用: portfolio-audit.yaml — 全链持仓一次性审计

## 并发控制
- 最多同时 4 个 Agent
- 批量风险扫描时最多同时 5 个 token
- 优先级: 用户等待的 > 后台的
- Haiku Agent 优先调度（快）

## YAML 工作流参考

### 节点类型
| 类型 | 说明 | 示例 |
|------|------|------|
| `agent` | 标准Agent节点 | `agent: risk-assessor` |
| `gate` | 条件门禁 | `condition: "score < 71"` |
| `human` | 人机确认 | `human_in_the_loop: true` |
| `aggregate` | 多源聚合 | `action: aggregate` |

### 节点配置
```yaml
- id: step-id
  agent: agent-name
  label: 显示名称
  action: 具体动作
  params: { ... }
  parallel: true           # 是否并行
  depends_on: [step-1]     # 依赖的上游节点
  timeout: 120             # 超时秒数
  retry: 3                 # 重试次数
  retry_delay: 30          # 重试间隔秒数
  validate:                # 输出校验
    - field: field_name
      rule: "> 0"
  gate:                    # 条件门禁
    condition: "expr"
    on_fail: "REJECT"
    on_warn: "CONFIRM"
    on_pass: "CONTINUE"
  fallback:                # 降级策略
    on_fail: "retry"
    on_timeout: "partial_results"
  human_in_the_loop: true  # 人机协作
```

## 已注册的工作流
| 工作流 | 文件 | 节点数 | 用途 |
|------|------|:---:|------|
| trade-pipeline | trade-pipeline.yaml | 8 | 完整代币兑换 |
| research-pipeline | research-pipeline.yaml | 5 | 代币深度调研 |
| crosschain-swap | crosschain-swap.yaml | 7 | 跨链原子交换 |
| portfolio-audit | portfolio-audit.yaml | 5 | 全链持仓审计 |
| signal-pipeline | signal-pipeline.yaml | 5 | 信号→交易 |

## 错误处理
1. Agent 超时 (默认120s) → 重试1次
2. Agent 返回错误 → 降级到更轻量 Agent
3. 单个 token 风险扫描失败 → 标记为 "unknown"，继续
4. 全部失败 → 通知用户 + 写入 bus.jsonl
5. 人机确认超时 (300s) → 自动取消交易
