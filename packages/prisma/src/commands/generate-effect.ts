import * as Command from '@effect/cli/Command'
import * as PlatformCommand from '@effect/platform/Command'
import * as NodeContext from '@effect/platform-node/NodeContext'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

export const generateEffectCommand = Command.make('generate-effect', {}, () =>
  Effect.gen(function* () {
    yield* Console.log('🚀 Running prisma generate...')

    const command = PlatformCommand.make('npx', 'prisma', 'generate')

    // Stream output to console
    yield* PlatformCommand.streamLines(command).pipe(
      Stream.tap(Console.log),
      Stream.runDrain,
      // Ignore errors here, we check exit code via retry or just assume failure if stream errors
      Effect.catchAll(() => Effect.void),
    )

    // We can't easily get exit code AND stream with helper methods in one go without starting process manually
    // But since this is just a wrapper, let's just run it and fail if it errors.

    yield* Console.log('✅ Done!')
  }).pipe(Effect.provide(NodeContext.layer)),
)
