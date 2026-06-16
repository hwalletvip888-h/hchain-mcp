---
name: monitor
description: 持仓监控 — 总资产、各链分布、盈亏一目了然
---

# /monitor — 持仓监控

全面监控钱包持仓状态。

## 参数
- `$1`: 监控范围 (all/chains/txns) (可选，默认 all)

## 监控内容

### all — 全面监控 (默认)
并行启动:
- `portfolio-tracker` → 总资产 + 各链分布
- `defi-strategist` → DeFi 持仓 + 待领收益
- `signal-scout` → 持仓币种的最新信号

### chains — 链上余额
- `portfolio-tracker` → 逐链查询余额和代币分布
- 输出: 按链排列的资产表

### txns — 最近交易
- `portfolio-tracker` → 最近 20 笔交易
- 输出: 交易历史（含状态、Gas、盈亏）

## 输出格式
```
💰 hchain 资产总览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总估值: $X,XXX.XX

📊 按链分布:
  ETH:    $X,XXX.XX (xx%)
  BSC:    $XXX.XX   (xx%)
  Solana: $XXX.XX   (xx%)

🏦 DeFi 持仓:
  [协议名]: $XXX.XX @ xx% APY

📋 最近交易:
  1. [成功] 兑换 100 USDT → 0.04 ETH
  2. [等待中] ...

⚠️ 提醒:
  - 待领取收益: $XX.XX
  - 未完成交易: X 笔
```
