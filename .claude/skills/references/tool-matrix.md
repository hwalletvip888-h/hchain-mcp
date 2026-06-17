# 工具→Agent 分配矩阵

> 总工具数: 109 | 覆盖: 109/109 | 最后更新: 2026-06-17

## 行情 (Market) — 45 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 1 | onchainos_market_supported_chain | market-analyst | - |
| 2 | onchainos_market_price | market-analyst | - |
| 3 | onchainos_market_candles | market-analyst | - |
| 4 | onchainos_market_historical_candles | market-analyst | - |
| 5 | onchainos_market_trades | market-analyst | signal-scout |
| 6 | onchainos_token_price_info | market-analyst | - |
| 7 | onchainos_token_advanced_info | risk-assessor | - |
| 8 | onchainos_index_current_price | market-analyst | - |
| 9 | onchainos_index_historical_price | market-analyst | - |
| 10 | onchainos_token_search | market-analyst | - |
| 11 | onchainos_token_basic_info | market-analyst | - |
| 12 | onchainos_token_top_liquidity | market-analyst | - |
| 13 | onchainos_token_hot | market-analyst | signal-scout |
| 14 | onchainos_token_holder | risk-assessor | - |
| 15 | onchainos_token_cluster_supported_chain | risk-assessor | - |
| 16 | onchainos_token_cluster_overview | risk-assessor | - |
| 17 | onchainos_token_cluster_list | risk-assessor | - |
| 18 | onchainos_token_cluster_top_holders | risk-assessor | - |
| 19 | onchainos_token_top_trader | risk-assessor | signal-scout |
| 20 | onchainos_signal_supported_chain | signal-scout | - |
| 21 | onchainos_signal_list | signal-scout | - |
| 22 | onchainos_leaderboard_supported_chain | signal-scout | - |
| 23 | onchainos_leaderboard_list | signal-scout | - |
| 24 | onchainos_memepump_supported | signal-scout | - |
| 25 | onchainos_memepump_token_list | signal-scout | - |
| 26 | onchainos_memepump_token_details | signal-scout | - |
| 27 | onchainos_memepump_token_dev_info | signal-scout | risk-assessor |
| 28 | onchainos_memepump_similar_token | risk-assessor | signal-scout |
| 29 | onchainos_memepump_bundle_info | risk-assessor | - |
| 30 | onchainos_memepump_aped_wallet | risk-assessor | signal-scout |
| 31 | onchainos_portfolio_supported_chain | signal-scout | - |
| 32 | onchainos_portfolio_overview | signal-scout | - |
| 33 | onchainos_portfolio_recent_pnl | signal-scout | - |
| 34 | onchainos_portfolio_token_latest_pnl | signal-scout | - |
| 35 | onchainos_portfolio_dex_history | signal-scout | portfolio-tracker |
| 36 | onchainos_address_tracker_trades | signal-scout | - |
| 37 | onchainos_social_news_latest | social-analyst | - |
| 38 | onchainos_social_news_by_symbol | social-analyst | - |
| 39 | onchainos_social_news_search | social-analyst | - |
| 40 | onchainos_social_news_detail | social-analyst | - |
| 41 | onchainos_social_news_platforms | social-analyst | - |
| 42 | onchainos_social_sentiment_symbol | social-analyst | - |
| 43 | onchainos_social_sentiment_ranking | social-analyst | - |
| 44 | onchainos_social_vibe_timeline | social-analyst | - |
| 45 | onchainos_social_vibe_top_kols | social-analyst | - |

## DeFi — 14 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 46 | onchainos_defi_supported_chains | defi-strategist | - |
| 47 | onchainos_defi_supported_platforms | defi-strategist | - |
| 48 | onchainos_defi_search_products | defi-strategist | - |
| 49 | onchainos_defi_product_detail | defi-strategist | - |
| 50 | onchainos_defi_rate_chart | defi-strategist | - |
| 51 | onchainos_defi_tvl_chart | defi-strategist | - |
| 52 | onchainos_defi_depth_price_chart | defi-strategist | - |
| 53 | onchainos_defi_prepare_transaction | defi-strategist | - |
| 54 | onchainos_defi_calc_enter_info | defi-strategist | - |
| 55 | onchainos_defi_enter | defi-strategist | - |
| 56 | onchainos_defi_exit | defi-strategist | - |
| 57 | onchainos_defi_claim | defi-strategist | - |
| 58 | onchainos_defi_user_platform_list | defi-strategist | - |
| 59 | onchainos_defi_user_platform_detail | defi-strategist | - |

