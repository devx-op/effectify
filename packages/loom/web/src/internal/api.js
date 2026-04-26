import * as LoomRuntime from "@effectify/loom-runtime"
export const makeEventBinding = (event, handler) => LoomRuntime.Runtime.eventBinding(event, handler)
