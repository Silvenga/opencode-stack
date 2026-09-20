import { describe, expect, test } from "vitest";
import { makeEnvProvider } from "./env.js";

describe("makeEnvProvider", () => {
  test("When the variable is set then makeEnvProvider should resolve to its value", async () => {
    const provider = makeEnvProvider((name) => (name === "KEY" ? "value" : undefined));
    await expect(provider.resolve("KEY", { kind: "local", path: "/base" })).resolves.toBe("value");
  });

  test("When the variable is unset then makeEnvProvider should fail", async () => {
    const provider = makeEnvProvider(() => undefined);
    await expect(provider.resolve("MISSING", { kind: "local", path: "/base" })).rejects.toThrow(
      /MISSING/,
    );
  });

  test("When the variable is empty then makeEnvProvider should fail", async () => {
    const provider = makeEnvProvider(() => "");
    await expect(provider.resolve("EMPTY", { kind: "local", path: "/base" })).rejects.toThrow(
      /EMPTY/,
    );
  });

  test("When there is no base then makeEnvProvider should still resolve", async () => {
    const provider = makeEnvProvider(() => "ok");
    await expect(provider.resolve("KEY", undefined)).resolves.toBe("ok");
  });

  test("When the value contains new lines then makeEnvProvider should return it verbatim", async () => {
    const provider = makeEnvProvider(() => "line1\nline2");
    await expect(provider.resolve("KEY", undefined)).resolves.toBe("line1\nline2");
  });
});
