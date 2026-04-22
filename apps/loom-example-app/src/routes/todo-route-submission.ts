import type { Runtime } from "@effectify/loom-router"

export interface TodoRouteSubmissionResult {
  readonly action: {
    readonly _tag: string
  }
  readonly loader?: unknown
}

export const submitTodoRouteSubmission = async (
  submission: Runtime.Submission,
): Promise<TodoRouteSubmissionResult> => {
  const { submitTodoRuntimeAction } = await import("../router-runtime.js")

  return submitTodoRuntimeAction(submission)
}
