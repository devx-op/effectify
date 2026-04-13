import * as Effect from "effect/Effect"
import { httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import { NavLink, Outlet, useLocation } from "react-router"
import { redirectLegacyHatchetDemoRequest } from "../../lib/hatchet/legacy.js"
import { withLoaderEffect } from "../../lib/runtime.server.js"

export const hatchetDemoNavItems = [
  { to: "/hatchet-demo/runs", label: "Runs & Events" },
  { to: "/hatchet-demo/schedules", label: "Schedules" },
  { to: "/hatchet-demo/crons", label: "Crons" },
  { to: "/hatchet-demo/filters", label: "Filters" },
  { to: "/hatchet-demo/webhooks", label: "Webhooks" },
  { to: "/hatchet-demo/rate-limits", label: "Rate limits" },
  { to: "/hatchet-demo/management", label: "Management" },
  { to: "/hatchet-demo/observability", label: "Observability" },
] as const

export const loadHatchetDemoLayout = (request: Request) =>
  Effect.gen(function*() {
    const legacyRedirect = redirectLegacyHatchetDemoRequest(request)

    if (legacyRedirect) {
      return yield* httpRedirect(legacyRedirect)
    }

    return yield* httpSuccess({ ok: true })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadHatchetDemoLayout(request)
}).pipe(withLoaderEffect)

export default function HatchetDemoLayout() {
  const location = useLocation()

  return (
    <main className="container">
      <article>
        <header>
          <h2>Hatchet Demo</h2>
          <p>
            Simple route slices for runs, schedules, automation, controls, and observability.
          </p>
        </header>

        <nav aria-label="Hatchet demo navigation">
          <ul>
            {hatchetDemoNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-current={location.pathname === item.to ? "page" : undefined}
                  data-active={location.pathname === item.to ? "true" : "false"}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Outlet />
      </article>
    </main>
  )
}
