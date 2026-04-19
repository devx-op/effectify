import { Atom } from "effect/unstable/reactivity"
import { Html, Resumability } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const handlerRef = Resumability.makeExecutableRef("app/counter", "onClick")
const liveRef = Resumability.makeExecutableRef("app/counter", "renderLive")
const registry = Resumability.makeLocalRegistry()
const liveAtom = Atom.make("count")

const referencedHandler = Resumability.handler(handlerRef, effectLike)
const referencedLive = Resumability.live(liveRef, (value: string) => Html.text(value))
const registeredHandler = Resumability.registerHandler(registry, handlerRef, effectLike)
const registeredLiveRegion = Resumability.registerLiveRegion(
  registry,
  liveRef,
  liveAtom,
  (value) => Html.text(String(value)),
)
const resolvedHandler = Resumability.resolveHandler(registry, handlerRef)
const resolvedLiveRegion = Resumability.resolveLiveRegion(registry, liveRef)
const createdRenderContract = Resumability.createRenderContract(Html.ssr(Html.text("ready")), {
  buildId: "build-123",
  rootId: "loom-root",
})

type ExecutableRefContract = Expect<Equal<typeof handlerRef, Resumability.ExecutableRef>>
type HandlerContract = Expect<Equal<typeof referencedHandler, Resumability.ReferencedHandler<typeof effectLike>>>
type LiveContract = Expect<Equal<typeof referencedLive, Resumability.ReferencedLiveRegion<string>>>
type LocalRegistryContract = Expect<Equal<typeof registry, Resumability.LocalRegistry>>
type RegisteredHandlerContract = Expect<Equal<typeof registeredHandler, Resumability.LocalRegistry>>
type RegisteredLiveRegionContract = Expect<Equal<typeof registeredLiveRegion, Resumability.LocalRegistry>>
type ResolveHandlerContract = Expect<Equal<typeof resolvedHandler, ReturnType<typeof Resumability.resolveHandler>>>
type ResolveLiveRegionContract = Expect<Equal<typeof resolvedLiveRegion, Resumability.LiveRegionExecutable>>
type EncodeContractParam = Expect<
  Equal<Parameters<typeof Resumability.encodeContract>[0], Resumability.LoomResumabilityContract>
>
type EncodeContractReturn = Expect<Equal<ReturnType<typeof Resumability.encodeContract>, string>>
type DecodeContractReturn = Expect<
  Equal<ReturnType<typeof Resumability.decodeContract>, Promise<Resumability.ContractValidationResult>>
>
type CreateRenderContractReturn = Expect<
  Equal<typeof createdRenderContract, Promise<Resumability.CreatedRenderContractResult>>
>

// @ts-expect-error Resumability.live requires a renderer function.
Resumability.live(liveRef, "not-a-renderer")

export const typecheckSmoke = {
  createdRenderContract,
  referencedHandler,
  referencedLive,
  registeredHandler,
  registeredLiveRegion,
  resolvedHandler,
  resolvedLiveRegion,
}

export type {
  CreateRenderContractReturn,
  DecodeContractReturn,
  EncodeContractParam,
  EncodeContractReturn,
  ExecutableRefContract,
  HandlerContract,
  LiveContract,
  LocalRegistryContract,
  RegisteredHandlerContract,
  RegisteredLiveRegionContract,
  ResolveHandlerContract,
  ResolveLiveRegionContract,
}
