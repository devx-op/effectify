export interface HatchetTaskSummaryRecord {
  readonly metadata: object
  readonly createdAt: string
  readonly displayName: string
  readonly input: object
  readonly numSpawnedChildren: number
  readonly output: object
  readonly status: string
  readonly taskExternalId: string
  readonly taskId: number
  readonly taskInsertedAt: string
  readonly tenantId: string
  readonly type: string
  readonly workflowId: string
  readonly workflowName?: string
  readonly workflowRunExternalId: string
}

export interface HatchetWorkflowRunRecord {
  readonly metadata: object
  readonly status: string
  readonly tenantId: string
  readonly displayName: string
  readonly workflowId: string
  readonly input: object
  readonly output: object
}

export interface HatchetWorkflowRunDetailsRecord {
  readonly run: HatchetWorkflowRunRecord
  readonly taskEvents: readonly unknown[]
  readonly shape: {
    readonly items: readonly unknown[]
    readonly triggerExternalId?: string
  }
  readonly tasks: readonly HatchetTaskSummaryRecord[]
}
