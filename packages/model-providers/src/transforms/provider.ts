import { Provider } from "@opencode/plugin";
import type { ProviderConfig } from "../config.js";
import type { ProviderEditor } from "../types.js";
import { makeModel, transformModels } from "./model.js";
import { setFrom } from "./setFrom.js";

export function transformProvider(
  editor: ProviderEditor,
  id: string,
  providerConfig: ProviderConfig,
): void {
  const { models: modelConfigs, ...providerFields } = providerConfig;
  const record = editor.get(id);
  if (record === undefined) {
    const info = Provider.Info.empty(Provider.ID.make(id));
    setFrom(info, providerFields);
    const models = Object.entries(modelConfigs ?? {}).map(([modelID, modelConfig]) =>
      makeModel(id, modelID, modelConfig),
    );
    editor.add({ info, models });
    return;
  }
  editor.update(id, (provider) => {
    setFrom(provider, providerFields);
  });
  transformModels(editor, id, modelConfigs);
}
