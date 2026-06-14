# Onchain OS API 对接开发规范

> 基于 hvip MCP 代码标准 · 接收方：所有 AI 工程师
> 阅读本文后即可开始编写 Onchain OS MCP 工具

---

## 一、目录结构

```
onchainos-mcp/
  src/
    adapters/
      onchainos.ts      ← Onchain OS REST API 适配层
      onchainos-ws.ts   ← 如需：Onchain OS WebSocket 适配层
    tools/
      onchainos.ts      ← Onchain OS MCP 工具注册
```

---

## 二、9 字段描述模板（强制）

每个 `server.tool()` 的描述字符串必须包含以下 9 个字段，按顺序用 `\n## ` 分隔：

```typescript
"CAT:[分类名] | ## 功能：一句话描述\n
## 场景：用于xxx、xxx\n
## 关键词：xxx, xxx, xxx\n
## 参数：\n##   - paramName: 参数说明\n
## 鉴权：PUBLIC — 公开接口，不需要 API Key | ⚠️ 需要 API Key（只读）| ⚠️ 需要 API Key（交易）\n
## 风险：READ — 只读查询 | WRITE — 写操作\n
## 返回量：微小 ~2KB | 中等 ~10KB | 大 ~100KB\n
## 关联：前置工具 → 本工具 → 后续工具"
```

**9 个字段缺一不可：** `CAT:` | `功能` | `场景` | `关键词` | `参数` | `鉴权` | `风险` | `返回量` | `关联`

### 参考范例

```typescript
server.tool(
  "onchainos_get_price",
  "CAT:[链上-行情] | ## 功能：获取指定代币在多链上的实时价格\n## 场景：用于查询代币当前币价、多链比价、发现价差机会\n## 关键词：链上行情, 代币价格, onchain price, 多链\n## 参数：\n##   - chainId: 链ID。1=ETH, 56=BSC, 137=Polygon, 8453=Base\n##   - tokenAddress: 代币合约地址（必填）\n## 鉴权：PUBLIC — 公开接口，不需要 API Key\n## 风险：READ — 只读查询，Agent 可自动调用\n## 返回量：微小 ~1KB\n## 关联：onchainos_search_token 搜索代币 → 本工具查价 → onchainos_get_pool 看流动性",
  {
    chainId:      z.number().int().describe("链ID。1=ETH, 56=BSC, 137=Polygon, 8453=Base"),
    tokenAddress: z.string().describe("代币合约地址（必填）"),
  },
  async ({ chainId, tokenAddress }) => {
    try {
      const data = await onchainosApi.getPrice(chainId, tokenAddress)
      return toResult(data)
    } catch (e) { return toError(e) }
  }
)
```

---

## 三、CAT 分类名

Onchain OS 工具使用以下分类：

| CAT 标签 | 对应 API 模块 | 示例工具 |
|----------|-------------|---------|
| `[链上-行情]` | Market Price / Token / Index Price | getPrice, getTokenInfo |
| `[链上-Swap]` | DEX Swap / Quote / Bridge | getQuote, swap |
| `[链上-账户]` | Balance / Transaction History | getBalance, getTxHistory |
| `[链上-分析]` | Address Analysis / Portfolio | getPortfolio, getPnL |
| `[链上-信号]` | Signal / Leaderboard / Trenches | getSignals |
| `[链上-WS]` | WebSocket 实时频道 | subscribePrice |
| `[链上-网关]` | Onchain Gateway / Gas / Broadcast | simulate, broadcast |

---

## 四、适配器模板

### 4.1 公共接口（无需鉴权）

在 `src/adapters/onchainos.ts` 中：

```typescript
import crypto from "node:crypto"

const BASE = "https://web3.okx.com"

function timestamp(): string {
  return new Date().toISOString().replace(/(\.\d{3})\d*Z/, "$1Z")
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.append(k, String(v))
  }
  return p.size ? "?" + p.toString() : ""
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  options: {
    params?: Record<string, string | number | boolean | undefined>
    body?: unknown
    auth?: { apiKey: string; secret: string; passphrase: string }
  } = {}
): Promise<T> {
  const query = options.params ? buildQuery(options.params) : ""
  const fullPath = path + query
  const bodyStr = options.body ? JSON.stringify(options.body) : ""

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  }

  if (options.auth) {
    const ts = timestamp()
    const msg = ts + method + fullPath + bodyStr
    const sign = crypto.createHmac("sha256", options.auth.secret).update(msg).digest("base64")
    headers["OK-ACCESS-KEY"] = options.auth.apiKey
    headers["OK-ACCESS-SIGN"] = sign
    headers["OK-ACCESS-TIMESTAMP"] = ts
    headers["OK-ACCESS-PASSPHRASE"] = options.auth.passphrase
  }

  const res = await fetch(BASE + fullPath, {
    method, headers,
    ...(bodyStr ? { body: bodyStr } : {}),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const json = await res.json() as { code: string; msg?: string; data?: T }
  if (json.code !== "0") throw new Error(`OKX ${json.code}: ${json.msg ?? "unknown error"}`)
  return (json.data ?? json) as T
}

// ── 公共接口 ──────────────────────────────────────────────

export const onchainosApi = {
  // 行情价格
  getPrice: (chainId: number, tokenAddress: string) =>
    request<unknown>("GET", "/api/v6/dex/market/price", { params: { chainId, tokenAddress } }),

  // 搜索代币
  searchToken: (keyword: string) =>
    request<unknown[]>("GET", "/api/v6/dex/market/search", { params: { keyword } }),
}
```

