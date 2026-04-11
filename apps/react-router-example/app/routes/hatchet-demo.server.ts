export const parseEventPayload = (input: string): Record<string, unknown> => {
  const parsed = JSON.parse(input) as unknown

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Event payload must be a JSON object")
  }

  return parsed as Record<string, unknown>
}

export const readSelectedEventId = (requestUrl: string): string | undefined => {
  const eventId = new URL(requestUrl).searchParams.get("eventId")?.trim()
  return eventId ? eventId : undefined
}

export const buildEventRedirect = (eventId: string): string => `/hatchet-demo?eventId=${encodeURIComponent(eventId)}`

export const parseTriggerTime = (input: string): Date => {
  const parsed = new Date(input)

  if (!input.trim() || Number.isNaN(parsed.getTime())) {
    throw new Error("Trigger time must be a valid ISO date")
  }

  return parsed
}

export const readSelectedScheduleId = (
  requestUrl: string,
): string | undefined => {
  const scheduleId = new URL(requestUrl).searchParams.get("scheduleId")?.trim()
  return scheduleId ? scheduleId : undefined
}

export const buildScheduleRedirect = (scheduleId: string): string =>
  `/hatchet-demo?scheduleId=${encodeURIComponent(scheduleId)}`

export const readSelectedCronId = (requestUrl: string): string | undefined => {
  const cronId = new URL(requestUrl).searchParams.get("cronId")?.trim()
  return cronId ? cronId : undefined
}

export const buildCronRedirect = (cronId: string): string => `/hatchet-demo?cronId=${encodeURIComponent(cronId)}`
