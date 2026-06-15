# Changelog

## 1.0.3 — 2026-06-15

### Added
- GitHub Actions CI/CD：3 个 node 版本（18/20/22）自动 build + test
- 自动 npm publish：推送 `v*` tag 即自动发版到 npm
- Dockerfile 多阶段构建支持
- vitest 测试框架 + 8 个基础测试
- Rate limiting（HTTP 模式，20 req/s/IP）
- Graceful shutdown（SIGTERM/SIGINT 优雅退出）
- README 徽章（npm version/downloads/license/CI）

### Changed
- 全部 101 个工具描述从 300-600 字结构化文档精简为一行简洁描述
- 补齐 tool annotations：所有工具增加 readOnlyHint + idempotentHint + destructiveHint
- package.json：增加 files/bin/repository/engines/keywords 字段
- 移除未使用的 express 依赖
- 抽取重复 resolveAuth 到 shared 模块
- 版本号改为从 package.json 动态读取

### Fixed
- http.ts 版本号硬编码（`"1.0.1"` 写死）
- package-lock.json 名称/版本与 package.json 不一致

## 1.0.2 — 2026-06-14

### Changed
- http.ts 版本号改为动态读取

## 1.0.1 — 2026-06-14

### Changed
- 重命名包为 `hchain-mcp`
- 更新 README 和描述

## 1.0.0 — 2026-06-14

### Added
- **Market**（45 个工具）：行情价格、K 线 OHLCV、代币搜索/信息/持有人、聚类分析、聪明钱信号、排行榜、Meme 扫链、地址画像、社媒情绪
- **DeFi**（14 个工具）：协议搜索、投资品详情/搜索、APY/TVL 走势、申购/赎回/领取奖励
- **Trade**（8 个工具）：DEX 聚合报价、兑换构建、授权 calldata、Solana 指令
- **Intent**（6 个工具）：意图订单创建/取消/拍卖/状态查询
- **Gateway**（6 个工具）：Gas Price/Limit、交易模拟、广播、订单查询
- **Payments**（5 个工具）：Agent-to-Agent 支付（x402）
- **Balance**（4 个工具）：多链余额/持仓查询
- **WebSocket**（4 个工具）：连接/订阅/取消/断开
- **TxHistory**（3 个工具）：链上交易历史查询
- **Skills**（4 个工具）：交易全链路管线、风险检测、智能滑点、信号聚合
- 双传输模式：stdio（本地 Agent）+ StreamableHTTP（远程 Agent）
- 40+ 链支持：Ethereum、BSC、Solana、Sui、TON、Base、Arbitrum 等
