import { Model, Provider } from "@opencode/plugin";
import type { ModelConfig } from "../config.js";
import type { ProviderEditor } from "../types.js";
import { setFrom } from "./setFrom.js";

export function transformModels(
  editor: ProviderEditor,
  id: string,
  modelConfigs: Readonly<Record<string, ModelConfig>> | undefined,
): void {
  for (const [modelID, modelConfig] of Object.entries(modelConfigs ?? {})) {
    if (editor.get(id)?.models.has(modelID) === true) {
      editor.models.update(id, modelID, (model) => {
        setFrom(model, normalizeModelConfig(modelConfig));
      });
      continue;
    }
    const model = makeModel(id, modelID, modelConfig);
    const existing = [...(editor.get(id)?.models.values() ?? [])] as unknown as Model.Info[];
    editor.models.set(id, [...existing, model]);
  }
}

export function makeModel(providerID: string, id: string, modelConfig: ModelConfig): Model.Info {
  const model = Model.Info.default(Provider.ID.make(providerID), Model.ID.make(id));
  setFrom(model, normalizeModelConfig(modelConfig));
  return model;
}

function normalizeModelConfig(modelConfig: ModelConfig): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modelConfig)) {
    if (key === "disabled") {
      if (value !== undefined) {
        normalized.enabled = value !== true;
      }
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
}
