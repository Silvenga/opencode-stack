import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import type { PathTarget } from "./paths.js";

export interface Fetcher {
  fetch(target: PathTarget, signal: AbortSignal): Promise<string>;
}

export const nodeFetcher: Fetcher = {
  fetch: async (target, signal) => {
    if (target.kind === "local") {
      return readFile(target.path, { encoding: "utf8", signal });
    }
    const response = await fetch(target.url, { signal });
    if (!response.ok) {
      throw new Error(`fetch failed with status ${response.status}: ${target.url}`);
    }
    return response.text();
  },
};

export function osHomedir(): string | undefined {
  const home = homedir();
  return home.length === 0 ? undefined : home;
}

export function readProcessEnv(name: string): string | undefined {
  return process.env[name];
}
