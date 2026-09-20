import { describe, expect, test } from "vitest";
import { setFrom } from "./setFrom.js";

describe("setFrom primitives", () => {
  test("When the target is an object then setFrom should copy supplied keys in place", () => {
    const target = { a: 1, keep: true };
    setFrom(target, { a: 2, added: "x" });
    expect(target).toEqual({ a: 2, keep: true, added: "x" });
  });

  test("When the overlay value is a plain object and the target key holds a plain object then setFrom should recurse", () => {
    const target = { limit: { context: 100, output: 10, untouched: true } };
    setFrom(target, { limit: { context: 200 } });
    expect(target).toEqual({ limit: { context: 200, output: 10, untouched: true } });
  });

  test("When the overlay value is a plain object but the target key is missing or not an object then setFrom should replace wholesale", () => {
    const target = { limit: 5, headers: null };
    setFrom(target, { limit: { context: 1 }, headers: { a: "b" } });
    expect(target).toEqual({ limit: { context: 1 }, headers: { a: "b" } });
  });

  test("When the overlay value is an array then setFrom should replace the array in full", () => {
    const target = { cost: [{ input: 1 }], keep: 1 };
    setFrom(target, { cost: [{ input: 9 }, { input: 8 }] });
    expect(target).toEqual({ cost: [{ input: 9 }, { input: 8 }], keep: 1 });
  });

  test("When the overlay value is a scalar then setFrom should assign it", () => {
    const target = { name: "old", enabled: true };
    setFrom(target, { name: "new", enabled: false });
    expect(target).toEqual({ name: "new", enabled: false });
  });

  test("When the overlay value is null then setFrom should assign null", () => {
    const target = { name: "old" };
    setFrom(target, { name: null });
    expect(target).toEqual({ name: null });
  });

  test("When the overlay is empty then setFrom should change nothing", () => {
    const target = { a: { b: { c: 1 } } };
    setFrom(target, {});
    expect(target).toEqual({ a: { b: { c: 1 } } });
  });

  test("When setFrom recurses then nested objects should mutate in place, not clone", () => {
    const nested = { context: 1 };
    const target = { limit: nested };
    setFrom(target, { limit: { context: 2 } });
    expect(target.limit).toBe(nested);
    expect(nested.context).toBe(2);
  });

  test("When the overlay value is a Date then setFrom should assign it without recursion", () => {
    const date = new Date(0);
    const target = { released: "x" };
    setFrom(target, { released: date });
    expect(target.released).toBe(date);
  });

  test("When the overlay contains undefined values then setFrom should skip them", () => {
    const target = { name: "keep" };
    setFrom(target, { name: undefined, other: undefined });
    expect(target).toEqual({ name: "keep" });
  });
});