## 交易 (DEX) — 8 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 60 | onchainos_dex_supported_chain | trade-executor | - |
| 61 | onchainos_dex_all_tokens | trade-executor | - |
| 62 | onchainos_dex_liquidity | trade-executor | - |
| 63 | onchainos_dex_quote | trade-executor | - |
| 64 | onchainos_dex_approve_transaction | trade-executor | - |
| 65 | onchainos_dex_swap | trade-executor | - |
| 66 | onchainos_dex_swap_instruction | trade-executor | - |
| 67 | onchainos_dex_swap_history | trade-executor | - |

## 意图 (Intent) — 6 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 68 | onchainos_intent_create_order | trade-executor | - |
| 69 | onchainos_intent_order_list | trade-executor | - |
| 70 | onchainos_intent_order_status | trade-executor | - |
| 71 | onchainos_intent_cancel_sign_data | trade-executor | - |
| 72 | onchainos_intent_cancel_order | trade-executor | - |
| 73 | onchainos_intent_auction_info | trade-executor | - |

## 网关 (Gateway) — 6 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 74 | onchainos_gateway_supported_chain | trade-executor | - |
| 75 | onchainos_gateway_gas_price | trade-executor | - |
| 76 | onchainos_gateway_gas_limit | trade-executor | - |
| 77 | onchainos_gateway_simulate | trade-executor | - |
| 78 | onchainos_gateway_broadcast | trade-executor | - |
| 79 | onchainos_gateway_orders | trade-executor | - |

## 支付 (Payment) — 5 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 80 | onchainos_payment_create | defi-strategist | - |
| 81 | onchainos_payment_detail | defi-strategist | - |
| 82 | onchainos_payment_submit | defi-strategist | - |
| 83 | onchainos_payment_status | defi-strategist | - |
| 84 | onchainos_payment_supported | defi-strategist | - |

## 余额 (Balance) — 4 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 85 | onchainos_balance_supported_chain | portfolio-tracker | market-analyst |
| 86 | onchainos_balance_total_value | portfolio-tracker | - |
| 87 | onchainos_balance_all_tokens | portfolio-tracker | - |
| 88 | onchainos_balance_specific_token | portfolio-tracker | - |

## WebSocket — 4 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 89 | onchainos_ws_connect | signal-scout | - |
| 90 | onchainos_ws_subscribe | signal-scout | - |
| 91 | onchainos_ws_unsubscribe | signal-scout | - |
| 92 | onchainos_ws_disconnect | signal-scout | - |

## 组合技能 (Skill) — 13 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 93 | onchainos_skill_trade_pipeline | trade-executor | - |
| 94 | onchainos_skill_risk_detect | risk-assessor | - |
| 95 | onchainos_skill_smart_slippage | trade-executor | - |
| 96 | onchainos_skill_signal_aggregate | signal-scout | - |
| 97 | onchainos_skill_market_overview | market-analyst | - |
| 98 | onchainos_skill_crosschain_swap | trade-executor | - |
| 99 | onchainos_skill_conditional_order | trade-executor | - |
| 100 | onchainos_skill_tx_accelerator | trade-executor | - |
| 101 | onchainos_skill_social_narrative | social-analyst | - |
| 102 | onchainos_skill_batch_swap | trade-executor | - |
| 103 | onchainos_skill_nonce_manager | trade-executor | - |
| 104 | onchainos_skill_price_alert | signal-scout | - |
| 105 | onchainos_skill_gas_configurator | trade-executor | - |

## 历史 (History) — 3 tools

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 106 | onchainos_tx_history_supported_chain | portfolio-tracker | - |
| 107 | onchainos_transaction_history | portfolio-tracker | - |
| 108 | onchainos_transaction_detail | portfolio-tracker | - |

## 帮助 (Help) — 1 tool

| # | 工具 | 主Agent | 备用Agent |
|:---:|------|------|------|
| 109 | onchainos_help | orchestrator | - |

---

## Agent 工具数统计

| Agent | 工具数 | 模型 |
|------|:---:|:---:|
| market-analyst | 14 | Sonnet |
| risk-assessor | 11 | Opus |
| trade-executor | 28 | Sonnet |
| signal-scout | 20 | Sonnet |
| defi-strategist | 19 | Sonnet |
| social-analyst | 10 | Haiku |
| portfolio-tracker | 7 | Haiku |
| orchestrator | 5 | Opus |
| code-reviewer | 4 | Opus |
| test-engineer | 5 | Sonnet |
| **总计** | **123** | (含合理重复) |
