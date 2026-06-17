# Agent Payments Protocol — 知识总结

> 来源: web3.okx.com 官方文档 · 对接日期 2026-06-14

---

## 一句话

让 AI Agent 能花钱和挣钱的开放协议——报价→签名→结算→交付 全流程。

---

## 角色三角

```
Seller ──创建付款──→ Broker(OKX验证+结算) ←──签名付款── Buyer
 (需API Key)          (托管状态机)            (公开访问)
```

Broker 不碰资金，只做公证：验签→KYT→提交链上交易。

---

## 4 种支付方式速查

| intent | 产品名 | 签名 | 结算 | 买家钱包 | Agent卖家 |
|--------|--------|------|------|----------|:--:|
| `charge` | 单次支付 | EIP-3009 一次签 | Broker 代上链 | 任意 EVM | ✅ |
| `aggr_deferred` | 批量支付 | Session Key 多次签 | TEE 聚合上链 | Agentic Wallet | 即将 |
| `session`(voucher) | 按量支付 | Voucher 累计签 | Escrow 关闭结算 | Agentic Wallet | 即将 |
| `escrow` | 担保支付 | 托管+仲裁 | Arbitrator 裁决 | — | 即将 |

---

## 单次支付 (charge)

**流程**: Buyer请求→Seller返回402 Challenge→Buyer签EIP-3009→提交Credential→Broker验签+KYT→X Layer结算→交付

**链和代币**: X Layer (chainId:196) | USDG `0x4ae4...` | USD₮0 `0x779d...` | 0 Gas

---

## 批量支付 (aggr_deferred)

**适用**: 单价<1美分 + 频率极高(百次/分钟)

**流程**: Session Key签名→Broker入库→TEE定时聚合(验Session Key+sum+EOA重签)→X Layer上链

**关键**: 买家必须Agentic Wallet | settle返回success即视为收款 | 不受出块速度限制

---

## 按量支付 (session/voucher)

**三步**: ①预存到Escrow(链上1次) ②每次签累计Voucher(链下,EIP-712) ③settle/close上链结算

**Voucher特性**: 累计金额(非增量) | 防重放(单调递增) | 抗丢失(只看最新) | 零上链

**关闭**: settle(中途,通道继续) | close(协同,买家配合) | requestClose(强制,15分钟宽限期)

---

## MCP Tools (5)

| Tool | 角色 | 鉴权 |
|------|------|:--:|
| `onchainos_payment_supported` | 查网络和代币 | API Key |
| `onchainos_payment_create` | Seller 创建 charge | API Key |
| `onchainos_payment_detail` | Buyer 拉取 challenge | 公开 |
| `onchainos_payment_submit` | Buyer 提交 EIP-3009 签名 | 公开 |
| `onchainos_payment_status` | 查结算状态 | 公开 |

---

## 术语表

- **EIP-3009**: 买家签转账授权，Broker代上链，买家0 Gas
- **Session Key**: Agentic Wallet临时密钥，单独无法上链，须TEE重签
- **TEE**: 硬件隔离环境，批量支付安全底座
- **Escrow合约**: 链上托管，资金只能按规则释放
- **Voucher**: 累计凭证——"截至当前累计应付X"
- **Challenge/Credential**: 协议唯一两类消息，传输载体无关(HTTP402/IM)
- **KYT**: Broker层交易级合规审查
