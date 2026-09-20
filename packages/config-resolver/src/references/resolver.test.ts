import { describe, expect, test } from "vitest";
import type { PathTarget } from "../paths.js";
import type { Fetcher } from "../runtime.js";
import { resolveAll } from "./resolver.js";

const homedir = () => "/home/test";

function fetcher(
  files: Readonly<Record<string, string>>,
  delays: Readonly<Record<string, number>> = {},
): Fetcher & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetch(target: PathTarget, signal: AbortSignal) {
      const key = target.kind === "local" ? target.path : target.url;
      calls.push(key);
      const delay = delays[key] ?? 0;
      if (delay > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("aborted"));
            },
            { once: true },
          );
        });
      }
      const content = files[key];
      if (content === undefined) {
        throw new Error(`no such file: ${key}`);
      }
      return content;
    },
  };
}

const noProviders = {};

describe("resolveAll happy paths", () => {
  test("When zero paths are given then resolveAll should return fresh with zero configs", async () => {
    const result = await resolveAll(
      [],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: noProviders },
    );
    expect(result.state).toBe("fresh");
    expect(result.configs.size).toBe(0);
    expect(result.error).toBeUndefined();
  });

  test("When one local path has one document then resolveAll should return it", async () => {
    const f = fetcher({ "/a.yaml": "name: models\nconfig: {k: v}" });
    const result = await resolveAll(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.state).toBe("fresh");
    expect(Object.fromEntries(result.configs)).toEqual({ models: { k: "v" } });
  });

  test("When duplicate names span paths then resolveAll should keep the later path's config", async () => {
    const f = fetcher({
      "/first.yaml": "name: dup\nconfig: from-first",
      "/second.yaml": "name: dup\nconfig: from-second",
    });
    const result = await resolveAll(
      ["/first.yaml", "/second.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.configs.get("dup")).toBe("from-second");
  });

  test("When the later path loads first then merge order should still follow the paths array", async () => {
    const f = fetcher(
      {
        "/first.yaml": "name: dup\nconfig: from-first",
        "/second.yaml": "name: dup\nconfig: from-second",
      },
      { "/first.yaml": 20, "/second.yaml": 0 },
    );
    const result = await resolveAll(
      ["/first.yaml", "/second.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.configs.get("dup")).toBe("from-second");
  });

  test("When paths mix local and remote then resolveAll should fetch both", async () => {
    const f = fetcher({
      "/local.yaml": "name: a\nconfig: 1",
      "https://example.com/r.yaml": "name: b\nconfig: 2",
    });
    const result = await resolveAll(
      ["/local.yaml", "https://example.com/r.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(Object.fromEntries(result.configs)).toEqual({ a: 1, b: 2 });
  });
});

describe("resolveAll failures", () => {
  test("When any path fails then resolveAll should return failed with the error", async () => {
    const f = fetcher({ "/good.yaml": "name: a\nconfig: 1" });
    const result = await resolveAll(
      ["/good.yaml", "/missing.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.state).toBe("failed");
    expect(result.configs.size).toBe(0);
    expect(result.error).toMatch(/missing/);
  });

  test("When several paths fail then the error should be the first in paths order", async () => {
    const f = fetcher({});
    const result = await resolveAll(
      ["/b-missing.yaml", "/a-missing.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.error).toMatch(/b-missing/);
  });

  test("When a document is invalid then resolveAll should fail the whole load", async () => {
    const f = fetcher({
      "/good.yaml": "name: a\nconfig: 1",
      "/bad.yaml": "config: {missing: name}",
    });
    const result = await resolveAll(
      ["/good.yaml", "/bad.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/name/);
  });

  test("When a path is empty then resolveAll should fail", async () => {
    const result = await resolveAll(
      [""],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: noProviders },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/empty/);
  });

  test("When a path is relative then resolveAll should fail", async () => {
    const result = await resolveAll(
      ["./config.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: noProviders },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/absolute/);
  });

  test("When a path uses an unsupported scheme then resolveAll should fail", async () => {
    const result = await resolveAll(
      ["ftp://example.com/f.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: noProviders },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/scheme/);
  });

  test("When a fetch exceeds the timeout then resolveAll should fail", async () => {
    const f = fetcher({ "/slow.yaml": "name: a\nconfig: 1" }, { "/slow.yaml": 100 });
    const result = await resolveAll(
      ["/slow.yaml"],
      { timeoutMs: 10, homedir },
      { fetcher: f, providers: noProviders },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/timed out/i);
  });

  test("When a path is valid but references fail then resolveAll should fail", async () => {
    const f = fetcher({ "/a.yaml": "name: a\nconfig:\n  prompt: $(file:missing)" });
    const result = await resolveAll(
      ["/a.yaml"],
      { timeoutMs: 5000, homedir },
      {
        fetcher: f,
        providers: { file: { resolve: () => Promise.reject(new Error("missing file")) } },
      },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/missing file/);
  });
});

describe("resolveAll reference base resolution", () => {
  test("When a remote config references a relative file then the base should be the config URL", async () => {
    const seen: string[] = [];
    const f = fetcher({
      "https://example.com/path/top.yaml": "name: a\nconfig:\n  prompt: $(file:relative.txt)",
    });
    const result = await resolveAll(
      ["https://example.com/path/top.yaml"],
      { timeoutMs: 5000, homedir },
      {
        fetcher: f,
        providers: {
          file: {
            resolve: async (input, base) => {
              if (base?.kind !== "remote") {
                throw new Error("expected remote base");
              }
              seen.push(new URL(input, base.url).toString());
              return `content of ${input}`;
            },
          },
        },
      },
    );
    expect(seen).toEqual(["https://example.com/path/relative.txt"]);
    expect(result.state).toBe("fresh");
  });
});

describe("resolveAll path entry references", () => {
  const env = (values: Readonly<Record<string, string>>) => ({
    env: {
      resolve: async (input: string) => {
        const value = values[input];
        if (value === undefined) {
          throw new Error(`environment variable is not set: ${input}`);
        }
        return value;
      },
    },
  });

  test("When a path entry uses an env reference then resolveAll should resolve then classify it", async () => {
    const f = fetcher({ "/srv/config.yaml": "name: a\nconfig: 1" });
    const result = await resolveAll(
      ["$(env:CONFIG_DIR)/config.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: env({ CONFIG_DIR: "/srv" }) },
    );
    expect(result.state).toBe("fresh");
    expect(Object.fromEntries(result.configs)).toEqual({ a: 1 });
  });

  test("When an env reference in a path entry is unset then resolveAll should fail", async () => {
    const result = await resolveAll(
      ["$(env:MISSING)/config.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: env({}) },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/MISSING/);
  });

  test("When a path entry uses a file reference then resolveAll should fail because there is no base", async () => {
    const f = fetcher({ "/srv/config.yaml": "name: a\nconfig: 1" });
    const result = await resolveAll(
      ["$(file:/srv/config.yaml)"],
      { timeoutMs: 5000, homedir },
      {
        fetcher: f,
        providers: {
          file: {
            resolve: async (input, base) => {
              if (base === undefined) {
                throw new Error("file reference has no base to resolve against");
              }
              return input;
            },
          },
        },
      },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/no base/);
  });

  test("When an env reference yields a relative path then resolveAll should fail after resolution", async () => {
    const result = await resolveAll(
      ["$(env:REL)"],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: env({ REL: "./config.yaml" }) },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/absolute/);
  });

  test("When an env reference yields an empty string then resolveAll should fail after resolution", async () => {
    const result = await resolveAll(
      ["$(env:EMPTY)"],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: env({ EMPTY: "" }) },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/empty/);
  });

  test("When several path entries have failing references then the first in order should be reported", async () => {
    const result = await resolveAll(
      ["$(env:FIRST)/x.yaml", "$(env:SECOND)/y.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: fetcher({}), providers: env({ SECOND: "/ok" }) },
    );
    expect(result.state).toBe("failed");
    expect(result.error).toMatch(/FIRST/);
  });

  test("When a path entry escapes a dollar then the literal result should still classify", async () => {
    const f = fetcher({ "/opt/$pecial/config.yaml": "name: a\nconfig: 1" });
    const result = await resolveAll(
      ["/opt/$pecial/config.yaml"],
      { timeoutMs: 5000, homedir },
      { fetcher: f, providers: env({}) },
    );
    expect(result.state).toBe("fresh");
    expect(f.calls).toEqual(["/opt/$pecial/config.yaml"]);
  });
});
