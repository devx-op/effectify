import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type {
  HatchetWebhookAuth,
  HatchetWebhookAuthType,
  HatchetWebhookHmacAlgorithm,
  HatchetWebhookHmacEncoding,
  HatchetWebhookSourceName,
} from "@effectify/hatchet"
import { RateLimitDuration } from "@effectify/hatchet"

const webhookSourceNames = [
  "GENERIC",
  "GITHUB",
  "STRIPE",
  "SLACK",
  "LINEAR",
  "SVIX",
] as const satisfies readonly HatchetWebhookSourceName[]
const webhookAuthTypes = [
  "BASIC",
  "API_KEY",
  "HMAC",
] as const satisfies readonly HatchetWebhookAuthType[]
const webhookHmacAlgorithms = [
  "SHA1",
  "SHA256",
  "SHA512",
  "MD5",
] as const satisfies readonly HatchetWebhookHmacAlgorithm[]
const webhookHmacEncodings = [
  "HEX",
  "BASE64",
  "BASE64URL",
] as const satisfies readonly HatchetWebhookHmacEncoding[]

const RATE_LIMIT_DURATION_ERROR = "Rate limit duration must be SECOND, MINUTE, or HOUR"

export type HatchetJsonValue =
  | string
  | number
  | boolean
  | null
  | HatchetJsonObject
  | readonly HatchetJsonValue[]

export interface HatchetJsonObject {
  readonly [key: string]: HatchetJsonValue
}

const assertNonEmpty = (value: string, message: string): string => {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(message)
  }

  return trimmed
}

export const readRequestFormData = (request: Request) =>
  Effect.tryPromise({
    try: () => request.formData(),
    catch: (cause) =>
      new Error(
        cause instanceof Error ? cause.message : "Failed to read form data",
      ),
  })

const isJsonObject = (value: unknown): value is HatchetJsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const parseEventPayload = <
  TPayload extends HatchetJsonObject = HatchetJsonObject,
>(
  input: string,
): TPayload => {
  const parsed = JSON.parse(input) as unknown

  if (!isJsonObject(parsed)) {
    throw new Error("Event payload must be a JSON object")
  }

  return parsed as TPayload
}

export const parseTriggerTime = (input: string): Date => {
  const parsed = new Date(input)

  if (!input.trim() || Number.isNaN(parsed.getTime())) {
    throw new Error("Trigger time must be a valid ISO date")
  }

  return parsed
}

export const parseReplayIntent = (
  formData: FormData,
): { readonly runId: string } => ({
  runId: assertNonEmpty(
    String(formData.get("runId") ?? ""),
    "Run ID is required",
  ),
})

export const parseDeleteWorkflowIntent = (
  formData: FormData,
): { readonly workflowName: string } => {
  const workflowName = assertNonEmpty(
    String(formData.get("workflowName") ?? ""),
    "Workflow name is required",
  )
  const confirmation = assertNonEmpty(
    String(formData.get("confirmWorkflowDelete") ?? ""),
    "Type DELETE to confirm workflow deletion",
  )

  if (confirmation !== "DELETE") {
    throw new Error("Type DELETE to confirm workflow deletion")
  }

  return { workflowName }
}

export const rateLimitDurationOptions = [
  { label: "SECOND", value: "1 second" },
  { label: "MINUTE", value: "1 minute" },
  { label: "HOUR", value: "1 hour" },
] as const

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

export const parseWebhookStaticPayload = (
  input: string,
): HatchetJsonObject | undefined => {
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

export const parseWebhookAuthType = (input: string): HatchetWebhookAuthType => {
  const authType = assertNonEmpty(
    input,
    "Webhook auth type must be BASIC, API_KEY, or HMAC",
  )

  if (webhookAuthTypes.includes(authType as HatchetWebhookAuthType)) {
    return authType as HatchetWebhookAuthType
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
