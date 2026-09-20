import { readCache, writeCache, type StorageLike } from "./cache.js";
import { resolveAll, type ResolveState } from "./references/resolver.js";
import type { ReferenceProvider } from "./references/scanner.js";
import type { Fetcher } from "./runtime.js";

export interface ResolvedState {
  readonly state: ResolveState;
  readonly configs: ReadonlyMap<string, unknown>;
  readonly error?: string;
}

export async function loadConfigs(
  paths: ReadonlyArray<string>,
  options: { readonly timeoutMs: number; readonly homedir: () => string | undefined },
  deps: {
    readonly storage: StorageLike;
    readonly fetcher: Fetcher;
    readonly providers: Readonly<Record<string, ReferenceProvider>>;
  },
): Promise<ResolvedState> {
  const resolved = await resolveAll(paths, options, deps);
  if (resolved.state === "fresh") {
    await writeCache(deps.storage, resolved.configs);
    return resolved;
  }
  const cached = await readCache(deps.storage);
  if (cached !== undefined) {
    return { state: "cache", configs: cached, error: resolved.error };
  }
  return resolved;
}
