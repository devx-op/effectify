import type * as Html from "../html.js"
export declare const makeEventBinding: <Target extends EventTarget, EventType extends Event>(
  event: string,
  handler: Html.EventHandler<Target, EventType>,
) => Html.EventBinding<Target, EventType>
