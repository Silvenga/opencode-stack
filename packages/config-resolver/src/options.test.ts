import { describe, expect, test } from "vitest";
import { parseOptions } from "./options.js";

describe("parseOptions", () => {
  test("When options are empty then parseOptions should return defaults", () => {
    expect(parseOptions({})).toEqual({ paths: [], timeoutMs: 5000 });
  });

  test("When paths is an array of strings then parseOptions should keep them", () => {
    expect(parseOptions({ paths: ["/a.yaml", "~/.b.yaml"] })).toEqual({
      paths: ["/a.yaml", "~/.b.yaml"],
      timeoutMs: 5000,
    });
  });

  test("When paths contains non-strings then parseOptions should drop them", () => {
    expect(parseOptions({ paths: ["/a.yaml", 42, null, true] })).toEqual({
      paths: ["/a.yaml"],
      timeoutMs: 5000,
    });
  });

  test("When paths is not an array then parseOptions should default to empty", () => {
    expect(parseOptions({ paths: "/a.yaml" })).toEqual({ paths: [], timeoutMs: 5000 });
  });

  test("When timeoutMs is a positive number then parseOptions should keep it", () => {
    expect(parseOptions({ timeoutMs: 1000 })).toEqual({ paths: [], timeoutMs: 1000 });
  });

  test("When timeoutMs is zero or negative then parseOptions should default it", () => {
    expect(parseOptions({ timeoutMs: 0 }).timeoutMs).toBe(5000);
    expect(parseOptions({ timeoutMs: -5 }).timeoutMs).toBe(5000);
  });

  test("When timeoutMs is not a finite number then parseOptions should default it", () => {
    expect(parseOptions({ timeoutMs: Number.POSITIVE_INFINITY }).timeoutMs).toBe(5000);
    expect(parseOptions({ timeoutMs: "slow" }).timeoutMs).toBe(5000);
  });
});
