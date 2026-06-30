---
name: workflow
description: 运行YAML工作流 — 加载 .claude/workflows/ 下的DAG定义并执行
---

# /workflow — YAML工作流引擎

加载并执行 `.claude/workflows/` 目录下的 YAML 工作流定义。

## 参数
- `$1`: 工作流名称 (对应 workflows/<name>.yaml)
- `$2`: 额外参数 (JSON格式，传递给工作流)

## 已注册的工作流 (5个)

### trade-pipeline
完整的代币兑换流水线（含风控+人机确认）
```
/workflow trade-pipeline '{"from_token":"0x...","to_token":"0x...","amount":"100","chain":"1"}'
```

### research-pipeline
代币深度调研（并行行情+安全+社媒+信号）
```
/workflow research-pipeline '{"token":"0x...","chain":"1"}'
```

### crosschain-swap
跨链原子交换流水线（Intent + Direct双模式）
```
/workflow crosschain-swap '{"from":"USDC","to":"SOL","from_chain":"1","to_chain":"501","amount":"100","mode":"intent"}'
```

### portfolio-audit
持仓审计流水线（多链余额+DeFi持仓+风险矩阵）
```
/workflow portfolio-audit '{"address":"0x...","chains":"1,501,8453"}'
```

### signal-pipeline
信号筛选流水线（信号采集+批量风险过滤+排序）
```
/workflow signal-pipeline '{"chain":"501","wallet_type":"1,3"}'
```

## YAML 工作流字段 Schema

### 顶层字段
| 字段 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `name` | string | ✓ | 工作流名称 |
| `version` | string | ✓ | 语义版本号 |
| `description` | string | | 工作流描述 |
| `nodes` | array | ✓ | 节点列表 (DAG) |
| `output_template` | string | | 结果输出模板 |

### 节点字段 (nodes[])
| 字段 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `id` | string | ✓ | 唯一节点ID |
| `agent` | string | ✓ | 执行的Agent名称 |
| `params` | object | | Agent参数 |
| `parallel` | boolean | | 是否并行执行 (默认 false) |
| `depends_on` | string[] | | 依赖的上游节点ID列表 |
| `gate` | object | | 条件门禁配置 |
| `validate` | object | | 输出验证规则 |
| `fallback` | object | | 失败恢复策略 |
| `human_in_the_loop` | boolean | | 是否需要人机确认 |
| `run_on` | string | | 执行条件: `success` / `failure` / `always` |
| `retry` | number | | 失败重试次数 |
| `retry_delay` | number | | 重试间隔(ms) |
| `timeout` | number | | 节点超时(ms) |
| `output` | object | | 输出字段定义 |

### 门禁配置 (gate)
```yaml
gate:
  condition: "risk-check.total_score < 71"  # 条件表达式
  on_pass: "CONTINUE"                        # 通过后行为
  on_fail: "REJECT"                          # 失败后行为
  on_warn: "CONFIRM"                         # 警告时行为 (可选)
```

### 验证规则 (validate)
```yaml
validate:
  field: "data.count"                        # 验证字段路径
  rule: "> 0"                                # 验证规则表达式
```

### 故障恢复 (fallback)
```yaml
fallback:
  strategy: "skip"                           # skip | retry | abort
  retry_count: 3
  retry_delay_ms: 1000
```

## 执行引擎

### 执行规则
1. 解析 YAML → 构建 DAG
2. 拓扑排序 → 确定执行顺序
3. `parallel: true` 的节点同时启动
4. `depends_on` 节点等待上游完成
5. `gate` 条件门禁在节点执行前评估
6. `validate` 在节点执行后验证输出
7. 每个节点结果写入 bus.jsonl
8. 所有节点完成 → `output_template` 格式化最终结果

## 写作原则
请先读取指定的 YAML 文件，解析节点依赖关系，然后按拓扑排序依次（或并行）启动 Agent。每个步骤的结果写入 bus.jsonl。
