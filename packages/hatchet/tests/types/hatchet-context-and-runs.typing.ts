import type { Effect } from "effect"
import { Hatchet as HatchetClientSDK } from "@hatchet-dev/typescript-sdk"
import {
  type BranchDurableTaskResult,
  createWorkflow,
  type HatchetTaskContext,
  type ReplayRunResult,
  type RestoreTaskResult,
  type RunDetails,
  type RunSummary,
} from "../../src"
import type { HatchetWorkflowError } from "../../src/core/error"
import { createMockContext } from "../../src/testing/mock-context"

type HatchetClientType = InstanceType<typeof HatchetClientSDK>
type SdkRunDetails = Awaited<ReturnType<HatchetClientType["runs"]["get"]>>
type SdkRunSummary = NonNullable<
  Awaited<ReturnType<HatchetClientType["runs"]["list"]>>["rows"]
>[number]
type SdkReplayRunResult = Awaited<
  ReturnType<HatchetClientType["runs"]["replay"]>
>["data"]
type SdkRestoreTaskResult = Awaited<
  ReturnType<HatchetClientType["runs"]["restoreTask"]>
>["data"]
type SdkBranchDurableTaskResult = Awaited<
  ReturnType<HatchetClientType["runs"]["branchDurableTask"]>
>["data"]

const mockContext: HatchetTaskContext = createMockContext({
  input: { orderId: "order-1" },
})

const unsupportedCreateWorkflowEffect: Effect.Effect<
  never,
  HatchetWorkflowError,
  never
> = createWorkflow("orders.process")

const runDetails: RunDetails = {} as SdkRunDetails
const runSummary: RunSummary = {} as SdkRunSummary
const replayRunResult: ReplayRunResult = {} as SdkReplayRunResult
const restoreTaskResult: RestoreTaskResult = {} as SdkRestoreTaskResult
const branchDurableTaskResult: BranchDurableTaskResult = {} as SdkBranchDurableTaskResult

void mockContext
void unsupportedCreateWorkflowEffect
void runDetails
void runSummary
void replayRunResult
void restoreTaskResult
void branchDurableTaskResult
