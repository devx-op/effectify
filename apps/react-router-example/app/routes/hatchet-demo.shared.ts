import * as Duration from "effect/Duration"
import type {
  HatchetWebhookAuth,
  HatchetWebhookHmacAlgorithm,
  HatchetWebhookHmacEncoding,
  HatchetWebhookSourceName,
} from "@effectify/hatchet"
import { RateLimitDuration } from "@effectify/hatchet"

const RATE_LIMIT_DURATION_ERROR = "Rate limit duration must be SECOND, MINUTE, or HOUR"

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

export const readSelectedFilterId = (
  requestUrl: string,
): string | undefined => {
  const filterId = new URL(requestUrl).searchParams.get("filterId")?.trim()
  return filterId ? filterId : undefined
}

export const buildFilterRedirect = (filterId: string): string =>
  `/hatchet-demo?filterId=${encodeURIComponent(filterId)}`

export const readSelectedRunId = (requestUrl: string): string | undefined => {
  const runId = new URL(requestUrl).searchParams.get("runId")?.trim()
  return runId ? runId : undefined
}

export const readSelectedTaskId = (requestUrl: string): string | undefined => {
  const taskId = new URL(requestUrl).searchParams.get("taskId")?.trim()
  return taskId ? taskId : undefined
}

export const buildRunRedirect = (runId: string): string => `/hatchet-demo?runId=${encodeURIComponent(runId)}`

export const rateLimitDurationOptions = [
  {
    label: "SECOND",
    value: "1 second",
  },
  {
    label: "MINUTE",
    value: "1 minute",
  },
  {
    label: "HOUR",
    value: "1 hour",
  },
] as const

export const readSelectedRateLimitKey = (
  requestUrl: string,
): string | undefined => {
  const rateLimitKey = new URL(requestUrl).searchParams
    .get("rateLimitKey")
    ?.trim()
  return rateLimitKey ? rateLimitKey : undefined
}

export const buildRateLimitRedirect = (rateLimitKey: string): string =>
  `/hatchet-demo?rateLimitKey=${encodeURIComponent(rateLimitKey)}`

export const parseRateLimitDuration = (input: string): Duration.Input => {
  const normalized = assertNonEmpty(input, RATE_LIMIT_DURATION_ERROR)
    .toUpperCase()
    .trim()

  switch (normalized) {
    case "SECOND":
    case "1 SECOND":
    case `${RateLimitDuration.SECOND}`:
      return "1 second"
    case "MINUTE":
    case "1 MINUTE":
    case `${RateLimitDuration.MINUTE}`:
      return "1 minute"
    case "HOUR":
    case "1 HOUR":
    case `${RateLimitDuration.HOUR}`:
      return "1 hour"
  }

  throw new Error(RATE_LIMIT_DURATION_ERROR)
}

const webhookSourceNames = [
  "GENERIC",
  "GITHUB",
  "STRIPE",
  "SLACK",
  "LINEAR",
  "SVIX",
] as const
const webhookAuthTypes = ["BASIC", "API_KEY", "HMAC"] as const
const webhookHmacAlgorithms = ["SHA1", "SHA256", "SHA512", "MD5"] as const
const webhookHmacEncodings = ["HEX", "BASE64", "BASE64URL"] as const

type SupportedWebhookAuthType = (typeof webhookAuthTypes)[number]

const assertNonEmpty = (value: string, message: string): string => {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(message)
  }

  return trimmed
}

export const readSelectedWebhookName = (
  requestUrl: string,
): string | undefined => {
  const webhookName = new URL(requestUrl).searchParams
    .get("webhookName")
    ?.trim()
  return webhookName ? webhookName : undefined
}

export const buildWebhookRedirect = (webhookName: string): string =>
  `/hatchet-demo?webhookName=${encodeURIComponent(webhookName)}`

export const parseWebhookStaticPayload = (
  input: string,
): Record<string, unknown> | undefined => {
  if (!input.trim()) {
    return undefined
  }

  return parseEventPayload(input)
}

export const parseWebhookSourceName = (
  input: string,
): HatchetWebhookSourceName => {
  const sourceName = assertNonEmpty(input, "Webhook source is required")

  if (webhookSourceNames.includes(sourceName as HatchetWebhookSourceName)) {
    return sourceName as HatchetWebhookSourceName
  }

  throw new Error(`Unsupported webhook source: ${sourceName}`)
}

export const parseWebhookAuthType = (
  input: string,
): SupportedWebhookAuthType => {
  const authType = assertNonEmpty(
    input,
    "Webhook auth type must be BASIC, API_KEY, or HMAC",
  )

  if (webhookAuthTypes.includes(authType as SupportedWebhookAuthType)) {
    return authType as SupportedWebhookAuthType
  }

  throw new Error("Webhook auth type must be BASIC, API_KEY, or HMAC")
}

export const parseWebhookAuth = (formData: FormData): HatchetWebhookAuth => {
  const authType = parseWebhookAuthType(
    String(formData.get("webhookAuthType") ?? ""),
  )

  if (authType === "BASIC") {
    return {
      authType,
      username: assertNonEmpty(
        String(formData.get("webhookUsername") ?? ""),
        "Webhook username is required for BASIC auth",
      ),
      password: assertNonEmpty(
        String(formData.get("webhookPassword") ?? ""),
        "Webhook password is required for BASIC auth",
      ),
    }
  }

  if (authType === "API_KEY") {
    return {
      authType,
      headerName: assertNonEmpty(
        String(formData.get("webhookHeaderName") ?? ""),
        "Webhook header name is required for API_KEY auth",
      ),
      apiKey: assertNonEmpty(
        String(formData.get("webhookApiKey") ?? ""),
        "Webhook API key is required for API_KEY auth",
      ),
    }
  }

  const algorithm = assertNonEmpty(
    String(formData.get("webhookHmacAlgorithm") ?? ""),
    "Webhook HMAC algorithm is required for HMAC auth",
  )
  const encoding = assertNonEmpty(
    String(formData.get("webhookHmacEncoding") ?? ""),
    "Webhook HMAC encoding is required for HMAC auth",
  )

  if (
    !webhookHmacAlgorithms.includes(algorithm as HatchetWebhookHmacAlgorithm)
  ) {
    throw new Error(`Unsupported webhook HMAC algorithm: ${algorithm}`)
  }

  if (!webhookHmacEncodings.includes(encoding as HatchetWebhookHmacEncoding)) {
    throw new Error(`Unsupported webhook HMAC encoding: ${encoding}`)
  }

  return {
    authType,
    algorithm: algorithm as HatchetWebhookHmacAlgorithm,
    encoding: encoding as HatchetWebhookHmacEncoding,
    signatureHeaderName: assertNonEmpty(
      String(formData.get("webhookSignatureHeaderName") ?? ""),
      "Webhook signature header is required for HMAC auth",
    ),
    signingSecret: assertNonEmpty(
      String(formData.get("webhookSigningSecret") ?? ""),
      "Webhook signing secret is required for HMAC auth",
    ),
  }
}
