import { describe, expect, test } from "vitest";
import type { PathTarget } from "../../paths.js";
import type { Fetcher } from "../../runtime.js";
import { makeFileProvider } from "./file.js";

const resolveHome = () => "/home/test";

function fetcher(files: Readonly<Record<string, string>>): Fetcher & { calls: PathTarget[] } {
  const calls: PathTarget[] = [];
  return {
    calls,
    async fetch(target) {
      calls.push(target);
      const key = target.kind === "local" ? target.path : target.url;
      const content = files[key];
      if (content === undefined) {
        throw new Error(`no such file: ${key}`);
      }
      return content;
    },
  };
}

describe("makeFileProvider", () => {
  test("When input is relative to a local base then makeFileProvider should join the parent directory", async () => {
    const f = fetcher({ "/base/dir/inner.txt": "inner content" });
    const provider = makeFileProvider(f, 5000, resolveHome);
    await expect(
      provider.resolve("inner.txt", { kind: "local", path: "/base/dir/top.yaml" }),
    ).resolves.toBe("inner content");
  });

  test("When input is relative to a remote base then makeFileProvider should resolve against the URL", async () => {
    const f = fetcher({ "https://example.com/path/inner.txt": "remote content" });
    const provider = makeFileProvider(f, 5000, resolveHome);
    await expect(
      provider.resolve("inner.txt", { kind: "remote", url: "https://example.com/path/top.yaml" }),
    ).resolves.toBe("remote content");
  });

  test("When input is absolute then makeFileProvider should fetch it directly", async () => {
    const f = fetcher({ "/abs/file.txt": "abs content" });
    const provider = makeFileProvider(f, 5000, resolveHome);
    await expect(
      provider.resolve("/abs/file.txt", { kind: "local", path: "/base/top.yaml" }),
    ).resolves.toBe("abs content");
  });

  test("When input is a URL then makeFileProvider should fetch it remotely", async () => {
    const f = fetcher({ "https://cdn.example.com/file.txt": "cdn content" });
    const provider = makeFileProvider(f, 5000, resolveHome);
    await expect(
      provider.resolve("https://cdn.example.com/file.txt", {
        kind: "local",
        path: "/base/top.yaml",
      }),
    ).resolves.toBe("cdn content");
  });

  test("When input starts with tilde then makeFileProvider should expand home", async () => {
    const f = fetcher({ "/home/test/conf/x.txt": "home content" });
    const provider = makeFileProvider(f, 5000, resolveHome);
    await expect(
      provider.resolve("~/conf/x.txt", { kind: "local", path: "/base/top.yaml" }),
    ).resolves.toBe("home content");
  });

  test("When the file is missing then makeFileProvider should fail", async () => {
    const provider = makeFileProvider(fetcher({}), 5000, resolveHome);
    await expect(
      provider.resolve("missing.txt", { kind: "local", path: "/base/top.yaml" }),
    ).rejects.toThrow(/no such file/);
  });

  test("When there is no base then makeFileProvider should fail without fetching", async () => {
    const f = fetcher({ "/abs/file.txt": "content" });
    const provider = makeFileProvider(f, 5000, resolveHome);
    await expect(provider.resolve("/abs/file.txt", undefined)).rejects.toThrow(
      /file.*base|base.*file/i,
    );
    expect(f.calls.length).toBe(0);
  });

  test("When input is relative with no base then makeFileProvider should fail without fetching", async () => {
    const provider = makeFileProvider(fetcher({}), 5000, resolveHome);
    await expect(provider.resolve("relative.txt", undefined)).rejects.toThrow(
      /file.*base|base.*file/i,
    );
  });
});
