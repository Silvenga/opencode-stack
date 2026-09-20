import { describe, expect, test } from "vitest";
import { makeEditor } from "../_tests/fake-editor.js";
import { transformProvider } from "./provider.js";

describe("transformProvider", () => {
  test("When the provider does not exist then transformProvider should add it from OpenCode defaults with overlays", () => {
    const editor = makeEditor();

    transformProvider(editor, "my-provider", {
      name: "My Provider",
      package: "my-pkg",
      headers: { authorization: "Bearer x" },
    });

    const record = editor.records.get("my-provider");
    expect(record).toBeDefined();
    expect(record?.provider).toMatchObject({
      id: "my-provider",
      name: "My Provider",
      package: "my-pkg",
      activation: "auto",
      headers: { authorization: "Bearer x" },
    });
  });

  test("When the provider exists then transformProvider should overlay onto it and preserve unspecified data", () => {
    const editor = makeEditor([{ id: "existing", provider: { name: "Old", package: "old-pkg" } }]);

    transformProvider(editor, "existing", { name: "New", extra: { deep: true } });

    const record = editor.records.get("existing");
    expect(record?.provider).toMatchObject({
      id: "existing",
      name: "New",
      package: "old-pkg",
      activation: "auto",
      extra: { deep: true },
    });
  });

  test("When the provider is new and carries models then transformProvider should add provider and models together", () => {
    const editor = makeEditor();

    transformProvider(editor, "fresh", {
      name: "Fresh",
      models: { a: { name: "A" }, b: { name: "B" } },
    });

    const record = editor.records.get("fresh");
    expect(record?.models.get("a")).toMatchObject({ id: "a", name: "A", providerID: "fresh" });
    expect(record?.models.get("b")).toMatchObject({ id: "b", name: "B", providerID: "fresh" });
  });
});
