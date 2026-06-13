/**
 * DeFi 模块 — CAT:[链上-Swap]
 * 投资品查询/计算/交易/用户持仓 (v5)
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defiApi } from "../adapters/onchainos.js";
import { toResult, toError, AUTH_REQUIRED } from "../adapters/shared.js";
import type { Auth } from "../adapters/shared.js";

export function registerDefiTools(server: McpServer, auth: Auth | null): void {

  // ═════════════════════════════════════════════════════════
  // 6.1 探索 (5)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_defi_protocol_list",
    "CAT:[链上-Swap] | ## 功能：获取DeFi协议列表\n## 场景：发现DeFi协议\n## 关键词：DeFi, protocol, 协议\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：本工具协议列表 → onchainos_defi_token_list 支持的代币",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.protocolList(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_token_list",
    "CAT:[链上-Swap] | ## 功能：获取DeFi支持的代币列表\n## 场景：查看DeFi可投代币\n## 关键词：DeFi, token, 代币\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_defi_protocol_list → 本工具 → onchainos_defi_product_list",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.tokenList(auth)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_product_list",
    "CAT:[链上-Swap] | ## 功能：获取DeFi投资产品列表\n## 场景：搜索投资产品\n## 关键词：DeFi, product, 投资品\n## 参数：\n##   - query: 查询条件（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_defi_token_list → 本工具产品列表 → onchainos_defi_product_detail 详情",
    { query: z.string().describe("查询条件（JSON字符串）") },
    { readOnlyHint: true },
    async ({ query }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(query); } catch { b = {}; } return toResult(await defiApi.productList(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_product_detail",
    "CAT:[链上-Swap] | ## 功能：获取DeFi产品详情\n## 场景：查看投资品具体信息（APY/TVL等）\n## 关键词：DeFi, 产品详情, APY, TVL\n## 参数：\n##   - investmentId: 投资品ID\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_defi_product_list → 本工具详情 → onchainos_defi_subscribe_info 申购估算",
    { investmentId: z.string().describe("投资品ID") },
    { readOnlyHint: true },
    async ({ investmentId }) => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.productDetail(auth, investmentId)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_network_list",
    "CAT:[链上-Swap] | ## 功能：获取DeFi支持的网络列表\n## 场景：查看DeFi覆盖的链\n## 关键词：DeFi, network, 网络\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：本工具网络列表 → onchainos_defi_product_list 产品",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.networkList(auth)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 6.2 计算 (2)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_defi_subscribe_info",
    "CAT:[链上-Swap] | ## 功能：估算DeFi申购的预期收益\n## 场景：申购前查看预期收益\n## 关键词：DeFi, subscribe, 申购, 估算\n## 参数：\n##   - calcData: 计算参数（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_defi_product_detail → 本工具估算 → onchainos_defi_subscription 申购",
    { calcData: z.string().describe("计算参数（JSON字符串）") },
    { readOnlyHint: true },
    async ({ calcData }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(calcData); } catch { b = {}; } return toResult(await defiApi.subscribeInfo(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_redeem_info",
    "CAT:[链上-Swap] | ## 功能：估算DeFi赎回信息\n## 场景：赎回前查看预期结果\n## 关键词：DeFi, redeem, 赎回, 估算\n## 参数：\n##   - calcData: 计算参数（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~1KB\n## 关联：onchainos_defi_user_platform_list → 本工具估算 → onchainos_defi_redemption 赎回",
    { calcData: z.string().describe("计算参数（JSON字符串）") },
    { readOnlyHint: true },
    async ({ calcData }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(calcData); } catch { b = {}; } return toResult(await defiApi.redeemInfo(auth, b)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 6.3 交易 (4)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_defi_authorization",
    "CAT:[链上-Swap] | ## 功能：生成DeFi交易的授权calldata\n## 场景：申购/赎回前授权\n## 关键词：DeFi, authorization, 授权\n## 参数：\n##   - txData: 交易参数（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造授权\n## 返回量：微小 ~2KB\n## 关联：onchainos_defi_subscribe_info → 本工具授权 → onchainos_defi_subscription",
    { txData: z.string().describe("交易参数（JSON字符串）") },
    { destructiveHint: true },
    async ({ txData }) => { if(!auth) return AUTH_REQUIRED("TRADE"); try { let b: Record<string, unknown>; try { b = JSON.parse(txData); } catch { b = {}; } return toResult(await defiApi.authorization(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_subscription",
    "CAT:[链上-Swap] | ## 功能：生成DeFi申购交易calldata\n## 场景：执行DeFi申购\n## 关键词：DeFi, subscription, 申购\n## 参数：\n##   - txData: 交易参数（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造申购\n## 返回量：微小 ~2KB\n## 关联：onchainos_defi_authorization → 本工具申购 → onchainos_gateway_broadcast",
    { txData: z.string().describe("交易参数（JSON字符串）") },
    { destructiveHint: true },
    async ({ txData }) => { if(!auth) return AUTH_REQUIRED("TRADE"); try { let b: Record<string, unknown>; try { b = JSON.parse(txData); } catch { b = {}; } return toResult(await defiApi.subscription(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_redemption",
    "CAT:[链上-Swap] | ## 功能：生成DeFi赎回交易calldata\n## 场景：执行DeFi赎回\n## 关键词：DeFi, redemption, 赎回\n## 参数：\n##   - txData: 交易参数（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 构造赎回\n## 返回量：微小 ~2KB\n## 关联：onchainos_defi_redeem_info → 本工具赎回 → onchainos_gateway_broadcast",
    { txData: z.string().describe("交易参数（JSON字符串）") },
    { destructiveHint: true },
    async ({ txData }) => { if(!auth) return AUTH_REQUIRED("TRADE"); try { let b: Record<string, unknown>; try { b = JSON.parse(txData); } catch { b = {}; } return toResult(await defiApi.redemption(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_bonus",
    "CAT:[链上-Swap] | ## 功能：生成领取DeFi奖励的calldata\n## 场景：领取DeFi协议奖励\n## 关键词：DeFi, bonus, 奖励, claim\n## 参数：\n##   - txData: 交易参数（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（交易）\n## 风险：WRITE — 领取奖励\n## 返回量：微小 ~2KB\n## 关联：onchainos_defi_user_platform_list → 本工具领奖 → onchainos_gateway_broadcast",
    { txData: z.string().describe("交易参数（JSON字符串）") },
    { destructiveHint: true },
    async ({ txData }) => { if(!auth) return AUTH_REQUIRED("TRADE"); try { let b: Record<string, unknown>; try { b = JSON.parse(txData); } catch { b = {}; } return toResult(await defiApi.bonus(auth, b)); } catch(e) { return toError(e); } },
  );

  // ═════════════════════════════════════════════════════════
  // 6.4 用户持仓 (5)
  // ═════════════════════════════════════════════════════════

  server.tool("onchainos_defi_user_platform_list",
    "CAT:[链上-Swap] | ## 功能：查询用户在DeFi协议的持仓平台列表\n## 场景：查看DeFi持仓\n## 关键词：DeFi, 持仓, platform\n## 参数：\n##   - query: 查询条件（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_defi_product_list → 本工具查持仓",
    { query: z.string().describe("查询条件（JSON字符串）") },
    { readOnlyHint: true },
    async ({ query }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(query); } catch { b = {}; } return toResult(await defiApi.userPlatformList(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_user_platform_detail",
    "CAT:[链上-Swap] | ## 功能：查询用户在特定协议的持仓详情\n## 场景：查看DeFi持仓明细\n## 关键词：DeFi, 持仓详情, platform\n## 参数：\n##   - query: 查询条件（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~30KB\n## 关联：onchainos_defi_user_platform_list → 本工具详情",
    { query: z.string().describe("查询条件（JSON字符串）") },
    { readOnlyHint: true },
    async ({ query }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(query); } catch { b = {}; } return toResult(await defiApi.userPlatformDetail(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_user_asset_detail",
    "CAT:[链上-Swap] | ## 功能：查询用户DeFi投资品持仓详情\n## 场景：查看具体投资品的持仓\n## 关键词：DeFi, asset, 投资品\n## 参数：\n##   - query: 查询条件（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：微小 ~2KB\n## 关联：onchainos_defi_user_platform_detail → 本工具投资品详情",
    { query: z.string().describe("查询条件（JSON字符串）") },
    { readOnlyHint: true },
    async ({ query }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(query); } catch { b = {}; } return toResult(await defiApi.userAssetDetail(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_user_balance_list",
    "CAT:[链上-Swap] | ## 功能：查询用户DeFi余额列表\n## 场景：查看DeFi持仓余额\n## 关键词：DeFi, balance, 余额\n## 参数：\n##   - query: 查询条件（JSON字符串）\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_defi_user_platform_list → 本工具余额",
    { query: z.string().describe("查询条件（JSON字符串）") },
    { readOnlyHint: true },
    async ({ query }) => { if(!auth) return AUTH_REQUIRED("READ"); try { let b: Record<string, unknown>; try { b = JSON.parse(query); } catch { b = {}; } return toResult(await defiApi.userBalanceList(auth, b)); } catch(e) { return toError(e); } },
  );

  server.tool("onchainos_defi_user_unstake_list",
    "CAT:[链上-Swap] | ## 功能：查询用户赎回申请列表\n## 场景：查看赎回进度\n## 关键词：DeFi, unstake, 赎回, 列表\n## 参数：无\n## 鉴权：⚠️ 需要 API Key（只读）\n## 风险：READ — 只读查询\n## 返回量：中等 ~10KB\n## 关联：onchainos_defi_redemption → 本工具查看赎回列表",
    {}, { readOnlyHint: true },
    async () => { if(!auth) return AUTH_REQUIRED("READ"); try { return toResult(await defiApi.userUnstakeList(auth)); } catch(e) { return toError(e); } },
  );
}
