export function parseOptions(options: Readonly<Record<string, unknown>>): {
  paths: string[];
  timeoutMs: number;
} {
  const rawPaths = options.paths;
  const paths = Array.isArray(rawPaths)
    ? rawPaths.filter((path): path is string => typeof path === "string")
    : [];
  const rawTimeout = options.timeoutMs;
  const timeoutMs =
    typeof rawTimeout === "number" && Number.isFinite(rawTimeout) && rawTimeout > 0
      ? rawTimeout
      : 5000;
  return { paths, timeoutMs };
}
