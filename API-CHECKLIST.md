# H-MCP API 对接清单

> 来源: okx-api-llms-full.txt (Onchain OS Dev Docs)
> 已对接: ✅ | 待对接: ⬜ | 跳过: ⛔
> 命名规范: onchainos_<模块>_<操作> (OnchainOS-API对接规范.md §6.7)

---

## 一、Market 行情模块 CAT:[链上-行情]

### 1.1 基础行情
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 1 | onchainos_market_supported_chain | GET | /api/v6/dex/market/supported/chain | ✅ |
| 2 | onchainos_token_search | GET | /api/v6/dex/market/token/search?search=&chains= | ✅ |
| 3 | onchainos_market_price | POST | /api/v6/dex/market/price | ✅ |
| 4 | onchainos_market_candles | GET | /api/v6/dex/market/candles | ✅ |
| 5 | onchainos_market_candles_history | GET | /api/v6/dex/market/historical-candles | ✅ |
| 6 | onchainos_token_basic_info | POST | /api/v6/dex/market/token/basic-info | ✅ |

### 1.2 批量行情
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 7 | onchainos_market_price_info | POST | /api/v6/dex/market/price-info | ⬜ |
| 8 | onchainos_market_trades | GET | /api/v6/dex/market/trades | ⬜ |

### 1.3 代币分析
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 9 | onchainos_token_advanced_info | GET | /api/v6/dex/market/token/advanced-info | ⬜ |
| 10 | onchainos_token_top_liquidity | GET | /api/v6/dex/market/token/top-liquidity | ⬜ |
| 11 | onchainos_token_holder | GET | /api/v6/dex/market/token/holder | ⬜ |
| 12 | onchainos_token_hot | GET | /api/v6/dex/market/token/hot-token | ⬜ |
| 13 | onchainos_token_toplist | GET | /api/v6/dex/market/token/toplist | ⬜ |
| 14 | onchainos_token_top_trader | GET | /api/v6/dex/market/token/top-trader | ⬜ |

### 1.4 代币聚类
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 15 | onchainos_token_cluster_supported_chain | GET | /api/v6/dex/market/token/cluster/supported/chain | ⬜ |
| 16 | onchainos_token_cluster_overview | GET | /api/v6/dex/market/token/cluster/overview | ⬜ |
| 17 | onchainos_token_cluster_list | GET | /api/v6/dex/market/token/cluster/list | ⬜ |
| 18 | onchainos_token_cluster_top_holders | GET | /api/v6/dex/market/token/cluster/top-holders | ⬜ |

### 1.5 指数价格
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 19 | onchainos_index_current_price | POST | /api/v6/dex/index/current-price | ⬜ |
| 20 | onchainos_index_historical_price | GET | /api/v6/dex/index/historical-price | ⬜ |

### 1.6 投资组合 (Portfolio)
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 21 | onchainos_portfolio_supported_chain | GET | /api/v6/dex/market/portfolio/supported/chain | ⬜ |
| 22 | onchainos_portfolio_overview | GET | /api/v6/dex/market/portfolio/overview | ⬜ |
| 23 | onchainos_portfolio_recent_pnl | GET | /api/v6/dex/market/portfolio/recent-pnl | ⬜ |
| 24 | onchainos_portfolio_token_latest_pnl | GET | /api/v6/dex/market/portfolio/token/latest-pnl | ⬜ |
| 25 | onchainos_portfolio_dex_history | GET | /api/v6/dex/market/portfolio/dex-history | ⬜ |

### 1.7 地址追踪
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 26 | onchainos_address_tracker_trades | GET | /api/v6/dex/market/address-tracker/trades | ⬜ |

### 1.8 信号 (Signal)
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 27 | onchainos_signal_supported_chain | GET | /api/v6/dex/market/signal/supported/chain | ⬜ |
| 28 | onchainos_signal_list | POST | /api/v6/dex/market/signal/list | ⬜ |
| 29 | onchainos_leaderboard_supported_chain | GET | /api/v6/dex/market/leaderboard/supported/chain | ⬜ |
| 30 | onchainos_leaderboard_list | GET | /api/v6/dex/market/leaderboard/list | ⬜ |

