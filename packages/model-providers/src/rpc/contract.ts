import { Rpc } from "@opencode/plugin/rpc";
import { z } from "zod";

const emptyInput = z.object({});

const statusOutput = z.object({
  state: z.enum(["ready", "failed"]),
  resolver: z.enum(["available", "unavailable", "unknown"]),
  error: z
    .object({
      stage: z.enum(["resolver", "central", "local", "application"]),
      message: z.string(),
    })
    .optional(),
});

export type Status = z.output<typeof statusOutput>;

export const ModelProvidersRpc = Rpc.define({
  id: "slvn-opencode.model-providers",
  methods: {
    status: {
      input: emptyInput,
      output: statusOutput,
    },
  },
  events: {},
});
