---
name: workflow
description: 运行YAML工作流 — 加载 .claude/workflows/ 下的DAG定义并执行
---

# /workflow — YAML工作流引擎

加载并执行 `.claude/workflows/` 目录下的 YAML 工作流定义。

## 参数
- `$1`: 工作流名称 (对应 workflows/<name>.yaml)
- `$2`: 额外参数 (JSON格式，传递给工作流)

## 已注册的工作流

### trade-pipeline
完整的代币兑换流水线（含风控+人机确认）
```
/workflow trade-pipeline '{"from_token":"0x...","to_token":"0x...","amount":"100","chain":"1"}'
```

### research-pipeline
代币深度调研（并行行情+安全+社媒）
```
/workflow research-pipeline '{"token":"0x...","chain":"1"}'
```

## 执行引擎

### 工作流文件格式 (YAML)
```yaml
name: workflow-name
version: "1.0"
nodes:
  - id: step-1
    agent: market-analyst
    params: { ... }
    parallel: true

  - id: step-2
    agent: risk-assessor
    params: { ... }
    parallel: true
    depends_on: []

  - id: step-3
    agent: orchestrator
    action: aggregate
    depends_on: [step-1, step-2]
```

### 执行规则
1. 解析 YAML → 构建 DAG
2. 拓扑排序 → 确定执行顺序
3. `parallel: true` 的节点同时启动
4. `depends_on` 节点等待上游完成
5. 每个节点结果写入 bus.jsonl
6. 所有节点完成 → 输出最终结果

## 写作原则
请先读取指定的 YAML 文件，解析节点依赖关系，然后按拓扑排序依次（或并行）启动 Agent。每个步骤的结果写入 bus.jsonl。
