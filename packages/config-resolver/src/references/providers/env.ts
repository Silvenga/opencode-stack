import type { ReferenceProvider } from "../scanner.js";

export function makeEnvProvider(readEnv: (name: string) => string | undefined): ReferenceProvider {
  return {
    resolve: async (input) => {
      const value = readEnv(input);
      if (value === undefined || value.length === 0) {
        throw new Error(`environment variable is not set: ${input}`);
      }
      return value;
    },
  };
}
