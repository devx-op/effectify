import * as LoomRuntime from "@effectify/loom-runtime"
import type * as Html from "../html.js"

export const makeEventBinding = <Target extends EventTarget, EventType extends Event>(
  event: string,
  handler: Html.EventHandler<Target, EventType>,
): Html.EventBinding<Target, EventType> => LoomRuntime.Runtime.eventBinding(event, handler)
