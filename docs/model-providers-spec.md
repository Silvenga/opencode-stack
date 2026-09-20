# @slvn-opencode/model-providers

Goal: Apply central and local configuration to OpenCode provider and model definitions.

## Configuration

Read central configuration through `getConfig({ name: "model-providers" })` and local configuration from plugin options. Both default to `{}` and use an object with an optional `providers` map, keyed by provider ID. Each entry follows OpenCode's provider configuration shape: an optional `models` map keyed by model ID, plus optional provider-level overlays. A central configuration document, for example:

```yaml
name: model-providers
config:
  providers:
    my-provider:
      name: My Provider
      models:
        my-model:
          name: My Model
          limit:
            context: 1000000
            output: 64000
```

Local configuration uses the same shape as the `config` value above.

## Validation

Validate inputs with Zod schemas matching OpenCode's accessible configuration types. The schemas track those types at compile time, so schema drift when OpenCode changes is a type error rather than a runtime discovery.

Validation is strict on the fields OpenCode defines: each known field must match its schema. Everything else passes through unvalidated, matching OpenCode's rest-key behavior for free-form overlays such as provider and model `settings`, `headers`, and `body`.

Validate central and local configuration independently before applying either. If either is invalid, apply neither.

## Application

Acquire and validate both configurations during plugin setup, before registering the provider transform. OpenCode transform callbacks must not be async, so the transform captures the already-prepared configurations and application is synchronous.

Apply central configuration first, then local configuration, through the same transform logic. Do not combine the configurations before applying them.

Match provider and model definitions by ID. Add providers and models that do not already exist.

A definition that does not already exist starts from OpenCode's own defaults for a new definition of that kind, then overlays the supplied values. The base values for a new definition come from OpenCode, not from this plugin.

Overlay supplied values while preserving unspecified data, including nested object fields. Supplied arrays replace existing arrays in full.

## Failure Handling

On `rpc.unavailable`, use empty central configuration and continue with local configuration. Other RPC errors or incompatible responses fail the load.

Acquisition or validation failure applies neither configuration and must not block OpenCode.

Application itself is expected not to fail: validation has already accepted both configurations before any definition is mutated. If application fails anyway, report the failure through `status` and do not block OpenCode.

## Status and Notification

Expose a `status` RPC with empty input and the following response:

```ts
{
  state: "ready" | "failed"
  resolver: "available" | "unavailable" | "unknown"
  error?: {
    stage: "resolver" | "central" | "local" | "application"
    message: string
  }
}
```

### State

- `ready`: Configuration was validated and applied. Omit `error`.
- `failed`: Acquisition, validation, or application failed. Include `error`.

### Resolver

- `available`: A compatible resolver response was received.
- `unavailable`: The resolver returned `rpc.unavailable`.
- `unknown`: Another RPC or response failure prevented obtaining central configuration.

### Errors and Notification

Error messages identify the failure without exposing secrets or raw configuration values.

On TUI startup, request status and show an error toast for `failed`. Remain silent for `ready` or an unreachable status RPC.

## Future

Configuration is prepared once, during setup. A future version will capture a container object in the transform closure so a refreshed preparation can re-apply configuration after setup has run.
