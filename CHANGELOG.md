# Changelog

## 1.4.0 — 2026-06-17

### Added
- **13 个独立 Skill**: `skills/` 目录，按官方 SKILL.md 格式，`hchain-` 统一前缀
  - `hchain-trade-pipeline` — 报价→授权→构建→模拟→签名→广播
  - `hchain-risk-detect` — 4维风险评分 0-100
  - `hchain-smart-slippage` — 波动率+价格影响→三档滑点
  - `hchain-signal-aggregate` — 信号→去重→批量风控→安全信号
  - `hchain-market-overview` — 价格+K线+安全+情绪一站式
  - `hchain-crosschain-swap` — Intent/Direct 双模式跨链
  - `hchain-conditional-order` — 限价/止损条件自动触发
  - `hchain-tx-accelerator` — pending诊断+RBF加速/取消
  - `hchain-social-narrative` — 5维并行(情绪+热度+KOL+新闻+排行)
  - `hchain-batch-swap` — 1-10笔批量兑换
  - `hchain-nonce-manager` — EVM nonce诊断+覆盖
  - `hchain-price-alert` — WS实时价格监控+触发
  - `hchain-gas-configurator` — EIP-1559三档Gas推荐
- 支持 `npx skills add hwalletvip888-h/hchain-mcp` 按需安装

## 1.3.0 — 2026-06-17

### Changed
- **错误处理重构**: 新增 `OkxError` 结构化错误类，`toError()` 从字符串匹配改为精确错误码映射（20+ OKX 业务码 + 5 HTTP 状态码）
- **WS 层修复**: 修复 `wsConnect` 消息监听器泄漏；`wsSubscribe`/`wsUnsubscribe` 新增 10s 超时；心跳定时器随断开清理
- **安全加固**: 移除命令行 API Key 读取（`process.argv` 全局可见风险）；HTTP body 大小限制 10MB；Rate Limiter 支持 `X-Forwarded-For` 代理 IP
- `help.ts` 版本号从硬编码改为 `package.json` 动态读取
- 删除死代码 `fetchPrice()`（未被调用且吞错危险）

### Fixed
- `package.json` 仓库 URL 从 `hchain-skills` 修正为 `hchain-mcp`
- Dockerfile 新增 `HEALTHCHECK` 指令
- 测试更新：`balance/gateway/market/trade` 测试改用 `OkxError` 匹配新错误结构

## 1.2.1 — 2026-06-17

### Added
- **链上赚币**: 10个专业Agent + 7个流水线命令 + 5个YAML工作流
- `buildSwapPipeline()` 辅助函数: 提取报价→授权→构建→模拟公共流水线
- `fetchPrice()` 辅助函数: 统一代币价格查询
- `errMsg()` 辅助函数: 统一错误消息提取(替换30处重复代码)
- 测试扩展: shared(52)、balance(11)、gateway(10)、trade(10) — 共83用例
- GitHub Issue模板: 交易请求/代币调研/Bug报告
- GitHub Actions: Agent触发器 workflow
- 框架自检脚本 `validate.sh` (13项检查)
- JSONL黑board共享内存机制
- 工具→Agent分配矩阵 (109 tools全覆盖)

### Fixed
- Bug 1: Gas估算公式恒等式修复 (21000→65000 + 移除txValue/txValue)
- Bug 2: price_alert targetPrice NaN校验缺失
- Bug 3: Nonce管理器移除gasLimit错误调用
- Bug 4: 貔貅检测双倍计分合并
- W3: price_alert readOnlyHint 修正 (true→false)
- W7: Nonce自动填充targetNonce
- W8: nonce未知时返回null而非误导性字符串
- S1: 30处 `e instanceof Error` → `errMsg(e)` 统一替换
- S4: commonGasLimit常量 21000→65000

### Changed
- **help.ts 重写**: 13个Skill全列出、新手推荐路径、🔍/✍️标注
- **README.md 重写**: 30秒上手、5分钟指南、痛点对比、FAQ
- **CLAUDE.md**: 新增链上赚币章节
- **shared.ts**: 新增errMsg()导出

## 1.2.0 — 2026-06-16

### Added
- **🔥 跨链原子交换** `onchainos_skill_crosschain_swap` — 源链→目标链一站式兑换（intent/direct 双模式）
- **🔥 条件订单** `onchainos_skill_conditional_order` — 限价买入/卖出 + 止损卖出，价格自动触发
- **🔥 交易加速器** `onchainos_skill_tx_accelerator` — pending 交易诊断 + RBF 加速/取消指引
- **🔥 社媒叙事分析** `onchainos_skill_social_narrative` — 情绪+热度+KOL+新闻 5 维并行聚合
- **批量兑换** `onchainos_skill_batch_swap` — 1-10 笔交易顺序执行
- **Nonce 管理器** `onchainos_skill_nonce_manager` — Nonce 状态诊断 + 覆盖指引
- **WS 价格预警** `onchainos_skill_price_alert` — WebSocket 实时监控价格触发
- **EIP-1559 Gas 配置器** `onchainos_skill_gas_configurator` — slow/average/fast 三档优先级费用
- 工具总数从 101 → **109**（96 基础 API + 13 组合技能）

### Changed
- 项目重命名 `hchain-mcp` → `hchain-skills`（明确社区版定位，避免与官方混淆）
- 安装命令变更为 `npm install -g hchain-skills`

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
