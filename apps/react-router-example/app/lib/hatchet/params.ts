const readSelectedParam = (
  requestUrl: string,
  key: string,
): string | undefined => {
  const value = new URL(requestUrl).searchParams.get(key)?.trim()
  return value ? value : undefined
}

export const readSelectedEventId = (requestUrl: string): string | undefined => readSelectedParam(requestUrl, "eventId")

export const readSelectedRunId = (requestUrl: string): string | undefined => readSelectedParam(requestUrl, "runId")

export const readSelectedTaskId = (requestUrl: string): string | undefined => readSelectedParam(requestUrl, "taskId")

export const readSelectedScheduleId = (
  requestUrl: string,
): string | undefined => readSelectedParam(requestUrl, "scheduleId")

export const readSelectedCronId = (requestUrl: string): string | undefined => readSelectedParam(requestUrl, "cronId")

export const readSelectedFilterId = (requestUrl: string): string | undefined =>
  readSelectedParam(requestUrl, "filterId")

export const readSelectedWebhookName = (
  requestUrl: string,
): string | undefined => readSelectedParam(requestUrl, "webhookName")

export const readSelectedRateLimitKey = (
  requestUrl: string,
): string | undefined => readSelectedParam(requestUrl, "rateLimitKey")
