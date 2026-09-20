import { describe, expect, test } from "vitest";
import { resolveReferences } from "./scanner.js";

const base = { kind: "local", path: "/base/top.yaml" } as const;

function providers(
  entries: Readonly<Record<string, (input: string) => string>>,
): Record<string, { resolve: (input: string) => Promise<string> }> {
  const result: Record<string, { resolve: (input: string) => Promise<string> }> = {};
  for (const [name, fn] of Object.entries(entries)) {
    result[name] = {
      resolve: (input) => Promise.resolve(fn(input)),
    };
  }
  return result;
}

describe("resolveReferences string scanning", () => {
  test("When a value has no dollar then resolveReferences should return it unchanged", async () => {
    const value = await resolveReferences("plain text", providers({}), base);
    expect(value).toBe("plain text");
  });

  test("When a value has a lone dollar then resolveReferences should keep it", async () => {
    const value = await resolveReferences("costs $5 total", providers({}), base);
    expect(value).toBe("costs $5 total");
  });

  test("When a value ends in an open paren after dollar then resolveReferences should fail", async () => {
    await expect(
      resolveReferences("value is $(file:oops", providers({ file: () => "x" }), base),
    ).rejects.toThrow(/reference/i);
  });

  test("When a reference has no colon then resolveReferences should fail", async () => {
    await expect(
      resolveReferences("$(file)", providers({ file: () => "x" }), base),
    ).rejects.toThrow(/reference/i);
  });

  test("When a reference has an empty provider then resolveReferences should fail", async () => {
    await expect(resolveReferences("$(:input)", providers({}), base)).rejects.toThrow(/reference/i);
  });

  test("When a reference has an empty input then resolveReferences should fail", async () => {
    await expect(
      resolveReferences("$(file:)", providers({ file: () => "x" }), base),
    ).rejects.toThrow(/reference/i);
  });

  test("When a reference names an unknown provider then resolveReferences should fail", async () => {
    await expect(resolveReferences("$(env:PATH)", providers({}), base)).rejects.toThrow(
      /reference/i,
    );
  });

  test("When a value has a doubled dollar then resolveReferences should emit one literal dollar", async () => {
    const value = await resolveReferences("costs $$5", providers({}), base);
    expect(value).toBe("costs $5");
  });

  test("When a value has a doubled dollar before a paren then resolveReferences should emit a literal dollar paren", async () => {
    const value = await resolveReferences(
      "not a ref $$(file:x)",
      providers({ file: () => "x" }),
      base,
    );
    expect(value).toBe("not a ref $(file:x)");
  });

  test("When a reference appears mid-string then resolveReferences should replace only it", async () => {
    const value = await resolveReferences(
      "before $(file:a.txt) after",
      providers({ file: () => "content" }),
      base,
    );
    expect(value).toBe("before content after");
  });

  test("When multiple references appear then resolveReferences should replace each in order", async () => {
    const value = await resolveReferences(
      "$(file:a) and $(file:b)",
      providers({ file: (input) => `[${input}]` }),
      base,
    );
    expect(value).toBe("[a] and [b]");
  });

  test("When the input runs to the first close paren then resolveReferences should stop there", async () => {
    const value = await resolveReferences(
      "$(file:weird).txt",
      providers({ file: (input) => `<${input}>` }),
      base,
    );
    expect(value).toBe("<weird>.txt");
  });

  test("When referenced content contains new lines then resolveReferences should insert it verbatim", async () => {
    const value = await resolveReferences(
      "header $(file:big) footer",
      providers({ file: () => "line1\nline2" }),
      base,
    );
    expect(value).toBe("header line1\nline2 footer");
  });

  test("When referenced content contains a reference then resolveReferences should insert it verbatim without resolving", async () => {
    const value = await resolveReferences(
      "$(file:outer)",
      providers({ file: () => "$(file:inner)" }),
      base,
    );
    expect(value).toBe("$(file:inner)");
  });

  test("When a provider rejects then resolveReferences should fail with the provider error", async () => {
    await expect(
      resolveReferences(
        "$(file:missing)",
        {
          file: {
            resolve: () => Promise.reject(new Error("ENOENT: no such file")),
          },
        },
        base,
      ),
    ).rejects.toThrow(/ENOENT/);
  });
});

describe("resolveReferences structure walking", () => {
  const file = providers({ file: (input) => `[${input}]` });

  test("When config is an object then resolveReferences should walk values but not keys", async () => {
    const value = await resolveReferences(
      {
        "$(file:key)": "value $(file:a)",
        nested: { deep: "$(file:deep)" },
      },
      file,
      base,
    );
    expect(value).toStrictEqual({
      "$(file:key)": "value [a]",
      nested: { deep: "[deep]" },
    });
  });

  test("When config is an array then resolveReferences should walk items", async () => {
    const value = await resolveReferences(["$(file:one)", { inner: "$(file:two)" }], file, base);
    expect(value).toStrictEqual(["[one]", { inner: "[two]" }]);
  });

  test("When config contains non-string scalars then resolveReferences should pass them through", async () => {
    const value = await resolveReferences(
      { n: 5, b: true, z: null, e: "empty $(file:e)" },
      file,
      base,
    );
    expect(value).toStrictEqual({ n: 5, b: true, z: null, e: "empty [e]" });
  });

  test("When config is an empty object or array then resolveReferences should return it unchanged", async () => {
    expect(await resolveReferences({}, file, base)).toStrictEqual({});
    expect(await resolveReferences([], file, base)).toStrictEqual([]);
  });

  test("When config is a bare scalar then resolveReferences should resolve inside it", async () => {
    expect(await resolveReferences("$(file:scalar)", file, base)).toBe("[scalar]");
  });
});
