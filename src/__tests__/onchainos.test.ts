import { describe, it, expect } from "vitest";
import { balanceApi, gatewayApi, postTxApi, defiApi, paymentsApi, tradeApi, intentApi, marketApi } from "../adapters/onchainos.js";

describe("onchainos adapter — exports", () => {
  const apis: [string, Record<string, unknown>][] = [
    ["balanceApi", balanceApi],
    ["gatewayApi", gatewayApi],
    ["postTxApi", postTxApi],
    ["defiApi", defiApi],
    ["paymentsApi", paymentsApi],
    ["tradeApi", tradeApi],
    ["intentApi", intentApi],
    ["marketApi", marketApi],
  ];

  for (const [name, api] of apis) {
    it(`${name} is defined and has methods`, () => {
      expect(api).toBeDefined();
      expect(typeof api).toBe("object");
      expect(Object.keys(api).length).toBeGreaterThan(0);
    });
  }

  it("all API methods are functions", () => {
    for (const [, api] of apis) {
      for (const [key, val] of Object.entries(api)) {
        expect(typeof val).toBe("function");
      }
    }
  });

  // 验证关键API方法存在
  const expected: [string, string[]][] = [
    ["balanceApi", ["supportedChain", "totalValue", "allTokenBalances", "specificTokenBalance"]],
    ["gatewayApi", ["supportedChain", "gasPrice", "gasLimit", "simulate", "broadcast"]],
    ["tradeApi", ["supportedChain", "allTokens", "liquidity", "quote", "approveTransaction", "swap", "swapInstruction", "swapHistory"]],
    ["defiApi", ["supportedChains", "supportedPlatforms", "searchProducts", "productDetail", "enter", "exit", "claim", "userPlatformList"]],
    ["paymentsApi", ["create", "detail", "submit", "status", "supported"]],
    ["intentApi", ["orderList", "createOrder", "orderStatus", "cancelSignData", "cancelOrder", "auctionInfo"]],
    ["marketApi", ["supportedChain", "price", "candles", "historicalCandles", "trades"]],
    ["postTxApi", ["transactionDetail", "orders"]],
  ];

  for (const [name, methods] of expected) {
    const api = apis.find(([n]) => n === name)![1];
    for (const m of methods) {
      it(`${name}.${m}() is a function`, () => {
        expect(typeof (api as Record<string, unknown>)[m]).toBe("function");
      });
    }
  }
});
