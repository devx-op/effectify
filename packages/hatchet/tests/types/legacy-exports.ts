import * as PublicApi from "../../src/index.js"
import * as TestingApi from "../../src/testing/index.js"

// @ts-expect-error removed alpha root export
const removedWorkflow = PublicApi.workflow
// @ts-expect-error removed alpha root export
const removedTask = PublicApi.task
// @ts-expect-error removed alpha root export
const removedRegisterWorkflow = PublicApi.registerWorkflow
// @ts-expect-error removed alpha root export
const removedRegisterWorkflowWithConfig = PublicApi.registerWorkflowWithConfig

// @ts-expect-error TaskFailureError is not emitted by PR 1 and is not public.
const taskFailureError = PublicApi.TaskFailureError
// @ts-expect-error TaskInterruptedError is not emitted by PR 1 and is not public.
const taskInterruptedError = PublicApi.TaskInterruptedError
// @ts-expect-error WorkerShutdownError is not emitted by PR 1 and is not public.
const workerShutdownError = PublicApi.WorkerShutdownError
// @ts-expect-error RegisteredTask was an obsolete manual registration capability.
const registeredTask = PublicApi.RegisteredTask
// @ts-expect-error manual registration is not part of the task-first Hatchet API.
const register = PublicApi.Hatchet.register
// @ts-expect-error manual worker startup is owned by Hatchet.layer.
const startWorker = PublicApi.Hatchet.startWorker
// @ts-expect-error direct live options are internal to Hatchet.layer acquisition.
const directOptions: PublicApi.Hatchet.DirectOptions = {
  worker: { name: "legacy" },
}
// @ts-expect-error the previous live-options alias is also absent.
const liveOptions: PublicApi.Hatchet.LiveOptions = {
  worker: { name: "legacy" },
}
// @ts-expect-error HatchetRuntime was implementation plumbing.
const runtime = PublicApi.HatchetRuntime
// @ts-expect-error legacy mock-client helpers were removed from the testing subpath.
const mockClient = TestingApi.createMockHatchetClient
// @ts-expect-error legacy mock-context helpers were removed from the testing subpath.
const mockContext = TestingApi.createMockContext

void removedWorkflow
void removedTask
void removedRegisterWorkflow
void removedRegisterWorkflowWithConfig
void taskFailureError
void taskInterruptedError
void workerShutdownError
void registeredTask
void register
void startWorker
void directOptions
void liveOptions
void runtime
void mockClient
void mockContext

// @ts-expect-error removed alpha public subpath
await import("../../src/workflow/index.js")
// @ts-expect-error removed alpha public subpath
await import("../../src/effectifier/index.js")
// @ts-expect-error removed 0.1 legacy client graph
await import("../../src/clients/index.js")
// @ts-expect-error removed 0.1 legacy core graph
await import("../../src/core/index.js")
// @ts-expect-error removed 0.1 legacy logging graph
await import("../../src/logging/index.js")
// @ts-expect-error removed 0.1 legacy schema graph
await import("../../src/schema/index.js")
// @ts-expect-error removed 0.1 mock-client deep path
await import("../../src/testing/mock-client.js")
// @ts-expect-error removed 0.1 mock-context deep path
await import("../../src/testing/mock-context.js")
