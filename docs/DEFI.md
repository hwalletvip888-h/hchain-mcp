# DeFi API — 知识总结

> 来源: web3.okx.com 官方 API 参考 · 对接日期 2026-06-14

---

## 模块速查 (14 endpoints, 全部 Free)

### 投资品查询 (7)

| # | 端点 | 方法 | 说明 |
|---|------|------|------|
| 1 | `/defi/product/supported-chains` | GET | 支持链, chainIndex+network |
| 2 | `/defi/product/supported-platforms` | GET | 协议列表, analysisPlatformId+investmentCount |
| 3 | `/defi/product/search` | POST | 投资品搜索, tokenKeywordList+productGroup |
| 4 | `/defi/product/detail` | GET | 投资品详情, APY/TVL/underlyingToken |
| 5 | `/defi/product/rate/chart` | GET | APY 折线图, timeRange=WEEK/MONTH/SEASON/YEAR |
| 6 | `/defi/product/tvl/chart` | GET | TVL 折线图 |
| 7 | `/defi/product/depth-price/chart` | GET | V3 Pool 深度/价格图, 仅 V3 DEX Pool |

### 交易执行 (5)

| # | 端点 | 方法 | 鉴权 | 说明 |
|---|------|------|:--:|------|
| 8 | `/defi/product/detail/prepare` | POST | READ | 交易参数准备, investWithTokenList/receiveTokenInfo |
| 9 | `/defi/calculator/enter/info` | POST | READ | V3 Pool 双币分配计算 |
| 10 | `/defi/transaction/enter` | POST | TRADE | 申购/存款, 返回 dataList(APPROVE→DEPOSIT) |
| 11 | `/defi/transaction/exit` | POST | TRADE | 赎回/还款, redeemPercent 建议必传 |
| 12 | `/defi/transaction/claim` | POST | TRADE | 领取奖励, rewardType 6种 |

### 用户持仓 (2)

| # | 端点 | 方法 | 说明 |
|---|------|------|------|
| 13 | `/defi/user/asset/platform/list` | POST | 持仓概览(协议维度), walletAddressList 数组 |
| 14 | `/defi/user/asset/platform/detail` | POST | 持仓明细(投资品维度), 含 availableRewards |

---

## 投资流程

```
查询链路: supported-chains → supported-platforms → search → detail → prepare
执行链路: prepare → enter/exit/claim → gateway_broadcast
持仓链路: platform/list → platform/detail → claim/exit
```

## 核心参数

- investmentId: 投资品唯一标识, 从 search 返回值获取
- analysisPlatformId: 协议ID, 从 supported-platforms 获取
- productGroup: SINGLE_EARN(单币) / DEX_POOL(流动性) / LENDING(借贷)
- rewardType: REWARD_INVESTMENT / REWARD_PLATFORM / V3_FEE / REWARD_OKX_BONUS / REWARD_MERKLE_BONUS / UNLOCKED_PRINCIPAL

## enter/exit 返回结构

```
dataList[{callDataType, from, to, value, serializedData, originalData, signatureData}]
```

callDataType: APPROVE → DEPOSIT / WITHDRAW / SWAP,DEPOSIT / WITHDRAW,SWAP

## 多链支持

EVM(hex calldata) / Solana(base58) / Sui(base64 BCS) / Aptos(transactionPayload)
