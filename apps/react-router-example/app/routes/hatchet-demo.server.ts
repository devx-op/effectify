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
