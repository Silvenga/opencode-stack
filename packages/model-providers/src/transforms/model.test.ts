import { describe, expect, test } from "vitest";
import { makeEditor } from "../_tests/fake-editor.js";
import { transformModels } from "./model.js";

describe("transformModels", () => {
  test("When the model does not exist on an existing provider then transformModels should add it from OpenCode defaults", () => {
    const editor = makeEditor([{ id: "p" }]);

    transformModels(editor, "p", { "m-1": { name: "M1", limit: { context: 100, output: 5 } } });

    const model = editor.records.get("p")?.models.get("m-1");
    expect(model).toMatchObject({
      id: "m-1",
      modelID: "m-1",
      providerID: "p",
      name: "M1",
      status: "active",
      enabled: true,
      limit: { context: 100, output: 5 },
    });
  });

  test("When the model exists then transformModels should overlay onto it", () => {
    const editor = makeEditor([
      {
        id: "p",
        models: [["m", { name: "Old", enabled: true, limit: { context: 10, output: 2 } }]],
      },
    ]);

    transformModels(editor, "p", { m: { name: "New", limit: { context: 20 } } });

    const model = editor.records.get("p")?.models.get("m");
    expect(model).toMatchObject({ name: "New", limit: { context: 20, output: 2 } });
  });

  test("When the model config sets disabled true then transformModels should disable the model", () => {
    const editor = makeEditor([{ id: "p" }]);

    transformModels(editor, "p", { m: { disabled: true } });

    const model = editor.records.get("p")?.models.get("m");
    expect(model).toMatchObject({ enabled: false });
  });

  test("When the model config supplies cost then transformModels should keep it verbatim", () => {
    const editor = makeEditor([{ id: "p" }]);
    const cost = [{ input: 1, output: 2, cache: { read: 0, write: 0 } }];

    transformModels(editor, "p", { m: { cost } });

    const model = editor.records.get("p")?.models.get("m");
    expect(model?.cost).toEqual(cost);
  });
});
