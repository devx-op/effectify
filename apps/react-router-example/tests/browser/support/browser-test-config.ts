export const defaultBrowserTestBaseUrl = "http://127.0.0.1:3100"

export function resolveBrowserTestBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.BROWSER_TEST_BASE_URL || defaultBrowserTestBaseUrl
}
