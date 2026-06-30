/**
 * Market 模块 — CAT:[链上-行情]
 * 行情价格: supported_chain + price + trades + candles + historical_candles
 * ⚠️ x402 付费接口 — 需钱包持有 X Layer 上 USDG/USDT0 并 EIP-3009 签名
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { marketApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerMemepumpTools(server: McpServer, auth: Auth | null): void {

  // ── Memepump / 扫链 ─────────────────────────────

  server.tool("onchainos_memepump_supported",
    "链上-行情 | 获取扫链支持的链和协议【场景:查Meme扫链支持哪些链/协议】",
    {},
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSupported(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_list",
    "链上-行情 | 筛选 Meme 代币(30+维度)【场景:扫新币/查Meme代币列表】",
    {
      chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"),
      stage: z.enum(["NEW","MIGRATING","MIGRATED"]).describe("代币阶段"),
      protocolIdList: z.string().optional().describe("协议ID, 逗号分隔"),
      walletAddress: z.string().optional().describe("用户钱包地址"),
    },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, stage, ...rest }) => {
      if(!auth) return AUTH_REQUIRED("READ");
      try {
        const q: Record<string,string|boolean|undefined>={chainIndex,stage}; for (const [k,v] of Object.entries(rest)) if (v!==undefined) q[k]=String(v);
        return toResult(await marketApi.memepumpTokenList(auth, q), {
          nextSteps: [
            { action: "查看某代币的详细扫链信息", tool: "onchainos_memepump_token_details", params: { chainIndex: "{{取自列表的 chainIndex}}", tokenContractAddress: "{{取列表中的 tokenContractAddress}}" } },
            { action: "对发现的代币做风险检测", tool: "onchainos_skill_risk_detect", condition: "发现新代币后建议做安全扫描" },
          ],
        });
      } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_details",
    "链上-行情 | 单一代币扫链详情【场景:查Meme代币详细数据】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''"), walletAddress: z.string().optional().describe("查用户持仓") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, walletAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDetails(auth, chainIndex, tokenContractAddress, walletAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_token_dev_info",
    "链上-行情 | 获取开发者信息(发币数/RugPull/持仓)【场景:查代币开发者/有没有Rug历史】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpTokenDevInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_similar_token",
    "链上-行情 | 查找相似代币【场景:找相似Meme代币】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpSimilarToken(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_bundle_info",
    "链上-行情 | 检测打包交易(bundler占比)【场景:检测有没有打包/老鼠仓】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpBundleInfo(auth, chainIndex, tokenContractAddress)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_memepump_aped_wallet",
    "链上-行情 | 获取同车钱包列表(含PnL)【场景:查一起买入的钱包/同车地址】",
    { chainIndex: z.string().describe("链ID(字符串)。常见值: '1'=ETH '56'=BSC '8453'=Base '501'=Solana '42161'=Arbitrum。40+链, 不确定调 supported_chain"), tokenContractAddress: z.string().describe("代币合约地址(小写)。主链币传空字符串 ''"), walletAddress: z.string().optional().describe("指定钱包") },
    { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
    async ({ chainIndex, tokenContractAddress, walletAddress }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await marketApi.memepumpApedWallet(auth, chainIndex, tokenContractAddress, walletAddress)); } catch(e) { return toError(e); } },
  );

}
