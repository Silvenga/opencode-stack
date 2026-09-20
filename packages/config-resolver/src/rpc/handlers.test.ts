import { describe, expect, test } from "vitest";
import { makeHandlers } from "./handlers.js";

describe("makeHandlers", () => {
  test("When the named config exists then getConfig should return it", async () => {
    const handlers = makeHandlers({ state: "fresh", configs: new Map([["models", { a: 1 }]]) });
    await expect(handlers.getConfig({ name: "models" })).resolves.toEqual({ config: { a: 1 } });
  });

  test("When the named config does not exist then getConfig should return an empty object", async () => {
    const handlers = makeHandlers({ state: "fresh", configs: new Map() });
    await expect(handlers.getConfig({ name: "missing" })).resolves.toEqual({ config: {} });
  });

  test("When the state has no error then status should omit the error field", async () => {
    const handlers = makeHandlers({ state: "fresh", configs: new Map() });
    await expect(handlers.status()).resolves.toEqual({ state: "fresh" });
  });

  test("When the state has an error then status should include it", async () => {
    const handlers = makeHandlers({ state: "failed", configs: new Map(), error: "boom" });
    await expect(handlers.status()).resolves.toEqual({ state: "failed", error: "boom" });
  });
});
