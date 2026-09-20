import type { Status } from "./contract.js";

export function makeHandlers(state: { readonly status: Status }) {
  return {
    status: async (_input: Record<string, never>) => ({
      state: state.status.state,
      resolver: state.status.resolver,
      ...(state.status.error === undefined ? {} : { error: state.status.error }),
    }),
  };
}
