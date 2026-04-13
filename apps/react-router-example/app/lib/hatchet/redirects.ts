const buildRedirect = (path: string, key: string, value: string): string =>
  `${path}?${key}=${encodeURIComponent(value)}`

export const buildEventRedirect = (eventId: string): string => buildRedirect("/hatchet-demo/runs", "eventId", eventId)

export const buildRunRedirect = (runId: string): string => buildRedirect("/hatchet-demo/runs", "runId", runId)

export const buildReplayRedirect = (runId: string): string => buildRunRedirect(runId)

export const buildScheduleRedirect = (scheduleId: string): string =>
  buildRedirect("/hatchet-demo/schedules", "scheduleId", scheduleId)

export const buildCronRedirect = (cronId: string): string => buildRedirect("/hatchet-demo/crons", "cronId", cronId)

export const buildFilterRedirect = (filterId: string): string =>
  buildRedirect("/hatchet-demo/filters", "filterId", filterId)

export const buildWebhookRedirect = (webhookName: string): string =>
  buildRedirect("/hatchet-demo/webhooks", "webhookName", webhookName)

export const buildRateLimitRedirect = (rateLimitKey: string): string =>
  buildRedirect("/hatchet-demo/rate-limits", "rateLimitKey", rateLimitKey)
