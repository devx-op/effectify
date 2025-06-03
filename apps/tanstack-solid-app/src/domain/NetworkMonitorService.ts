import * as Chunk from 'effect/Chunk'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export class NetworkMonitor extends Effect.Service<NetworkMonitor>()('NetworkMonitor', {
  effect: Effect.gen(function* () {
    const latch = yield* Effect.makeLatch(true)
    yield* Effect.log('Created NetworkMonitor')

    const ref = yield* SubscriptionRef.make<boolean>(window.navigator.onLine)

    yield* Stream.async<boolean>((emit) => {
      window.addEventListener('online', () => emit(Effect.succeed(Chunk.of(true))))
      window.addEventListener('offline', () => emit(Effect.succeed(Chunk.of(false))))
    }).pipe(
      Stream.tap((isOnline) =>
        (isOnline ? latch.open : latch.close).pipe(Effect.zipRight(SubscriptionRef.update(ref, () => isOnline))),
      ),
      Stream.runDrain,
      Effect.forkDaemon,
    )

    return { latch, ref }
  }),
  accessors: true,
}) {}
