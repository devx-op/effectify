const legacyRedirects = [
  {
    path: "/hatchet-demo/observability",
    params: ["taskId"],
  },
  {
    path: "/hatchet-demo/runs",
    params: ["eventId", "runId"],
  },
  {
    path: "/hatchet-demo/schedules",
    params: ["scheduleId"],
  },
  {
    path: "/hatchet-demo/crons",
    params: ["cronId"],
  },
  {
    path: "/hatchet-demo/filters",
    params: ["filterId"],
  },
  {
    path: "/hatchet-demo/webhooks",
    params: ["webhookName"],
  },
  {
    path: "/hatchet-demo/rate-limits",
    params: ["rateLimitKey"],
  },
] as const

export const redirectLegacyHatchetDemoRequest = (
  request: Request,
): string | undefined => {
  const url = new URL(request.url)

  if (url.pathname !== "/hatchet-demo") {
    return undefined
  }

  for (const redirect of legacyRedirects) {
    if (redirect.params.some((param) => url.searchParams.has(param))) {
      return `${redirect.path}${url.search}`
    }
  }

  return undefined
}
