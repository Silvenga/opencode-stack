import type { PluginConfig } from "../config.js";
import type { ProviderEditor } from "../types.js";
import { transformProvider } from "./provider.js";

export function transformConfig(editor: ProviderEditor, config: PluginConfig): void {
  for (const [id, providerConfig] of Object.entries(config.providers)) {
    transformProvider(editor, id, providerConfig);
  }
}
