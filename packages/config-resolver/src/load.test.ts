import { describe, expect, test } from "vitest";
import { CACHE_KEY, type StorageLike } from "./cache.js";
import { loadConfigs } from "./load.js";
import type { PathTarget } from "./paths.js";
import type { Fetcher } from "./runtime.js";

const homedir = () => "/home/test";

function fetcher(files: Readonly<Record<string, string>>): Fetcher {
  return {
    async fetch(target: PathTarget) {
      const key = target.kind === "local" ? target.path : target.url;
      const content = files[key];
      if (content === undefined) {
        throw new Error(`no such file: ${key}`);
      }
      return content;
    },
  };
}

function storage(
  initial: Readonly<Record<string, unknown>> = {},
): StorageLike & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(Object.entries(initial));
  return {
    data,
    async get(key) {
      return data.get(key);
    },
    async set(key, value) {
      data.set(key, value);
    },
  };
}

describe("loadConfigs", () => {
  test("When the fresh load succeeds then loadConfigs should return fresh and write the cache", async () => {
    const s = storage();
    const result = await loadConfigs(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      {
        storage: s,
        fetcher: fetcher({ "/a.yaml": "name: models\nconfig: {k: 1}" }),
        providers: {},
      },
    );
    expect(result.state).toBe("fresh");
    expect(Object.fromEntries(result.configs)).toEqual({ models: { k: 1 } });
    expect(s.data.size).toBe(1);
    expect(s.data.has(CACHE_KEY)).toBe(true);
  });

  test("When the fresh load fails but cache exists then loadConfigs should serve the cache", async () => {
    const s = storage();
    await loadConfigs(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      {
        storage: s,
        fetcher: fetcher({ "/a.yaml": "name: models\nconfig: original" }),
        providers: {},
      },
    );
    const result = await loadConfigs(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      { storage: s, fetcher: fetcher({}), providers: {} },
    );
    expect(result.state).toBe("cache");
    expect(result.configs.get("models")).toBe("original");
    expect(result.error).toBeDefined();
  });

  test("When the fresh load fails with no cache then loadConfigs should serve zero configs as failed", async () => {
    const result = await loadConfigs(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      { storage: storage(), fetcher: fetcher({}), providers: {} },
    );
    expect(result.state).toBe("failed");
    expect(result.configs.size).toBe(0);
    expect(result.error).toBeDefined();
  });

  test("When zero paths are given then loadConfigs should return fresh and write the empty cache", async () => {
    const s = storage({ "stale-key": "stale" });
    const result = await loadConfigs(
      [],
      { timeoutMs: 5000, homedir },
      {
        storage: s,
        fetcher: fetcher({}),
        providers: {},
      },
    );
    expect(result.state).toBe("fresh");
    expect(result.configs.size).toBe(0);
    expect(s.data.get(CACHE_KEY)).toEqual([]);
    expect(s.data.get("stale-key")).toBe("stale");
  });

  test("When a cached load is served then the cache entry should not be rewritten", async () => {
    const s = storage();
    await loadConfigs(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      {
        storage: s,
        fetcher: fetcher({ "/a.yaml": "name: models\nconfig: good" }),
        providers: {},
      },
    );
    const before = s.data.get(CACHE_KEY);
    await loadConfigs(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      { storage: s, fetcher: fetcher({}), providers: {} },
    );
    expect(s.data.get(CACHE_KEY)).toEqual(before);
  });
});
