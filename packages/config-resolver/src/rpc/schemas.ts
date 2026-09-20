import { z } from "zod";

export const emptyInput = z.object({});

export const getConfigInput = z.object({ name: z.string() });

export const getConfigOutput = z.object({ config: z.unknown() });

export const statusOutput = z.object({
  state: z.enum(["fresh", "cache", "failed"]),
  error: z.string().optional(),
});
