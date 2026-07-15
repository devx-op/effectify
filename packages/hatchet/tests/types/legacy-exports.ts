import * as PublicApi from "../../src/index.js"

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

void removedWorkflow
void removedTask
void removedRegisterWorkflow
void removedRegisterWorkflowWithConfig
void taskFailureError
void taskInterruptedError
void workerShutdownError

// @ts-expect-error removed alpha public subpath
await import("../../src/workflow/index.js")
// @ts-expect-error removed alpha public subpath
await import("../../src/effectifier/index.js")
