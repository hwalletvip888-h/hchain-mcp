# Agent-First MCP 开发规则

## 总纲

MCP Server 的唯一用户是 AI Agent。不是给人看的，不是给前端调的。  
所有决策从 Agent 的认知局限和能力边界出发。

---

## 规则 1：Token 经济学——省即是快

Agent 的上下文窗口是有限资源。每个工具的 name、description、inputSchema 每轮对话都占 token。

| 红线 | 标准 |
|------|------|
| 工具数量 | ≤20。超出用 search+execute 模式 |
| 工具名 | ≤40 字符，纯动作动词+名词，kebab-case |
| 描述 | 1-2 句。说什么、返回什么、不说什么 |
| 参数数 | ≤5 必填，≤3 可选。超出拆工具 |
| 参数描述 | 每个参数必写 `.describe()`，但一句话说清 |
| enum 优先 | 能用 enum 就不用 string，减少 Agent 猜测 |

```
# 好
get_quote — 获取最优 swap 报价。返回输出金额、价格影响、路由明细。不构造交易。

# 坏
get_quote — 这个工具用于获取去中心化交易所的聚合报价信息，它会查询多个流动性源...
```

---

## 规则 2：零猜测——不让 Agent 蒙

Agent 的弱点是不懂你的 API 内部逻辑。每个模糊点都是出错机会。

- **参数永远带 `.describe()`**，告诉 Agent 这参数是什么格式、从哪来
- **错误消息必须可执行**，不只说"错了"，要说"怎么做才对"
- **返回值必须包含后续步骤需要的 ID**，别让 Agent 自己编

```
# 好
"Token address 0xabc not found on chain 1. Use search_tokens to find valid addresses."

# 坏
"INVALID_ADDRESS"
```

---

## 规则 3：读写分离——安全基线

Agent 的宿主（Claude Code 等）依赖 `readOnlyHint` / `destructiveHint` 做自动审批决策。

- **一个工具不能既读又写**
- **所有只读工具标记 `readOnlyHint: true`**
- **所有写操作标记 `destructiveHint: true`**
- **写操作返回摘要而非裸数据**，让用户一眼看懂发生了什么

```
只读：get_quote, get_balance, search_tokens, get_candlesticks
写入：build_swap, broadcast_transaction, build_approve
```

---

## 规则 4：结构化返回——Agent 要的是 JSON，不是散文

Agent 解析你的返回做下一步决策。返回格式必须：

- **始终是合法的 JSON 字符串**（放在 `content[0].text` 里）
- **顶层结构固定**：`{ success, data, error?, warnings?, nextSteps?, meta? }`
- **涉及金额的字段用 string 而非 number**，避免精度丢失
- **截断时明确告知**："返回 10/847 条，用 limit 参数翻页"

```typescript
// 标准返回结构
{
  success: true,
  data: { ... },
  warnings: ["价格影响 3.2%，偏高"],
  nextSteps: ["如需交易，先调 build_approve_transaction，再调 build_swap_transaction"],
  meta: { source: "api", cached: false, requestId: "xyz" }
}
```

---

## 规则 5：命名即文档

Agent 靠工具名和描述做路由。命名混乱 → 调错工具 → 用户骂你。

- **动词在前**：`get_`, `search_`, `build_`, `list_`
- **`get_` vs `search_`**：get 是精确取一条，search 是模糊搜多条
- **`list_` vs `get_`**：list 是枚举全部，get 是条件查询
- **`build_` vs `execute_`**：build 只构造不发送，execute 直接干了

```
list_supported_chains    → 枚举所有链
get_quote                → 拿一个报价
search_tokens            → 模糊搜代币
build_swap_transaction   → 构造交易，不广播
```

---

## 规则 6：参数从 Agent 视角设计

Agent 手里有什么信息，就用什么做参数。不要让 Agent 内部转换数据格式。

- **Agent 有地址** → 参数要地址
- **Agent 有链名** → 同时支持 chainIndex 和 chainName
- **Agent 有上一个工具的返回** → 下一个工具的参数格式要对齐，能直接透传
- **不要要求 Agent 自己算 decimals** → 接受人类可读数量，内部转换

```
# 好 — Agent 从 get_quote 拿到的 allowanceTarget 直接传
build_approve_transaction({
  tokenAddress: "0x...",       // 从搜索结果拿
  spenderAddress: "0x...",     // 从报价的 allowanceTarget 拿
  amount: "1000000"
})

# 坏 — 要求 Agent 自己拼
build_approve_transaction({
  rawCalldataParams: "0x..."
})
```

