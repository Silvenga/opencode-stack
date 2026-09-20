import { describe, expect, test } from "vitest";
import { CACHE_KEY, readCache, writeCache } from "./cache.js";
import type { StorageLike } from "./cache.js";

function memoryStorage(): StorageLike & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
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

describe("cache key", () => {
  test("When any load is written then the storage should hold exactly one entry at the fixed key", async () => {
    const storage = memoryStorage();
    await writeCache(storage, new Map([["models", 1]]));
    await writeCache(storage, new Map([["agents", 2]]));
    expect(storage.data.size).toBe(1);
    expect(storage.data.has(CACHE_KEY)).toBe(true);
  });
});

describe("cache roundtrip", () => {
  test("When a map is written then readCache should return an equal map", async () => {
    const storage = memoryStorage();
    const configs = new Map([
      ["models", { a: 1 }],
      ["agents", ["x", "y"]],
    ]);
    await writeCache(storage, configs);
    const read = await readCache(storage);
    expect(read).toEqual(configs);
  });

  test("When an empty map is written then readCache should return an empty map", async () => {
    const storage = memoryStorage();
    await writeCache(storage, new Map());
    const read = await readCache(storage);
    expect(read).toEqual(new Map());
  });

  test("When a second load overwrites the first then readCache should return the latest", async () => {
    const storage = memoryStorage();
    await writeCache(storage, new Map([["models", "old"]]));
    await writeCache(storage, new Map([["agents", "new"]]));
    const read = await readCache(storage);
    expect(Object.fromEntries(read ?? [])).toEqual({ agents: "new" });
  });

  test("When nothing was written then readCache should return undefined", async () => {
    const storage = memoryStorage();
    expect(await readCache(storage)).toBeUndefined();
  });

  test("When the cached value is corrupt then readCache should return undefined", async () => {
    const storage = memoryStorage();
    storage.data.set(CACHE_KEY, "not-a-map");
    expect(await readCache(storage)).toBeUndefined();
  });

  test("When the cached value contains non-object entries then readCache should return undefined", async () => {
    const storage = memoryStorage();
    storage.data.set(CACHE_KEY, [["name", 1], "corrupt-entry"]);
    expect(await readCache(storage)).toBeUndefined();
  });

  test("When storage get throws then readCache should return undefined", async () => {
    const storage: StorageLike = {
      async get() {
        throw new Error("storage broken");
      },
      async set() {},
    };
    expect(await readCache(storage)).toBeUndefined();
  });
});
