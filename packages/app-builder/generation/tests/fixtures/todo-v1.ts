type Entry = ReadonlyArray<string>
/** Frozen Todo v1 bytes and ownership transitions; never derive this from a renderer. */
export const TodoV1Fixture: ReadonlyArray<Entry> = Object.freeze(
  `apps/todo-cli/package.json|1f7e39c504515ed23d106e172ccc2f0ef91186021b3a02e9066fe14ea4e2783e|@effectify/app-builder/workspace/1|package-surface-presentation-manifest
apps/todo-cli/src/index.ts|40f8ce0bfcb8db9c548ef19dd3509319e2c69ad03b27c57914d4788536b43eb5|@effectify/app-builder/presentation/1|package-surface-presentation-barrel
apps/todo-cli/tests/todo.test.ts|77b9145ff6a68b6c4660948ab8066e3e3091500e61135cbba4f748395f3d8074|@effectify/app-builder/presentation/1|todo-presentation-apps-todo-cli-tests-todo-test-ts
nx.json|2f79ffcab40a80ced827e38e9871be1e666c3d648e4550ac09893459a8ab42a0|@effectify/app-builder/workspace/1|workspace-surface-nx-json
package.json|3b369e67b69581211e14df72d231a2331399888fe8f16c5095bab03b4616e426|@effectify/app-builder/workspace/1|workspace-surface-package-json
packages/todo/application/package.json|74a25e6b222c0e8e6ce8cf39df7e7a68d7b68faaaf01a1321d6d1c521f147f00|@effectify/app-builder/workspace/1|package-surface-application-manifest
packages/todo/application/src/index.ts|a606cc63ce4e3ab6eeb2345cdaf9c4bbd3bfb43f5a20f26bff250439194a154b|@effectify/app-builder/port/1|package-surface-application-barrel
packages/todo/application/src/use-case.ts|fce13645ef2926c343137b96fd0b2a0cd9b2e73046d8608ff3daa7204755c7df|@effectify/app-builder/use-case/1|todo-use-case-packages-todo-application-src-use-case-ts
packages/todo/domain/package.json|9ed2f277b6b9bf848e1c077d7a600aea00c391a05d558cc6ba0ca8134023baca|@effectify/app-builder/workspace/1|package-surface-domain-manifest
packages/todo/domain/src/events.ts|3826f139fcac911e8b84298d319400e2265730c62460b40501b3c1668be950f8|@effectify/app-builder/event/1|todo-event-packages-todo-domain-src-events-ts
packages/todo/domain/src/index.ts|e003ca3479b14b5d3f94fdd0c8db7ffe20269aad29628e0d09f7f367cd2cc7f8|@effectify/app-builder/model/1|package-surface-domain-barrel
packages/todo/domain/tests/todo.test.ts|99e4f463a497275f7bf6dacbe0402dde1b054dbe8e0568256dccd6a6a5448514|@effectify/app-builder/model/1|todo-model-packages-todo-domain-tests-todo-test-ts
packages/todo/infrastructure/package.json|5a28a70e873ee887a1819bafa2f11ae4d47cd44aaaac410d621493346d186889|@effectify/app-builder/workspace/1|package-surface-infrastructure-manifest
packages/todo/infrastructure/src/index.ts|73bfa06f4aac3cfee6fad9425490d86dbfab70ec79a69d2559a41c93bd391e35|@effectify/app-builder/integration-adapter/1|package-surface-infrastructure-barrel
packages/todo/infrastructure/tests/todo-runtime.test.ts|8a305172097e942a07398ee5bfeec90e2a84a07ea5b97050138c8549dcf9949a|@effectify/app-builder/integration-adapter/1|todo-integration-adapter-packages-todo-infrastructure-tests-todo-runtime-test-ts
pnpm-workspace.yaml|38153e8982dc83ad4f576c62dd12e80fd222668b7ebd29c9c89092a41bf10544|@effectify/app-builder/workspace/1|workspace-surface-pnpm-workspace-yaml
tsconfig.build.json|a12ff29d34e79ed58b9d9540572968f6f32721482f776500b2f2495810926138|@effectify/app-builder/workspace/1|workspace-surface-tsconfig-build-json
vitest.config.mts|3d6177cfd34114394a841bb24fdf661f2879b0b75cfe2d793ae414d2191081de|@effectify/app-builder/workspace/1|workspace-surface-vitest-config-mts`
    .split("\n")
    .map((line) => Object.freeze(line.split("|"))),
)