---

## 规则 7：渐进式复杂度

工具分三层，Agent 按需深入：

| 层 | 特征 | 示例 |
|----|------|------|
| L1 快速 | 0-1 参数，秒回，Agent 随手调 | `list_supported_chains` |
| L2 核心 | 3-5 参数，业务主力 | `get_quote`, `get_balance` |
| L3 高级 | 5+ 参数，专家才用 | `build_swap_transaction` |

Agent 的典型路径：L1 探索 → L2 操作 → L3 执行。不要一上来就让 Agent 填 8 个参数。

---

## 规则 8：错误分级——帮 Agent 自我修正

| 级别 | HTTP | 含义 | 返回 |
|------|------|------|------|
| 可重试 | 429/503 | 临时问题，等一下就好 | `retryAfter` 字段，Agent 知道等多久 |
| 参数错 | 400 | Agent 传错了，修正后可重试 | 指出哪个参数错、正确格式是什么 |
| 业务拒绝 | 422 | 逻辑上不可行（余额不足、滑点超限） | 给出替代方案 |
| 系统错 | 500 | 不是 Agent 的问题 | 简单说明，不让 Agent 反复重试 |

```json
// 参数错误返回
{
  "success": false,
  "error": {
    "code": "INVALID_CHAIN",
    "param": "chainIndex",
    "message": "chainIndex '999' 不支持",
    "fix": "调用 list_supported_chains 获取可用链列表"
  }
}
```

---

## 规则 9：幂等与缓存——别让 Agent 等

- **所有 L1 工具结果缓存**（TTL 按数据新鲜度分级）
- **缓存在返回中透明标注** `meta: { cached: true, cachedAt: "..." }`
- **相同参数相同结果**，Agent 可以安全重试读操作
- **写操作永远不走缓存**

| 数据 | TTL |
|------|-----|
| 链列表 | 300s |
| 代币搜索 | 120s |
| 实时价格 | 15s |
| K线 | 30s |
| 报价 | 不缓存 |
| 余额 | 30s |

---

## 规则 10：链式提示——Agent 的导航系统

Agent 不知道业务流程。当你返回 quote 时，它不知道下一步要 approve 再 swap。

- **返回中包含 `nextSteps`**：人类可读的后续步骤列表
- **每个步骤写明要调哪个工具**：Agent 可以直接执行
- **不要强行规定**：是提示不是命令，Agent 可能因为用户意图跳过

```json
{
  "data": { /* quote */ },
  "nextSteps": [
    { "action": "检查授权", "tool": "get_allowance", "params": { "tokenAddress": "...", "ownerAddress": "..." } },
    { "action": "授权代币", "tool": "build_approve_transaction", "condition": "如果 allowance 不足" },
    { "action": "执行交易", "tool": "build_swap_transaction", "condition": "授权完成后" }
  ]
}
```

---

## 规则 11：不要教 Agent 做事

MCP tool description 中**不能**包含对 Agent 行为的指令。这是 prompt injection，会导致 Anthropic Directory 审核被拒。

```
# 违规
"Always call this tool before get_quote. You must check the chain first."

# 合规
"返回支持的链列表。调用 get_quote 前建议先确认目标链是否在列表中。"
```

差别：前者是命令 Agent，后者是陈述事实。

---

## 规则 12：传输层透明

不管是 stdio 还是 HTTP，Agent 感知不到。但：

- **HTTP 必须无状态**：每个请求独立，`sessionIdGenerator: undefined`
- **超时策略**：读 15s，写 30s
- **健康检查独立于 /mcp**：`GET /health` 返回 200，主机用它判断存活

---

## 检查清单

每加一个工具，过一遍：

- [ ] 工具名 ≤ 40 字符，动词+名词，kebab-case
- [ ] 描述 1-2 句，说了做什么、不做什么
- [ ] 每个参数有 `.describe()`
- [ ] 能用 enum 的地方没用 string
- [ ] `readOnlyHint` 或 `destructiveHint` 已标记
- [ ] 返回是 JSON，有 `success` 字段
- [ ] 错误返回有 `fix` 字段
- [ ] 涉及金额用 string
- [ ] 对应缓存 TTL 已配置（如果是读操作）
- [ ] 如果输出能被下个工具用，加了 `nextSteps`