### 4.2 鉴权接口

```typescript
export const onchainosPrivateApi = {
  // 余额查询
  getBalance: (auth: Auth, address: string, chainId: number) =>
    request<unknown[]>("GET", "/api/v6/dex/asset/balance", { params: { address, chainId }, auth }),

  // Swap 下单
  swap: (auth: Auth, body: Record<string, unknown>) =>
    request<unknown>("POST", "/api/v6/dex/swap", { body, auth }),
}
```

**规则：** 公开端点放 `onchainosApi`（无 `auth` 参数），鉴权端点放 `onchainosPrivateApi`（第一个参数是 `auth: Auth`）。

---

## 五、工具注册模板

每个工具文件导出一个注册函数：

```typescript
import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { onchainosApi, type Auth } from "../adapters/onchainos.js"
import { toResult, toError, AUTH_REQUIRED } from "./shared.js"

export function registerOnchainOSTools(server: McpServer, auth: Auth | null): void {

  server.tool(
    "onchainos_get_price",
    "CAT:[链上-行情] | ## 功能：...\n...\n## 关联：...",
    { /* Zod schema */ },
    async ({ /* params */ }) => {
      try {
        const data = await onchainosApi.getPrice(...)
        return toResult(data)
      } catch (e) { return toError(e) }
    }
  )
}
```

**注册到 `src/index.ts`：**

```typescript
import { registerOnchainOSTools } from "./tools/onchainos.js"
// 在 main() 中：
registerOnchainOSTools(server, auth)
```

---

## 六、强制规则

### 6.1 防幻觉（最重要）

**每个端点接之前必须 curl 验证，确认返回 200 真实数据再写代码。**

```bash
# 验证端点真实存在
curl -s "https://web3.okx.com/api/v6/dex/market/price?chainId=1&tokenAddress=0x..." \
  -H "OK-ACCESS-KEY: $OKX_API_KEY" \
  -H "OK-ACCESS-SIGN: ..." \
  -H "OK-ACCESS-TIMESTAMP: ..." \
  -H "OK-ACCESS-PASSPHRASE: ..."
```

**404 跳过，200 接。编造的端点直接拒。**

### 6.2 tsIso 时间戳

所有 `toResult()` 返回数据必须包含 `tsIso` 字段：

```typescript
return toResult({
  ...data,
  tsIso: new Date().toISOString(),
})
```

### 6.3 错误处理

```typescript
try {
  const data = await api.xxx()
  return toResult(data)
} catch (e) { return toError(e) }
```

### 6.4 枚举使用

产品类型参数使用 `INST_TYPE_*` 常量，禁止硬编码：

```typescript
// ✅ 正确
instType: z.enum(INST_TYPE_MARKET).describe("产品类型")

// ❌ 错误
instType: z.enum(["SPOT","SWAP","FUTURES"]).describe("产品类型")
```

### 6.5 分支命名

```
feat/onchainos-<feature>    新功能
fix/onchainos-<bug>         Bug 修复
task/onchainos-<编号>       任务池工单
```

### 6.6 提交之前

```bash
npm run build    # 必须通过
```

### 6.7 Tool 命名规范

```
onchainos_<模块>_<操作>
```

示例：
```
onchainos_market_price        — 行情价格
onchainos_token_search        — 搜索代币
onchainos_dex_quote           — DEX 报价
onchainos_balance_total       — 总余额
onchainos_swap_execute        — 执行 Swap
onchainos_ws_price_subscribe  — WS 价格订阅
```

---

## 七、审核检查清单

提交前自查，审核员也会逐项检查：

- [ ] `npm run build` 通过
- [ ] 9 字段描述完整（CAT / 功能 / 场景 / 关键词 / 参数 / 鉴权 / 风险 / 返回量 / 关联）
- [ ] 端点经 curl 验证存在（不是编的）
- [ ] `tsIso` 时间戳
- [ ] `toResult()` / `toError()` 错误处理
- [ ] `INST_TYPE_*` 枚举（如涉及产品类型）
- [ ] 公开端点放 `onchainosApi`，鉴权端点放 `onchainosPrivateApi`
- [ ] Tool 命名以 `onchainos_` 前缀
- [ ] CAT 分类标签正确
- [ ] 分支名符合规范
- [ ] 不修改无关文件

---

## 八、开发流程

```
1. 阅读本文档 + CLAUDE.md
2. 从 Onchain OS 文档选择要接的 API 模块
3. curl 验证端点
4. git checkout -b feat/onchainos-<模块>
5. 写 src/adapters/onchainos.ts + src/tools/onchainos.ts
6. npm run build
7. git push origin feat/onchainos-<模块>
8. 通知审核员（WS Hub 发 task:done）
9. 等待审核 → 通过后合并
```

---

## 九、参考示例

| 文件 | 参考价值 |
|------|---------|
| `src/tools/market.ts` | 9 字段描述模板 |
| `src/adapters/okx.ts` | `publicApi` / `privateApi` 适配器模式 |
| `src/tools/shared.ts` | `toResult` / `toError` / `AUTH_REQUIRED` / `INST_TYPE_*` |
| `CLAUDE.md` | 项目架构 + 开发规范 |
| `CONTRIBUTING.md` | 分支协作流程 |
| `docs/OKX-MCP-防幻觉对接SOP-v1.0.md` | 防幻觉标准操作流程 |
