import { Model, Provider, type Provider as ProviderSchema } from "@opencode/plugin";
import type { ProviderEditor } from "../types.js";

type MutableProvider = { -readonly [K in keyof Provider.Info]: Provider.Info[K] } & Record<
  string,
  unknown
>;
type MutableModel = { -readonly [K in keyof Model.Info]: Model.Info[K] } & Record<string, unknown>;

interface FakeRecord {
  provider: MutableProvider;
  models: Map<string, MutableModel>;
}

interface FakeEditor extends ProviderEditor {
  records: Map<string, FakeRecord>;
}

export function makeEditor(
  initial: ReadonlyArray<{
    id: string;
    provider?: Partial<MutableProvider>;
    models?: ReadonlyArray<[string, Partial<MutableModel>]>;
  }> = [],
): FakeEditor {
  const records = new Map<string, FakeRecord>();
  for (const entry of initial) {
    records.set(entry.id, {
      provider: {
        ...Provider.Info.empty(entry.id as ProviderSchema.ID),
        ...entry.provider,
      },
      models: new Map(
        (entry.models ?? []).map(([id, model]) => [
          id,
          { ...Model.Info.default(entry.id as ProviderSchema.ID, id as never), ...model },
        ]),
      ),
    });
  }
  const editor = {
    records,
    list() {
      return [...records.values()];
    },
    get(providerID: string) {
      return records.get(providerID);
    },
    add(input: { info: MutableProvider; models: ReadonlyArray<MutableModel> }) {
      records.set(input.info.id as string, {
        provider: { ...input.info },
        models: new Map(input.models.map((model) => [model.id as string, { ...model }])),
      });
    },
    update(providerID: string, update: (provider: MutableProvider) => void) {
      const record = records.get(providerID);
      if (record === undefined) {
        throw new Error(`no provider: ${providerID}`);
      }
      update(record.provider);
    },
    remove(providerID: string) {
      records.delete(providerID);
    },
    models: {
      set(providerID: string, models: ReadonlyArray<MutableModel>) {
        const record = records.get(providerID);
        if (record === undefined) {
          throw new Error(`no provider: ${providerID}`);
        }
        record.models = new Map(models.map((model) => [model.id as string, { ...model }]));
      },
      update(providerID: string, modelID: string, update: (model: MutableModel) => void) {
        const record = records.get(providerID);
        if (record === undefined) {
          throw new Error(`no provider: ${providerID}`);
        }
        const model = record.models.get(modelID);
        if (model === undefined) {
          throw new Error(`no model: ${modelID}`);
        }
        update(model);
      },
      remove(providerID: string, modelID: string) {
        records.get(providerID)?.models.delete(modelID);
      },
    },
  } as unknown as FakeEditor;
  return editor;
}
