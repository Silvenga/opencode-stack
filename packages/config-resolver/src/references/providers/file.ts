import { resolvePath } from "../../paths.js";
import type { Fetcher } from "../../runtime.js";
import type { ReferenceProvider } from "../scanner.js";

export function makeFileProvider(
  fetcher: Fetcher,
  timeoutMs: number,
  resolveHome: () => string | undefined,
): ReferenceProvider {
  return {
    resolve: async (input, base) => {
      if (base === undefined) {
        throw new Error(`file reference has no base to resolve against: ${input}`);
      }
      const isRemoteInput = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input);
      const target = isRemoteInput
        ? resolvePath(input, resolveHome)
        : base.kind === "remote"
          ? resolvePath(new URL(input, base.url).toString(), resolveHome)
          : resolvePath(
              input.startsWith("/") || input.startsWith("~")
                ? input
                : joinRelative(base.path, input),
              resolveHome,
            );
      return fetcher.fetch(target, AbortSignal.timeout(timeoutMs));
    },
  };
}

function joinRelative(configPath: string, input: string): string {
  const parent = configPath.replace(/\/[^/]*$/, "");
  return `${parent}/${input}`;
}
