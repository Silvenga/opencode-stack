import { parseDocuments } from "../documents.js";
import { resolvePath, type PathTarget } from "../paths.js";
import type { Fetcher } from "../runtime.js";
import { resolveReferences, type ReferenceProvider } from "./scanner.js";

export type ResolveState = "fresh" | "cache" | "failed";

export interface ResolvedConfigs {
  readonly state: ResolveState;
  readonly configs: ReadonlyMap<string, unknown>;
  readonly error?: string;
}

export async function resolveAll(
  paths: ReadonlyArray<string>,
  options: { readonly timeoutMs: number; readonly homedir: () => string | undefined },
  deps: {
    readonly fetcher: Fetcher;
    readonly providers: Readonly<Record<string, ReferenceProvider>>;
  },
): Promise<ResolvedConfigs> {
  const configs = new Map<string, unknown>();
  try {
    const entries: string[] = [];
    for (const path of paths) {
      const resolved = (await resolveReferences(path, deps.providers, undefined)) as string;
      entries.push(resolved);
    }
    const targets = entries.map((entry) => resolvePath(entry, options.homedir));
    const loaded = await Promise.all(
      targets.map(async (target) => {
        const yaml = await fetchWithTimeout(target, options.timeoutMs, deps.fetcher);
        const documents = parseDocuments(yaml);
        const resolved = await Promise.all(
          documents.map(async (document) => ({
            name: document.name,
            config: await resolveReferences(document.config, deps.providers, target),
          })),
        );
        return resolved;
      }),
    );
    for (const pathDocuments of loaded) {
      for (const document of pathDocuments) {
        configs.set(document.name, document.config);
      }
    }
    return { state: "fresh", configs };
  } catch (error) {
    return {
      state: "failed",
      configs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchWithTimeout(
  target: PathTarget,
  timeoutMs: number,
  fetcher: Fetcher,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher.fetch(target, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `fetch timed out after ${timeoutMs}ms: ${target.kind === "local" ? target.path : target.url}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
