# Onchain Gateway API — 知识总结

> 来源: web3.okx.com 官方 API 参考 · 对接日期 2026-06-14

---

## 端点 (6)

| # | 端点 | 方法 | 关键参数 |
|---|------|------|---------|
| 1 | `/api/v6/dex/pre-transaction/supported/chain` | GET | 无 |
| 2 | `/api/v6/dex/pre-transaction/gas-price?chainIndex=` | GET | chainIndex(String) |
| 3 | `/api/v6/dex/pre-transaction/gas-limit` | POST | chainIndex, fromAddress, toAddress, txAmount?, extJson.inputData? |
| 4 | `/api/v6/dex/pre-transaction/simulate` | POST | fromAddress, toAddress, chainIndex, txAmount?, extJson.inputData, priorityFee?, gasPrice? |
| 5 | `/api/v6/dex/pre-transaction/broadcast-transaction` | POST | signedTx, chainIndex, address, extraData? |
| 6 | `/api/v6/dex/post-transaction/orders` | GET | address, chainIndex, txStatus?, orderId?, cursor?, limit? |

## 流程

```
1. supported/chain → 确认链
2. gas-price → 查Gas价格
3. gas-limit → 预估用量
4. simulate → 模拟执行 (白名单, dexapi@okx.com)
5. broadcast → 广播签名交易
6. orders → 追踪状态
```

## 响应要点

- gas-price: EVM/Tron 返回 normal/min/max + eip1559Protocol; Solana 返回 priorityFee
- simulate: 返回 intention(Swap/Token Approval), assetChange, gasUsed, failReason, risks
- broadcast: 返回 orderId + txHash; 支持 MEV 保护 (enableMevProtection/jitoSignedTx)
- orders: txStatus 1=排队 2=成功 3=失败; 支持分页(cursor/limit)

## 错误码

| 错误码 | 含义 |
|--------|------|
| 50001 | 服务暂不可用 |
| 81001 | 参数错误 |
| 81108 | 钱包类型不匹配 |
| 81104 | 不支持该链 |
| 81152 | 代币不存在 |
| 81451 | 节点返回失败 |
