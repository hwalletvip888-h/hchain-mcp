# hchain 任务规划参考

## PRD 模板

```markdown
# PRD: [功能名称]

## 需求
[描述用户需求]

## 技术约束
- 使用的 MCP 工具: [列出]
- 链: [ETH/BSC/Solana/...]
- 金额上限: [$X]
- 滑点容忍: [X%]

## 成功标准
- [ ] 标准1
- [ ] 标准2

## 风险点
- [ ] 需人工确认的步骤
```

## Epic 分解模板

```markdown
## Epic: [名称]
- 主 Issue: #N

### Tasks
1. [任务1] (parallel: true)
2. [任务2] (parallel: true, depends_on: [1])
3. [任务3] (depends_on: [1,2])
```

## Agent 选择指南

| 任务类型 | 推荐Agent | 模型 | 预估Token |
|------|------|:---:|:---:|
| 价格查询 | market-analyst | Haiku | ~200 |
| K线分析 | market-analyst | Sonnet | ~500 |
| 风险评分 | risk-assessor | Opus | ~1000 |
| 交易构建 | trade-executor | Sonnet | ~1500 |
| 余额查询 | portfolio-tracker | Haiku | ~200 |
| 信号扫描 | signal-scout | Sonnet | ~800 |
| 社媒分析 | social-analyst | Haiku | ~500 |
| 代码审查 | code-reviewer | Opus | ~2000 |
| 测试运行 | test-engineer | Sonnet | ~500 |
