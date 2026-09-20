import type { PathTarget } from "../paths.js";

export interface ReferenceProvider {
  resolve(input: string, base: PathTarget | undefined): Promise<string>;
}

type Base = PathTarget | undefined;

export async function resolveReferences(
  value: unknown,
  providers: Readonly<Record<string, ReferenceProvider>>,
  base: Base,
): Promise<unknown> {
  if (typeof value === "string") {
    return scan(value, providers, base);
  }
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (const item of value) {
      items.push(await resolveReferences(item, providers, base));
    }
    return items;
  }
  if (value !== null && typeof value === "object") {
    const entries: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      entries[key] = await resolveReferences(child, providers, base);
    }
    return entries;
  }
  return value;
}

async function scan(
  input: string,
  providers: Readonly<Record<string, ReferenceProvider>>,
  base: Base,
): Promise<string> {
  let output = "";
  let cursor = 0;
  while (cursor < input.length) {
    const dollar = input.indexOf("$", cursor);
    if (dollar === -1) {
      output += input.slice(cursor);
      break;
    }
    output += input.slice(cursor, dollar);
    if (input.startsWith("$$", dollar)) {
      output += "$";
      cursor = dollar + 2;
      continue;
    }
    if (input.startsWith("$(", dollar)) {
      const open = dollar + 2;
      const close = input.indexOf(")", open);
      if (close === -1) {
        throw new Error(`unterminated reference in: ${input}`);
      }
      const body = input.slice(open, close);
      const colon = body.indexOf(":");
      if (colon === -1 || colon === 0) {
        throw new Error(`malformed reference in: ${input}`);
      }
      const providerName = body.slice(0, colon);
      const providerInput = body.slice(colon + 1);
      if (providerInput.length === 0) {
        throw new Error(`empty reference input in: ${input}`);
      }
      const provider = providers[providerName];
      if (provider === undefined) {
        throw new Error(`unknown reference provider: ${providerName}`);
      }
      output += await provider.resolve(providerInput, base);
      cursor = close + 1;
      continue;
    }
    output += "$";
    cursor = dollar + 1;
  }
  return output;
}
