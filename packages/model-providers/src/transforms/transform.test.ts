import { describe, expect, test } from "vitest";
import { makeEditor } from "../_tests/fake-editor.js";
import { transformConfig } from "./transform.js";

describe("transformConfig", () => {
  test("When config has no providers then transformConfig should change nothing", () => {
    const editor = makeEditor([{ id: "keep", provider: { name: "Keep" } }]);

    transformConfig(editor, { providers: {} });

    expect(editor.records.get("keep")?.provider).toMatchObject({ id: "keep", name: "Keep" });
  });

  test("When config has multiple providers then transformConfig should apply each one", () => {
    const editor = makeEditor();

    transformConfig(editor, {
      providers: {
        alpha: { name: "Alpha" },
        beta: { name: "Beta", models: { m: { name: "M" } } },
      },
    });

    expect(editor.records.get("alpha")?.provider).toMatchObject({ id: "alpha", name: "Alpha" });
    expect(editor.records.get("beta")?.provider).toMatchObject({ id: "beta", name: "Beta" });
    expect(editor.records.get("beta")?.models.get("m")).toMatchObject({ id: "m", name: "M" });
  });
});
