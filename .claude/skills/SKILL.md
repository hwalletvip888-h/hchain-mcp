---
name: hchain-skills
description: hchain Agent协作框架 — 多Agent编排 + YAML工作流 + JSONL黑board
version: "1.0"
activation:
  - "交易"
  - "买入"
  - "卖出"
  - "兑换"
  - "调研"
  - "分析"
  - "监控"
  - "扫描"
  - "审计"
  - "dispatch"
  - "workflow"
---

# 🎯 hchain Agent协作框架

## 框架架构

```
用户意图 → Orchestrator (主编排)
            ├── market-analyst    (行情)
            ├── risk-assessor     (风控)
            ├── trade-executor    (交易)
            ├── portfolio-tracker (资产)
            ├── signal-scout      (信号)
            ├── defi-strategist   (DeFi)
            ├── social-analyst    (社媒)
            ├── code-reviewer     (审查)
            └── test-engineer     (测试)
              ↓
         bus.jsonl (共享黑board)
```

## 快速开始

### 派发任务给Agent团队
```
/dispatch "调研 0xABC 代币"          # 智能派发
/dispatch "扫描全链机会" parallel     # 并行派发
/dispatch "买入 0xABC" serial        # 串行派发
```

### 运行预设工作流
```
/workflow research-pipeline '{"token":"0x...","chain":"1"}'
/workflow trade-pipeline '{"from_token":"0x...","to_token":"0x...","amount":"100","chain":"1"}'
```

### 直接使用命令
```
/research 0xABC          # 代币调研
/trade 0xA 0xB 100       # 交易
/scan new                # 扫描新币
/monitor                 # 持仓监控
/audit 0xABC             # 安全审计
```

## 10个专业Agent

| Agent | 模型 | 领域 | 核心工具 |
|-------|:---:|------|------|
| orchestrator | Opus | 编排 | Agent, Skill, TaskCreate |
| market-analyst | Sonnet | 行情 | market_*, token_* |
| risk-assessor | Opus | 风控 | skill_risk_detect, token_advanced_info |
| trade-executor | Sonnet | 交易 | dex_*, gateway_*, skill_trade_* |
| portfolio-tracker | Haiku | 资产 | balance_*, transaction_* |
| signal-scout | Sonnet | 信号 | skill_signal_*, leaderboard_* |
| defi-strategist | Sonnet | DeFi | defi_*, payment_* |
| social-analyst | Haiku | 社媒 | social_*, skill_social_* |
| code-reviewer | Opus | 审查 | Read, Grep, Bash |
| test-engineer | Sonnet | 测试 | Write, Bash, Edit |

## 7个流水线命令

| 命令 | 用途 | Agent参与数 |
|------|------|:---:|
| `/research` | 代币深度调研 | 4 |
| `/trade` | 完整交易流水线 | 3 |
| `/scan` | 全链机会扫描 | 3 |
| `/monitor` | 持仓监控 | 3 |
| `/audit` | 安全审计 | 3 |
| `/workflow` | 运行YAML工作流 | 动态 |
| `/dispatch` | 智能任务派发 | 动态 |

## 通信协议 (bus.jsonl)

所有Agent通过 `.claude/memory/bus.jsonl` 通信:
```json
{"ts":"ISO8601","agent":"agent名","task_id":"uuid","status":"started|done|failed","data":{}}
```

## 文件结构
```
.claude/
├── CLAUDE.md              # 主操作指南
├── settings.json          # MCP配置
├── agents/                # 10个Agent定义
│   ├── orchestrator.md
│   ├── market-analyst.md
│   ├── risk-assessor.md
│   ├── trade-executor.md
│   ├── portfolio-tracker.md
│   ├── signal-scout.md
│   ├── defi-strategist.md
│   ├── social-analyst.md
│   ├── code-reviewer.md
│   └── test-engineer.md
├── commands/              # 7个流水线命令
│   ├── trade.md
│   ├── research.md
│   ├── scan.md
│   ├── monitor.md
│   ├── audit.md
│   ├── workflow.md
│   └── dispatch.md
├── workflows/             # YAML工作流定义
│   ├── trade-pipeline.yaml
│   └── research-pipeline.yaml
├── skills/                # Skill入口
│   ├── SKILL.md
│   └── references/
└── memory/                # 共享黑board
    └── bus.jsonl
```
