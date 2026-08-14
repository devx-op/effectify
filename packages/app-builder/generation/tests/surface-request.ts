type GenerationModule = typeof import("@effectify/app-builder-generation")

export const surfaceRequest = (Generation: GenerationModule, scope: string, workspace: string) => ({
  catalog: Generation.TodoGeneration.SurfaceCatalog,
  context: {
    version: "effectify.render-context/1" as const,
    workspace: { name: workspace, npmScope: scope },
    domain: { id: "task", name: "Task", importName: `${scope}/task-core` },
    entity: { id: "task", singular: "Task", plural: "Tasks" },
    entrypoint: { id: "task-app", name: "TaskApp", importName: `${scope}/task-app` },
    packages: [
      { id: "domain", name: `${scope}/task-core`, root: "packages/task/core" },
      { id: "application", name: `${scope}/task-app`, root: "apps/task-app" },
    ],
  },
  input: {
    packages: [
      { dependencies: [], exports: [{ from: "./domain.js", name: "TaskDomain" }], packageId: "domain" },
      { dependencies: ["domain"], exports: [{ from: "./task.js", name: "Task" }], packageId: "application" },
    ],
  },
  selected: [
    Generation.GenerationKernel.identifier("workspace-surface"),
    Generation.GenerationKernel.identifier("package-surface"),
  ],
})
