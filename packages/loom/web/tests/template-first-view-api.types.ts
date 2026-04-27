import * as Result from "effect/Result"
import {
  Component,
  type ErrorOfRenderable,
  html,
  type Renderable,
  type RequirementsOfRenderable,
  Slot,
  View,
} from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false

type Expect<Value extends true> = Value

interface SaveFailure {
  readonly _tag: "SaveFailure"
  readonly message: string
}

interface SaveGateway {
  readonly save: (value: string) => string
}

interface TitleProps {
  readonly title: string
}

declare const requiredPropsChild: Component.Type<TitleProps, never, never, {}, {}, {}, true>
declare const boundarySubject: Renderable<SaveFailure, SaveGateway>
declare const errorBoundarySubject: Renderable<SaveFailure, never>
declare const requirementsBoundarySubject: Renderable<never, SaveGateway>

class WaitingError extends Error {
  readonly _tag = "WaitingError"
}

class ReadyError extends Error {
  readonly _tag = "ReadyError"
}

interface WaitingGateway {
  readonly queue: () => void
}

interface ReadyGateway {
  readonly publish: () => void
}

const child = Component.make("typed-child").pipe(
  Component.view((): Renderable<SaveFailure, SaveGateway> => html`<span>child</span>`),
)

const title = Component.make("typed-title").pipe(
  Component.view(({ props }: { readonly props: TitleProps | undefined }) => html`<h1>${props?.title}</h1>`),
)

const waiting = Component.make("typed-waiting").pipe(
  Component.view((): Renderable<WaitingError, WaitingGateway> => html`<span>waiting</span>`),
)

const ready = Component.make("typed-ready").pipe(
  Component.view((): Renderable<ReadyError, ReadyGateway> => html`<span>ready</span>`),
)

const layout = Component.make("typed-layout").pipe(
  Component.slots({
    default: Slot.required(),
    header: Slot.optional(),
  }),
  Component.view(({ slots }) => html`<section>${slots.header}${slots.default}</section>`),
)

const parent = Component.make("typed-parent").pipe(
  Component.view(() => View.use(child)),
)

const used = View.use(child)
const handled = View.catchTag("SaveFailure", () => html`<span>handled</span>`)(used)
const recovered = View.catchAll(() => html`<span>fallback</span>`)(handled)
const provided = View.provideService({ save: (value: string) => value } satisfies SaveGateway)(recovered)

const successMatch = View.match(Result.succeed("ready"), {
  onSuccess: (value) => html`<strong>${value}</strong>`,
  onFailure: (error) => html`<strong>${String(error)}</strong>`,
})

const asyncMatch = View.match(() => ({ _tag: "Waiting" } as const), {
  onWaiting: () => View.use(waiting),
  onSuccess: () => View.use(ready),
  onFailure: () => html`<span>failure</span>`,
})

const taggedMatch = View.match({ _tag: "Ready", value: 1 } as const, {
  Ready: ({ value }) => html`<span>${value}</span>`,
  orElse: () => html`<span>fallback</span>`,
})

const propUse = View.use(title, { title: "Hello" })
const slotUse = View.use(layout, {
  default: [html`<span>content</span>`, " tail"],
  header: ["head ", html`<span>slot</span>`],
})

// @ts-expect-error child shorthand is only valid when required props are absent.
const invalidChildShorthand = View.use(requiredPropsChild, html`<span>child</span>`)

const usedError: ErrorOfRenderable<typeof used> | undefined = used.__error
const usedRequirements: RequirementsOfRenderable<typeof used> | undefined = used.__requirements
const parentError: SaveFailure | undefined = parent.__error
const parentRequirements: SaveGateway | undefined = parent.__requirements
const handledError = handled.__error
const providedRequirements = provided.__requirements
const successMatchError = successMatch.__error
const taggedMatchRequirements = taggedMatch.__requirements
const propUseError = propUse.__error
const handledSubject = View.catchTag("SaveFailure", () => View.text("handled"))(boundarySubject)
const recoveredSubject = View.catchAll(() => View.text("fallback"))(errorBoundarySubject)
const providedSubject = View.provideService({ save: (value: string) => value } satisfies SaveGateway)(
  requirementsBoundarySubject,
)
const recoveredBoundary: Renderable<never, never> = recoveredSubject
const providedBoundary: Renderable<never, never> = providedSubject

type HandledRequirementsContract = Expect<Equal<RequirementsOfRenderable<typeof handledSubject>, SaveGateway>>
type AsyncMatchErrorContract = Expect<Equal<ErrorOfRenderable<typeof asyncMatch>, WaitingError | ReadyError>>
type AsyncMatchRequirementsContract = Expect<
  Equal<RequirementsOfRenderable<typeof asyncMatch>, WaitingGateway | ReadyGateway>
>
type TypeContracts = [
  HandledRequirementsContract,
  AsyncMatchErrorContract,
  AsyncMatchRequirementsContract,
]

const typeContracts: TypeContracts = [true, true, true]

export const typecheckSmoke = {
  child,
  title,
  waiting,
  ready,
  layout,
  parent,
  used,
  handled,
  recovered,
  provided,
  usedError,
  usedRequirements,
  parentError,
  parentRequirements,
  handledError,
  providedRequirements,
  successMatchError,
  taggedMatchRequirements,
  propUseError,
  successMatch,
  asyncMatch,
  taggedMatch,
  propUse,
  slotUse,
  invalidChildShorthand,
  handledSubject,
  recoveredSubject,
  providedSubject,
  recoveredBoundary,
  providedBoundary,
  typeContracts,
}
