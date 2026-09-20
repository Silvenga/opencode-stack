export type PathTarget =
  | { readonly kind: "local"; readonly path: string }
  | { readonly kind: "remote"; readonly url: string };

export function resolvePath(raw: string, homedir: () => string | undefined): PathTarget {
  if (raw.length === 0) {
    throw new Error("config path is empty");
  }
  if (raw === "~" || raw.startsWith("~/")) {
    const home = homedir();
    if (home === undefined || home.length === 0) {
      throw new Error("config path starts with ~ but no home directory is available");
    }
    const expanded = raw === "~" ? home : `${home}/${raw.slice(2)}`;
    return { kind: "local", path: expanded };
  }
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/.exec(raw);
  if (schemeMatch !== null) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      throw new Error(`unsupported config path scheme: ${scheme}://`);
    }
    return { kind: "remote", url: new URL(raw).toString() };
  }
  if (!raw.startsWith("/")) {
    throw new Error(`config path is not absolute: ${raw}`);
  }
  return { kind: "local", path: raw };
}
