import { Link } from "react-router"
import { hatchetDemoNavItems } from "./route.js"

const overviewItems = [
  {
    title: "Start with runs",
    description: "Kick off a workflow, push an event, and inspect recent activity.",
    to: "/hatchet-demo/runs",
  },
  {
    title: "Automate time-based work",
    description: "Schedules and crons stay isolated so each flow teaches one thing.",
    to: "/hatchet-demo/schedules",
  },
  {
    title: "Inspect the system",
    description: "Observability keeps metrics and logs together without loading every slice.",
    to: "/hatchet-demo/observability",
  },
] as const

export default function HatchetDemoIndex() {
  return (
    <section>
      <h3>Focused Hatchet walkthroughs</h3>
      <p>
        The demo now uses child routes so each page stays small while the overall integration story remains easy to
        follow.
      </p>

      <ul>
        {overviewItems.map((item) => (
          <li key={item.to}>
            <h4>
              <Link to={item.to}>{item.title}</Link>
            </h4>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>

      <p>
        Available slices: {hatchetDemoNavItems.map((item) => item.label).join(", ")}.
      </p>
    </section>
  )
}
