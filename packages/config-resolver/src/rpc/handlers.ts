import type { ResolvedState } from "../load.js";

export function makeHandlers(state: ResolvedState) {
  return {
    getConfig: async ({ name }: { name: string }) => ({
      config: state.configs.get(name) ?? {},
    }),
    status: async () => ({
      state: state.state,
      ...(state.error === undefined ? {} : { error: state.error }),
    }),
  };
}
