---
name: scan
description: 全链机会扫描 — 发现新币、热门币、聪明钱动向
---

# /scan — 全链机会扫描

扫描多链市场，发现潜在机会。

## 参数
- `$1`: 扫描类型 (new/hot/smart/alert) (可选，默认 all)
- `$2`: 链ID (可选，默认全部链)

## 扫描模式

### new — 新币扫描
- `market-analyst` → 调用 `onchainos_memepump_token_list` 扫新币
- `risk-assessor` → 对 Top 5 新币做快速风险过滤
- 输出: 新币列表 + 快速评级

### hot — 热门扫描
- `market-analyst` → 调用 `onchainos_token_hot` 热榜
- `social-analyst` → 对 Top 3 做社媒情绪分析
- 输出: 热榜 + 情绪分析

### smart — 聪明钱追踪
- `signal-scout` → 调用 `onchainos_skill_signal_aggregate` + `onchainos_leaderboard_list`
- 输出: 聪明钱在买什么 + 信号强度

### alert — 价格预警检查
- `signal-scout` → 调用 `onchainos_skill_price_alert` 检查已设预警
- 输出: 当前预警状态 + 触发情况

## 输出格式
Markdown 报告，包含:
- 扫描时间/链范围
- 发现列表 (按优先级排序)
- 每条发现的风险评级
- 推荐操作

## 写作原则
如果是 "all" 模式，并行执行 new + hot + smart。
