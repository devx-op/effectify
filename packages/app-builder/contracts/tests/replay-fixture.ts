const version = { major: 1, minor: 0, patch: 0 }
const reference = (id: string) => ({ id, version })

export const replayFixture = (options: { readonly reverseSteps?: boolean; readonly validationKey?: string } = {}) => {
  const steps = [
    {
      _tag: "ToolStep",
      stepKey: "read",
      toolRef: reference("tool:read"),
      pinnedInputs: [{ inputKey: "path", schemaRef: reference("schema:path"), value: { root: "/workspace" } }],
    },
    {
      _tag: "CallbackStep",
      stepKey: "confirm",
      callback: { callbackRef: reference("callback:confirm"), responseSchemaRef: reference("schema:confirm") },
    },
  ]

  return {
    protocolRef: reference("protocol:app-builder"),
    declarations: [
      {
        ref: reference("tool:read"),
        input: {
          ref: reference("schema:path"),
          document: { type: "object", properties: { root: { type: "string" } } },
        },
        output: { ref: reference("schema:result"), document: { type: "string" } },
        error: { ref: reference("schema:error"), document: { type: "null" } },
        requirements: [{ kind: "permission", metadata: { name: "workspace:read" } }],
      },
    ],
    plan: { planRef: reference("plan:release"), steps: options.reverseSteps ? [...steps].reverse() : steps },
    pinnedInputs: [{ inputKey: "root", schemaRef: reference("schema:path"), value: { b: 2, a: 1 } }],
    callbacks: [{ callbackRef: reference("callback:confirm"), responseSchemaRef: reference("schema:confirm") }],
    continuations: [{ continuationRef: reference("continuation:next"), responseSchemaRef: reference("schema:next") }],
    provenance: { runRef: reference("run:certification"), traceRef: reference("trace:fixture") },
    baselines: [{ planRef: reference("plan:release") }],
    validations: [{ _tag: "Accepted", validationKey: options.validationKey ?? "schema-valid" }],
    expectations: [{ _tag: "Equivalent", expectationKey: "same-material" }],
    digestClaims: [
      {
        id: "digest:replay-material",
        version,
        algorithm: "sha256",
        value: "55e5182971d95806bc67a72c04387e34e8a81e2001ab258058534f95b90e4b1f",
      },
    ],
  }
}
