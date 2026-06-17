# Trade API — 知识总结

> 来源: web3.okx.com 官方教程 · 对接日期 2026-06-14

---

## 经典兑换 API (8 endpoints, v6, 全部 GET)

从 Solana/EVM/Sui/Ton 四个教程提取:

| # | 端点 | 关键参数 |
|---|------|---------|
| 1 | `GET /api/v6/dex/aggregator/supported/chain` | 无 |
| 2 | `GET /api/v6/dex/aggregator/all-tokens?chainIndex=` | chainIndex(String) |
| 3 | `GET /api/v6/dex/aggregator/get-liquidity?chainIndex=` | chainIndex(String) |
| 4 | `GET /api/v6/dex/aggregator/approve-transaction` | chainIndex, tokenContractAddress, approveAmount |
| 5 | `GET /api/v6/dex/aggregator/quote` | chainIndex, fromTokenAddress, toTokenAddress, amount, slippagePercent |
| 6 | `GET /api/v6/dex/aggregator/swap` | chainIndex, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent, autoSlippage, maxAutoSlippagePercent |
| 7 | `GET /api/v6/dex/aggregator/swap-instruction` | chainIndex, fromTokenAddress, toTokenAddress, amount, slippagePercent, userWalletAddress, feePercent, autoSlippage, fromTokenReferrerWalletAddress, pathNum |
| 8 | `GET /api/v6/dex/aggregator/history` | chainIndex, txHash, isFromMyProject |

**关键**: chainIndex 全部是 **String** 类型 (如 "501", "8453", "1", "784", "607")

## 兑换流程 (Agent 标准路径)

```
1. supported/chain → 确认链可用
2. all-tokens / get-liquidity → 确认代币和流动性
3. quote → 拿报价 (输出金额, 价格影响, 路由)
4. approve-transaction → (仅 ERC-20) 授权 DEX 合约
5. swap → 构建交易 calldata
6. simulate (Gateway) → 模拟执行
7. broadcast (Gateway) → 广播已签名交易
8. history / orders → 追踪状态
```

## DEX SDK 接口参数 (Phase 2 参考)

### getQuote / executeSwap 通用参数

| 参数 | 类型 | 说明 |
|------|------|------|
| chainIndex | String | 链ID |
| fromTokenAddress | String | 卖出代币 |
| toTokenAddress | String | 买入代币 |
| amount | String | 数量(人类可读, SDK 内部转 base units) |
| slippagePercent | String | 滑点, 如 "0.5" |
| userWalletAddress | String | 钱包地址 |

### executeApproval 参数 (EVM)

| 参数 | 说明 |
|------|------|
| chainIndex / tokenContractAddress / approveAmount | 标准授权参数 |

### swap-instruction 额外参数 (Solana 高级)

| 参数 | 说明 |
|------|------|
| feePercent | 分佣百分比, 如 "1" |
| autoSlippage | "true"/"false" |
| fromTokenReferrerWalletAddress | 推荐费地址 |
| pathNum | 最大路由数, 如 "3" |

返回: `{ instructionLists, addressLookupTableAccount }`

### 各链常量速查

| 链 | chainIndex | 原生代币 |
|----|-----------|---------|
| Solana | "501" | `11111111111111111111111111111111` |
| Sui | "784" | `0x2::sui::SUI` |
| Base | "8453" | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` |
| Ton | "607" | `EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c` |
| BSC | "56" | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` |

## DEX Router 合约地址 (来源: 智能合约页面)

| 链 | Router | Approve |
|----|--------|---------|
| ETH | `0x28b1Dc1a5E3699A428BC51d234DFab7C9CB2a183` | `0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f` |
| Solana | `proVF4pMXVaYqmy4NjniPh4pqKNfMmsihgd4wdkCX3u` | 不需要 |
| Base | `0xC8F6b8Ba0DC0f175B568B99440B0867F69A29265` | `0x57df6092665eb6058DE53939612413ff4B09114E` |
| BSC | `0x62cceF0b4545166f721cAa9fEe13c1d3767E27dc` | `0x2c34A2Fb1d0b4f55de51E1d0bDEfaDDce6b7cDD6` |
| Arbitrum | `0x7CF6b330b437E9fb432B1400DE17B03357Cf049A` | `0x70cBb871E8f30Fc8Ce23609E9E0Ea87B6b222F58` |
| X Layer | `0x722db4f285F8bD91ef7AF6DA397e83f7fA4E80a7` | `0x8b773D83bc66Be128c60e07E17C8901f7a64F000` |
| Sui | `0x4f1f29379f9fff73adb850ecf15513179d9b6a924e8c1d553d25582629778923` | 不需要 |
| Ton | `EQAgvOlWk7C0Pz3YgSaX-MA7UDDhE9n6eQgQRwJahOBm4VKr` | 不需要 |

完整列表见 docs/TRADE.md 源码

## 做市商接入 / Solver 接入 — 反向集成

做市商(PMM): OKX GET → 你的 `/OKXDEX/rfq/pricing` + POST → 你的 `/OKXDEX/rfq/firm-order`
Solver: OKX POST → 你的 `/OKXDEX/intent/quote` + `/solve` + `/settle` + `/notify`

均非 MCP Tool 可封装的 REST API。需自行实现端点供 OKX 调用。

## 未对接模块

- **意图兑换 API** (8 endpoints) — 官方 API 参考页面未贴
- **意图交易 Solver** (7 endpoints) — 官方 API 参考页面未贴
- **做市商接入** — SDK 反向集成, 非 REST
