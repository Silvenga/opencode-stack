# opencode-stack

A pnpm workspace of independent plugins for OpenCode v2. Each package under `packages/` is one plugin, self-contained and independently tested. The packages do not depend on each other; a shared config-resolver plugin provides cross-cutting configuration through an RPC contract.

## Repo Conventions

- Package scope is `@slvn-opencode`, directory `packages/<plugin-name>`. Plugin IDs use `slvn-opencode.<plugin-name>`.
- Run `pnpm fmt`, `pnpm lint`, and `pnpm test` after every change. All three must pass. `pnpm lint` is `oxlint` plus `tsc --build --noEmit`; `oxfmt` is the only formatter.
- TypeScript: strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`, bundler resolution. Relative imports use explicit `.js` extensions (Bun, which runs the plugins, requires them). Extensionless imports are a defect.
- Tests live next to source: `src/foo.ts` pairs with `src/foo.test.ts`. Test names follow `When <condition> then <action> should <expected>` in Arrange-Act-Assert form.
- Commits follow Conventional Commits, single line, American English. Do not commit unless asked. Release-please manages versions (all packages locked to one version); do not bump versions manually.
- Do not run opencode binaries during development; they may conflict with a running instance. The dev harness (`pnpm run dev`) is for the user to run manually.

## Spec-Driven Behavior

Behavioral decisions live in `docs/<plugin-name>-spec.md`, not in chat history or code comments. Read the relevant spec before changing plugin behavior, and update it in the same change when behavior changes. `docs/AGENTS.md` defines the spec conventions.

## Plugin Philosophy

Fail open. A plugin must never block usage of OpenCode: `setup` never throws, load failures fall back to cached or empty state, and degradation is observable through a `status` surface rather than silent. The host is not defended against its own bad configuration - invalid user input fails the load and reports it, rather than the plugin retrying or guessing.

Thin glue, pure core. Filesystem, network, and process access stay in injectable units (`runtime.ts` holds the Node-bound capabilities; loaders and providers are passed in). The core logic is pure and unit-tested with fakes; the `Plugin.define` glue stays under ~40 lines. If logic cannot be unit-tested without a server, the plugin's shape is wrong.

## Config Resolver Pattern

The config-resolver is the template for future config-consuming plugins. A consuming plugin:

1. Declares a `name` under which its config slice is published in the shared YAML.
2. Pulls its slice during `setup` via `ctx.rpc` against `@slvn-opencode/config-resolver/rpc` (the resolver is configured to load first). Catch `rpc.unavailable` and treat it as an empty config - the plugin must work standalone with its native `ctx.options` as the default.
3. Validates its slice against its own zod schema; the resolver only guarantees JSON.
4. Applies the config through domain transforms during `setup`, so registration is complete before the UI reads anything.

The resolver contract: `getConfig(name)` returns `{}` for missing names and never errors; `status()` reports `fresh`, `cache`, or `failed` with the last error. References (`$(env:VAR)`, `$(file:path)`) are resolved before the consumer sees anything - consumers never handle references.

## Layout

- `packages/<plugin-name>/src/` - plugin source. Subdirectories group by concept (for example `references/`, `rpc/`); depth that names a hierarchy beats breadth of flat files.
- `packages/<plugin-name>/package.json` exports map is the publish contract: `.` (plugin), `./rpc` (typed contract for consumers), `./tui` (TUI plugin) when present. Raw TypeScript is published; there is no build step.
- `scripts/dev-run.sh` - manual test harness: deploys prod-only packages to `dist/`, runs a hermetic opencode v2 with config home pointed at `scripts/config/.state/`. `pnpm run dev` for headed, `pnpm run dev run "..."` for headless. Extra args pass through.
- `docs/` - specs, one per plugin, plus spec conventions in `docs/AGENTS.md`.