### 1.9 Memepump
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 31 | onchainos_memepump_supported | GET | /api/v6/dex/market/memepump/supported/chainsProtocol | ⬜ |
| 32 | onchainos_memepump_token_list | GET | /api/v6/dex/market/memepump/tokenList | ⬜ |
| 33 | onchainos_memepump_token_details | GET | /api/v6/dex/market/memepump/tokenDetails | ⬜ |
| 34 | onchainos_memepump_token_dev_info | GET | /api/v6/dex/market/memepump/tokenDevInfo | ⬜ |
| 35 | onchainos_memepump_similar_token | GET | /api/v6/dex/market/memepump/similarToken | ⬜ |
| 36 | onchainos_memepump_bundle_info | GET | /api/v6/dex/market/memepump/tokenBundleInfo | ⬜ |
| 37 | onchainos_memepump_aped_wallet | GET | /api/v6/dex/market/memepump/apedWallet | ⬜ |

---

## 二、Trade 交易模块 CAT:[链上-Swap]

### 2.1 DEX 聚合器
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 1 | onchainos_dex_supported_chain | GET | /api/v6/dex/aggregator/supported/chain | ✅ |
| 2 | onchainos_dex_all_tokens | GET | /api/v6/dex/aggregator/all-tokens | ✅ |
| 3 | onchainos_dex_liquidity | GET | /api/v6/dex/aggregator/get-liquidity | ✅ |
| 4 | onchainos_dex_quote | GET | /api/v6/dex/aggregator/quote | ✅ |
| 5 | onchainos_dex_approve_transaction | GET | /api/v6/dex/aggregator/approve-transaction | ✅ |
| 6 | onchainos_swap_execute | GET | /api/v6/dex/aggregator/swap | ✅ |
| 7 | onchainos_swap_history | GET | /api/v6/dex/aggregator/history | ✅ |

### 2.2 Solana Swap Instruction
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 8 | onchainos_swap_instruction | GET | /api/v6/dex/aggregator/swap-instruction | ⬜ |

### 2.3 跨链 (Cross-chain)
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 9 | onchainos_cross_chain_supported_chain | GET | /api/v5/dex/cross-chain/supported/chain | ⬜ |
| 10 | onchainos_cross_chain_supported_tokens | GET | /api/v5/dex/cross-chain/supported/tokens | ⬜ |
| 11 | onchainos_cross_chain_supported_bridges | GET | /api/v5/dex/cross-chain/supported/bridges | ⬜ |
| 12 | onchainos_cross_chain_bridge_tokens_pairs | GET | /api/v5/dex/cross-chain/supported/bridge-tokens-pairs | ⬜ |
| 13 | onchainos_cross_chain_quote | GET | /api/v5/dex/cross-chain/quote | ⬜ |
| 14 | onchainos_cross_chain_build_tx | GET | /api/v5/dex/cross-chain/build-tx | ⬜ |
| 15 | onchainos_cross_chain_status | GET | /api/v5/dex/cross-chain/status | ⬜ |

### 2.4 限价单 (Limit Order)
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 16 | onchainos_limit_order_supported_chain | GET | /api/v5/dex/aggregator/limit-order/chain | ⬜ |
| 17 | onchainos_limit_order_all | GET | /api/v5/dex/aggregator/limit-order/all | ⬜ |
| 18 | onchainos_limit_order_detail | GET | /api/v5/dex/aggregator/limit-order/detail | ⬜ |
| 19 | onchainos_limit_order_save | POST | /api/v5/dex/aggregator/limit-order/save-order | ⬜ |
| 20 | onchainos_limit_order_cancel_calldata | GET | /api/v5/dex/aggregator/limit-order/cancel/calldata | ⬜ |

---

## 三、Balance 账户模块 CAT:[链上-账户]

### 3.1 余额查询 (v6)
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 1 | onchainos_balance_supported_chain | GET | /api/v6/dex/balance/supported/chain | ✅ |
| 2 | onchainos_balance_total_value | GET | /api/v6/dex/balance/total-value-by-address | ✅ |
| 3 | onchainos_balance_all_tokens | GET | /api/v6/dex/balance/all-token-balances-by-address | ✅ |
| 4 | onchainos_balance_specific_token | POST | /api/v6/dex/balance/token-balances-by-address | ✅ |

### 3.2 交易历史
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 5 | onchainos_transaction_history | GET | /api/v6/dex/post-transaction/transactions-by-address | ✅ |
| 6 | onchainos_transaction_detail | GET | /api/v6/dex/post-transaction/transaction-detail-by-txhash | ✅ |
| 7 | onchainos_transaction_orders | GET | /api/v6/dex/post-transaction/orders | ✅ |

