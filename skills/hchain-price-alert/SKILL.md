---
name: hchain-price-alert
description: "WS价格预警：设置价格触发条件+WS实时监控推送到stderr。Use this skill when the user says '监控价格', '盯盘', '到X价格通知我', 'price alert', 'ETH到3000提醒我', '设置价格提醒', wants real-time price monitoring, or needs price-based notifications."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-price-alert

查当前价 → 判断偏离 → 建立 WS 实时监控。

## Execution Flow

### 调 onchainos_skill_price_alert

```json
{
  "chainIndex": "1",
  "tokenContractAddress": "",
  "targetPrice": "3000",
  "condition": "above",
  "walletAddress": "0x..."
}
```

| condition | 触发 |
|-----------|------|
| `above` | 价格 ≥ 目标价时提醒 |
| `below` | 价格 ≤ 目标价时提醒 |

### 两步逻辑

**已触发**: 当前价已满足条件 → 提示可立即交易
**未触发**: 计算偏离百分比 → WS 订阅 price 频道

```
当前价 $2500，距目标 $3000 还需上涨 20%
→ WS 已订阅 price 频道
→ [WS-DATA] 实时推送 {"price":"2600",...}
```

## WS 管理

| 工具 | 用途 |
|------|------|
| `onchainos_ws_connect` | 建立连接 |
| `onchainos_ws_subscribe` | 订阅 price 频道 |
| `onchainos_ws_unsubscribe` | 取消订阅 |
| `onchainos_ws_disconnect` | 断开连接 |

## 触发后

- 条件满足 → `hchain-trade-pipeline` 执行交易
- 不需要了 → `onchainos_ws_unsubscribe` 停止监控
