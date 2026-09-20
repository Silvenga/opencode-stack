export interface StorageLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export const CACHE_KEY = "cache";

export async function readCache(storage: StorageLike): Promise<Map<string, unknown> | undefined> {
  try {
    const value = await storage.get(CACHE_KEY);
    if (!Array.isArray(value)) {
      return undefined;
    }
    const configs = new Map<string, unknown>();
    for (const entry of value) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string") {
        return undefined;
      }
      configs.set(entry[0], entry[1]);
    }
    return configs;
  } catch {
    return undefined;
  }
}

export async function writeCache(
  storage: StorageLike,
  configs: ReadonlyMap<string, unknown>,
): Promise<void> {
  await storage.set(CACHE_KEY, [...configs.entries()]);
}
