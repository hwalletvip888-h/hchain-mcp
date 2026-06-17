---
name: hchain-trade-pipeline
description: "全自动交易管线：报价→授权→构建→模拟，一步完成。Use this skill when the user says '帮我买', '卖一下', '兑换', 'swap', 'trade', '换币', '买入', '卖出', '帮我把X换成Y', wants to swap/trade/exchange tokens, needs to execute a DEX trade, or asks about trading any token pair. Covers all chains: Ethereum, Solana, BSC, Base, Arbitrum, Polygon, Sui, TON, Avalanche, and 30+ more."
license: MIT
metadata:
  author: hwalletvip888-h
  version: "1.3.0"
  homepage: "https://github.com/hwalletvip888-h/hchain-mcp"
---

# hchain-trade-pipeline

一键交易：报价 → 授权 → 构建 → 模拟，返回 calldata 等待用户签名广播。

## Pre-flight Checks

> 先确认 MCP Server 已连接。如果 `onchainos_help` 不可用，运行 `npx hchain-skills` 启动。

## Token Address Resolution

<IMPORTANT>
🚨 不要猜代币地址 — 同符号不同链地址不同。

1. **主链币**: ETH/SOL/BNB → 传空字符串 `""`
2. **不确定地址**: 先调 `onchainos_token_search` 搜索
3. **不确定 decimals**: 先调 `onchainos_token_basic_info` 查精度
</IMPORTANT>

## Chain Support

> 不确定链ID？先调 `onchainos_dex_supported_chain` 获取完整列表。
> 常见值: `'1'`=ETH `'56'`=BSC `'501'`=Solana `'8453'`=Base `'42161'`=Arbitrum `'137'`=Polygon

## Execution Flow

### Step 1 — 收集参数

- **chainIndex**: 用户说的链名 → 查链ID（字符串）
- **fromTokenAddress**: 卖什么 → 搜索或用户提供。主链币传 `""`
- **toTokenAddress**: 买什么 → 同上
- **amount**: 人类可读数量 × 10^decimals。不确定 decimals → 调 `onchainos_token_basic_info`
- **userWalletAddress**: 用户钱包地址
- **slippagePercent**: 默认 `"1.0"`，建议从 `onchainos_skill_smart_slippage` 获取
- **gasLevel**: `"average"` (默认) / `"fast"` (抢跑) / `"slow"` (省钱)

### Step 2 — 智能滑点（推荐）

```json
// 调 onchainos_skill_smart_slippage 获取推荐滑点
{
  "chainIndex": "1",
  "fromTokenAddress": "0x...",
  "toTokenAddress": "",
  "amount": "1000000000000000000"
}
// → 返回 recommendedSlippagePercent
```

### Step 3 — 一键交易管线

```json
// 调 onchainos_skill_trade_pipeline
{
  "chainIndex": "1",
  "fromTokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "toTokenAddress": "",
  "amount": "1000000",
  "userWalletAddress": "0x...",
  "slippagePercent": "1.0",
  "gasLevel": "average"
}
```

返回 4 个步骤的结果：
| Step | 状态 | 说明 |
|------|------|------|
| quote | ok/error | 报价成功则含 priceImpactPercent |
| approve | ok/skipped/error | 主链币跳过，ERC20 返回 txHash |
| swap | ok/error | 构建成功则返回 calldata |
| simulate | ok/error | 模拟执行结果 |

### Step 4 — 用户签名 + 广播

管线返回了 calldata（to/data/value/gasPrice/gas）—— **Agent 不能代签**：

```
用户用私钥/钱包签名 calldata → 调 onchainos_gateway_broadcast 广播
→ 调 onchainos_gateway_orders 追踪状态
```

### Step 5 — 追踪

```json
// onchainos_gateway_orders
{
  "address": "0x...",
  "chainIndex": "1",
  "txStatus": "2"
}
```

## Amount Formula

```
amount = 人类可读数量 × 10^decimals

USDT (6):  1 USDT  = 1000000
USDC (6):  1 USDC  = 1000000
ETH  (18): 1 ETH   = 1000000000000000000
SOL  (9):  1 SOL   = 1000000000
DAI  (18): 1 DAI   = 1000000000000000000
```

## Risk Controls

| 风险 | 动作 | 说明 |
|------|------|------|
| priceImpact > 5% | 警告 | 提醒用户高价格影响 |
| priceImpact > 15% | 阻止 | 建议拆单或放弃 |
| 报价失败 | 中断 | 检查链/代币是否正确 |
| 模拟失败 | 警告 | 允许继续但提示风险 |
| 授权失败 | 跳过 | 可能是主链币或已授权 |

## Gas Presets

| 场景 | gasLevel | 说明 |
|------|----------|------|
| Meme/抢跑 | `fast` | 高 Gas 优先打包 |
| 日常交易 | `average` | 默认，均衡 |
| 非紧急 | `slow` | 省 Gas 费 |

EVM 链可调 `onchainos_skill_gas_configurator` 获取 EIP-1559 精细参数。

## Edge Cases

- **exactIn vs exactOut**: 默认 exactIn（按卖出量），exactOut 仅 ETH/Base/BSC/Arbitrum 的 UniV2/V3 支持
- **原生代币**: 传空字符串 `""` 或 `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`
- **approve 先于 swap**: 首次交易某代币需先授权，管线自动处理
- **跨链**: 用 `hchain-crosschain-swap` 而非本 skill

## References

- `../_shared/chain-support.md` — 完整链列表
- `../_shared/native-addresses.md` — 原生代币地址
