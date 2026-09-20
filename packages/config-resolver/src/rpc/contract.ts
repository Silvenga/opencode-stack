import { Rpc } from "@opencode/plugin/rpc";
import { emptyInput, getConfigInput, getConfigOutput, statusOutput } from "./schemas.js";

export const ConfigResolverRpc = Rpc.define({
  id: "slvn-opencode.config-resolver",
  methods: {
    getConfig: {
      input: getConfigInput,
      output: getConfigOutput,
    },
    status: {
      input: emptyInput,
      output: statusOutput,
    },
  },
  events: {},
});