### 3.3 Wallet API (v5 补充)
| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 8 | onchainos_wallet_supported_chains | GET | /api/v5/wallet/chain/supported-chains | ⬜ |
| 9 | onchainos_wallet_token_price | POST | /api/v5/wallet/token/current-price | ⬜ |
| 10 | onchainos_wallet_token_realtime_price | POST | /api/v5/wallet/token/real-time-price | ⬜ |
| 11 | onchainos_wallet_token_historical_price | GET | /api/v5/wallet/token/historical-price | ⬜ |
| 12 | onchainos_wallet_token_detail | GET | /api/v5/wallet/token/token-detail | ⬜ |
| 13 | onchainos_wallet_approvals | GET | /api/v5/wallet/security/approvals | ⬜ |
| 14 | onchainos_wallet_utxos | GET | /api/v5/wallet/utxo/utxos | ⬜ |
| 15 | onchainos_wallet_utxo_detail | GET | /api/v5/wallet/utxo/utxo-detail | ⬜ |
| 16 | onchainos_wallet_validate_address | GET | /api/v5/wallet/pre-transaction/validate-address | ⬜ |

---

## 四、Gateway 网关模块 CAT:[链上-网关]

| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 1 | onchainos_gateway_supported_chain | GET | /api/v6/dex/pre-transaction/supported/chain | ✅ |
| 2 | onchainos_gateway_gas_price | GET | /api/v6/dex/pre-transaction/gas-price | ✅ |
| 3 | onchainos_gateway_gas_limit | POST | /api/v6/dex/pre-transaction/gas-limit | ✅ |
| 4 | onchainos_gateway_simulate | POST | /api/v6/dex/pre-transaction/simulate | ✅ |
| 5 | onchainos_gateway_broadcast | POST | /api/v6/dex/pre-transaction/broadcast-transaction | ✅ |

---

## 五、Payments 支付模块

| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 1 | onchainos_payment_supported | GET | /api/v6/pay/x402/supported | ✅ |
| 2 | onchainos_payment_verify | POST | /api/v6/pay/x402/verify | ✅ |
| 3 | onchainos_payment_settle | POST | /api/v6/pay/x402/settle | ✅ |
| 4 | onchainos_payment_status | GET | /api/v6/pay/x402/settle/status | ✅ |

---

## 六、DeFi 模块 (v5)

| # | 工具名 | HTTP | 端点 | 状态 |
|---|--------|------|------|------|
| 1 | onchainos_defi_protocol_list | GET | /api/v5/defi/explore/protocol/list | ⬜ |
| 2 | onchainos_defi_token_list | GET | /api/v5/defi/explore/token/list | ⬜ |
| 3 | onchainos_defi_product_list | POST | /api/v5/defi/explore/product/list | ⬜ |
| 4 | onchainos_defi_product_detail | GET | /api/v5/defi/explore/product/detail | ⬜ |
| 5 | onchainos_defi_network_list | GET | /api/v5/defi/explore/network-list | ⬜ |
| 6 | onchainos_defi_subscribe_info | POST | /api/v5/defi/calculator/subscribe-info | ⬜ |
| 7 | onchainos_defi_redeem_info | POST | /api/v5/defi/calculator/redeem-info | ⬜ |
| 8 | onchainos_defi_authorization | POST | /api/v5/defi/transaction/authorization | ⬜ |
| 9 | onchainos_defi_subscription | POST | /api/v5/defi/transaction/subscription | ⬜ |
| 10 | onchainos_defi_redemption | POST | /api/v5/defi/transaction/redemption | ⬜ |
| 11 | onchainos_defi_bonus | POST | /api/v5/defi/transaction/bonus | ⬜ |
| 12 | onchainos_defi_user_platform_list | POST | /api/v5/defi/user/asset/platform/list | ⬜ |
| 13 | onchainos_defi_user_platform_detail | POST | /api/v5/defi/user/asset/platform/detail | ⬜ |
| 14 | onchainos_defi_user_asset_detail | POST | /api/v5/defi/user/investment/asset-detail | ⬜ |
| 15 | onchainos_defi_user_balance_list | POST | /api/v5/defi/user/balance-list | ⬜ |
| 16 | onchainos_defi_user_unstake_list | GET | /api/v5/defi/user/investment/unstake-list | ⬜ |

---

## 汇总

| 模块 | 总数 | ✅ 已对接 | ⬜ 待对接 |
|------|------|-----------|-----------|
| Market 行情 | 37 | 6 | 31 |
| Trade 交易 | 20 | 7 | 13 |
| Balance 账户 | 16 | 7 | 9 |
| Gateway 网关 | 5 | 5 | 0 |
| Payments 支付 | 4 | 4 | 0 |
| DeFi | 16 | 0 | 16 |
| **总计** | **98** | **29** | **69** |
