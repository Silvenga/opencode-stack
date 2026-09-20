import { describe, expect, test } from "vitest";
import { resolvePath } from "./paths.js";

const home = () => "/home/test";

describe("resolvePath", () => {
  test("When a path is empty then resolvePath should throw", () => {
    expect(() => resolvePath("", home)).toThrow(/empty/i);
  });

  test("When a path is relative with a dot then resolvePath should throw", () => {
    expect(() => resolvePath("./config.yaml", home)).toThrow(/absolute/i);
  });

  test("When a path is relative without a dot then resolvePath should throw", () => {
    expect(() => resolvePath("config.yaml", home)).toThrow(/absolute/i);
  });

  test("When a path is bare tilde then resolvePath should return the home directory", () => {
    expect(resolvePath("~", home)).toEqual({ kind: "local", path: "/home/test" });
  });

  test("When a path is tilde slash then resolvePath should expand under home", () => {
    expect(resolvePath("~/configs/a.yaml", home)).toEqual({
      kind: "local",
      path: "/home/test/configs/a.yaml",
    });
  });

  test("When a tilde path has no resolvable home then resolvePath should throw", () => {
    expect(() => resolvePath("~/a.yaml", () => undefined)).toThrow(/home/i);
  });

  test("When a tilde path has an empty home then resolvePath should throw", () => {
    expect(() => resolvePath("~/a.yaml", () => "")).toThrow(/home/i);
  });

  test("When a path is tilde another user then resolvePath should not expand and should throw", () => {
    expect(() => resolvePath("~otheruser/a.yaml", home)).toThrow(/absolute/i);
  });

  test("When a path is tilde without slash then resolvePath should not expand and should throw", () => {
    expect(() => resolvePath("~app.yaml", home)).toThrow(/absolute/i);
  });

  test("When a path is https then resolvePath should return a remote target", () => {
    expect(resolvePath("https://example.com/file.yaml", home)).toEqual({
      kind: "remote",
      url: "https://example.com/file.yaml",
    });
  });

  test("When a path is http then resolvePath should return a remote target", () => {
    expect(resolvePath("http://example.com/file.yaml", home)).toEqual({
      kind: "remote",
      url: "http://example.com/file.yaml",
    });
  });

  test("When a scheme is uppercase then resolvePath should still return a remote target", () => {
    expect(resolvePath("HTTPS://example.com/file.yaml", home)).toEqual({
      kind: "remote",
      url: "https://example.com/file.yaml",
    });
  });

  test("When a path is ftp then resolvePath should throw an unsupported scheme error", () => {
    expect(() => resolvePath("ftp://example.com/file.yaml", home)).toThrow(/scheme/i);
  });

  test("When a path is file scheme then resolvePath should throw an unsupported scheme error", () => {
    expect(() => resolvePath("file:///etc/config.yaml", home)).toThrow(/scheme/i);
  });

  test("When a path is absolute then resolvePath should return a local target", () => {
    expect(resolvePath("/etc/config.yaml", home)).toEqual({
      kind: "local",
      path: "/etc/config.yaml",
    });
  });

  test("When an absolute path contains spaces then resolvePath should keep it verbatim", () => {
    expect(resolvePath("/opt/my configs/a.yaml", home)).toEqual({
      kind: "local",
      path: "/opt/my configs/a.yaml",
    });
  });

  test("When a URL lacks a double slash then resolvePath should normalize and return remote", () => {
    expect(resolvePath("https:/example.com/file.yaml", home)).toEqual({
      kind: "remote",
      url: "https://example.com/file.yaml",
    });
  });
});
