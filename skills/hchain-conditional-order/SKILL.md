---
name: hchain-conditional-order
description: "条件订单：限价买入+限价卖出+止损卖出，当前价满足条件自动触发交易管线。Use this skill when the user says '当ETH到2000时买入', '设置止损', '挂限价单', '到X价格帮我买/卖', '跌到多少就卖', wants to place limit/stop orders, or set price-conditional trades."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-conditional-order

限价买入/卖出 + 止损卖出。当前价触发 → 自动执行交易管线。

## Order Types

| 类型 | 触发条件 | 场景 |
|------|----------|------|
| limit_buy | 当前价 ≤ 目标价 | 逢低买入 |
| limit_sell | 当前价 ≥ 目标价 | 止盈卖出 |
| stop_loss | 当前价 ≤ 止损价 | 跌破止损 |

## Execution Flow

### 调 onchainos_skill_conditional_order

```json
{
  "chainIndex": "1",
  "fromTokenAddress": "0x...",
  "toTokenAddress": "0x...",
  "amount": "1000000000000000000",
  "triggerPrice": "2000",
  "orderType": "limit_buy",
  "userWalletAddress": "0x...",
  "slippagePercent": "1.0"
}
```

### 返回两种情况

**未触发 (pending)**:
```
当前价 $2100 > 目标价 $2000，还需下跌 4.76%
→ 建议用 onchainos_ws_subscribe 订阅 price 频道实时监控
```

**已触发 (triggered)**:
```
✅ 当前价 $1950 ≤ 目标价 $2000
→ 自动调用 buildSwapPipeline → 返回 calldata
→ 用户签名 → onchainos_gateway_broadcast
```

## 价格监控

未触发时，用 WS 实时追踪：

```json
// onchainos_ws_subscribe
{ "channel": "price", "chainIndex": "1", "tokenContractAddress": "0x..." }
// → [WS-DATA] 实时推送价格变化
```

## Price Deviation Display

| 偏离度 | 描述 |
|--------|------|
| < 1% | 即将触发 |
| 1-5% | 接近触发 |
| 5-20% | 距离较远 |
| > 20% | 需大幅波动 |
