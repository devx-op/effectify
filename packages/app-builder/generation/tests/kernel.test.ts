import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

type CatalogModule = typeof import("../src/catalog.js")
type KernelModule = typeof import("../src/kernel.js")
type Generator = import("../src/kernel.js").AtomicGenerator<{ readonly content: string }>

const context = {
  version: "effectify.render-context/1",
  workspace: { name: "todo", npmScope: "@acme" },
  domain: { id: "todo", name: "Todo", importName: "@acme/todo" },
  entity: { id: "todo", singular: "Todo", plural: "Todos" },
  entrypoint: { id: "todo", name: "Todo", importName: "@acme/todo" },
  packages: [{ id: "domain", name: "@acme/todo", root: "pkg/todo" }],
} as const
const duplicatePackage = { ...context.packages[0], id: "domain", name: "@acme/app", root: "app" }
const contribution = (Kernel: KernelModule, path: string, owner: string, content: string) => ({
  bytes: new TextEncoder().encode(content),
  mode: "100644",
  owner: Kernel.identifier(owner),
  package: Kernel.identifier("domain"),
  path: Kernel.safeRelativePath(path),
  sourceDigest: Kernel.sourceDigest("sha256:test"),
  surface: Kernel.identifier("source"),
})
const generator = (
  Kernel: KernelModule,
  id: string,
  onRender?: () => void,
  requires: ReadonlyArray<string> = [],
  owner = id,
  paths: ReadonlyArray<string> = [`${id}.ts`],
): Generator =>
  Kernel.atomicGenerator({
    InputSchema: Schema.Struct({ content: Schema.String }),
    id: Kernel.identifier(id),
    provides: Kernel.capabilities(id),
    requires: Kernel.capabilities(...requires),
    version: "1",
    render: (input) => {
      onRender?.()
      return Effect.succeed(paths.map((path) => contribution(Kernel, path, owner, input.content)))
    },
  })
const modules = () =>
  Effect.all({
    Catalog: Effect.promise<CatalogModule>(() => import(new URL("../src/catalog.js", import.meta.url).href)),
    Kernel: Effect.promise<KernelModule>(() => import(new URL("../src/kernel.js", import.meta.url).href)),
  })
const compose = <const Generators extends readonly [Generator, ...Generator[]]>(
  Catalog: CatalogModule,
  catalog: import("../src/kernel.js").FiniteCatalog<Generators>,
  context: unknown,
  selected: ReadonlyArray<import("../src/kernel.js").GeneratorId>,
) => Catalog.composeCatalog({ catalog, context, input: { content: "todo\n" }, selected })
it.effect("rejects invalid RenderContext shapes before any generator runs", () =>
  Effect.gen(function* () {
    const { Catalog, Kernel } = yield* modules()
    let renders = 0
    const catalog = Kernel.defineCatalog([generator(Kernel, "model", () => renders++)])
    const selected = [Kernel.identifier("model")]
    const invalid = [
      [{ workspace: { ...context.workspace, npmScope: "acme" } }, "schema"],
      [{ packages: [{ ...context.packages[0], root: "../escape" }] }, "schema"],
      [{ packages: [...context.packages, duplicatePackage] }, "derived-identity"],
      [{ entrypoint: { ...context.entrypoint, importName: "@acme/missing" } }, "derived-identity"],
      [{ unexpected: true }, "schema"],
    ] as const
    for (const [patch, reason] of invalid) {
      const failure = yield* compose(Catalog, catalog, { ...context, ...patch }, selected).pipe(Effect.flip)
      expect(failure).toMatchObject({ _tag: "SchemaContextFailure", boundary: "context", reason })
    }
    expect(renders).toBe(0)
  }),
)
it.effect("closes a finite catalog in deterministic dependency order and snapshots graph authority", () =>
  Effect.gen(function* () {
    const { Catalog, Kernel } = yield* modules()
    const app = { provides: [...Kernel.capabilities("application")], requires: [...Kernel.capabilities("model")] }
    const modelGraph = { provides: [...Kernel.capabilities("model")], requires: [...Kernel.capabilities()] }
    const application = Kernel.atomicGenerator({
      ...generator(Kernel, "application", undefined, ["model"], "application", ["a.ts"]),
      ...app,
    })
    const model = Kernel.atomicGenerator({
      ...generator(Kernel, "model", undefined, [], "model", ["z.ts"]),
      ...modelGraph,
    })
    const catalog = Kernel.defineCatalog([application, model])
    for (const values of [modelGraph.provides, app.requires]) {
      Reflect.apply(Array.prototype.splice, values, [0, 1, Kernel.capability("edge")])
    }
    const first = yield* compose(Catalog, catalog, context, [Kernel.identifier("application")])
    expect(first.generatorIds).toEqual(["model", "application"])
    expect(first.contributions.map((file) => file.path)).toEqual(["a.ts", "z.ts"])
    expect(catalog.flatMap(({ provides, requires }) => [...provides, ...requires])).toEqual(
      Kernel.capabilities("application", "model", "model"),
    )
  }),
)
it.effect("fails closed for missing, cyclic, duplicate catalog, and output path identities", () =>
  Effect.gen(function* () {
    const { Catalog, Kernel } = yield* modules()
    const g = (id: string, requires: ReadonlyArray<string> = [], owner = id, paths?: ReadonlyArray<string>) =>
      generator(Kernel, id, undefined, requires, owner, paths)
    const one = (generator: Generator) => Kernel.defineCatalog([generator])
    const two = (left: Generator, right: Generator) => Kernel.defineCatalog([left, right])
    const graph = (capability: string, reason: string) => ["CapabilityGraphFailure", capability, reason] as const
    const conflict = (identity: string, reason: string) => ["ContributionConflict", identity, reason] as const
    const missing = one(g("application", ["model"]))
    const cyclic = two(g("application", ["model"]), g("model", ["application"]))
    const duplicateId = two(g("same"), g("same"))
    const repeatedOwner = one(g("same-owner", [], "owner", ["one.ts", "two.ts"]))
    const duplicatePath = two(g("first", [], "first", ["same.ts"]), g("second", [], "second", ["same.ts"]))
    const scenarios = [
      [missing, ["application"], graph("model", "missing-capability")],
      [cyclic, ["application"], graph("application", "cyclic-capability")],
      [duplicateId, ["same"], graph("same", "duplicate-generator-id")],
      [duplicatePath, ["first", "second"], conflict("same.ts", "duplicate-path")],
    ] as const
    for (const [catalog, selected, [tag, identity, reason]] of scenarios) {
      const failure = yield* compose(Catalog, catalog, context, selected.map(Kernel.identifier)).pipe(Effect.flip)
      expect(failure).toMatchObject(
        tag === "CapabilityGraphFailure"
          ? { _tag: tag, capability: identity, reason }
          : { _tag: tag, identity, reason },
      )
    }
    const result = yield* compose(Catalog, repeatedOwner, context, [Kernel.identifier("same-owner")])
    expect(result.contributions.map(({ owner, path }) => ({ owner, path }))).toEqual([
      { owner: "owner", path: "one.ts" },
      { owner: "owner", path: "two.ts" },
    ])
  }),
)
