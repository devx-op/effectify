import * as Effect from "effect/Effect"
import type { TodoPlan } from "@effectify/app-builder-generation"

/** Renders the canonical plan envelope without applying it or invoking a CLI runtime. */
export const renderTodoPlan = (plan: TodoPlan): Effect.Effect<string> => Effect.succeed(JSON.stringify(plan))
