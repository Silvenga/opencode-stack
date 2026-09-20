import { expect, test } from "vitest";
import type { z } from "zod";
import { ConfigResolverRpc } from "./contract.js";

test("When the contract is defined then it should expose both methods with the resolver id", () => {
  expect(ConfigResolverRpc.id).toBe("slvn-opencode.config-resolver");
  expect(Object.keys(ConfigResolverRpc.methods).sort()).toEqual(["getConfig", "status"]);
});

test("When getConfig input is validated then a missing name should fail and a valid name should pass", () => {
  const input = ConfigResolverRpc.methods.getConfig?.input;
  expect(input).toBeDefined();
  const schema = input as z.ZodType;
  expect(schema.safeParse({}).success).toBe(false);
  expect(schema.safeParse({ name: "models" }).success).toBe(true);
});
