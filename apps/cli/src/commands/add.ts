import * as Args from '@effect/cli/Args'
import * as Command from '@effect/cli/Command'
import * as Options from '@effect/cli/Options'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

// Arguments and options for add command
const componentNameArg = Args.text({ name: 'component-name' }).pipe(
  Args.withDescription('Name of the component to add'),
)

const registryOption = Options.text('registry').pipe(
  Options.withAlias('r'),
  Options.withDescription('Registry to use for the component'),
  Options.withDefault('@effectify/ui'),
)

const versionOption = Options.text('version').pipe(
  Options.withAlias('v'),
  Options.withDescription('Specific version of the component to install'),
  Options.optional,
)

const pathOption = Options.text('path').pipe(
  Options.withAlias('p'),
  Options.withDescription('Custom path to install the component'),
  Options.optional,
)

// Add component logic
const addComponent = (
  options: {
    registry: string
    version?: string
    path?: string
  },
  componentName: string,
) =>
  Effect.gen(function* () {
    yield* Console.log(`📦 Adding component: ${componentName}`)
    yield* Console.log(`🏪 Registry: ${options.registry}`)

    if (options.version) {
      yield* Console.log(`🏷️  Version: ${options.version}`)
    }

    if (options.path) {
      yield* Console.log(`📁 Custom path: ${options.path}`)
    }

    // TODO: Implement actual component installation logic
    yield* Console.log('⚠️  Component installation not yet implemented')
  })

// Export the add command
export const addCommand = Command.make(
  'add',
  {
    componentName: componentNameArg,
    registry: registryOption,
    version: versionOption,
    path: pathOption,
  },
  ({ componentName, registry, version, path }) =>
    addComponent(
      {
        registry,
        version: Option.getOrUndefined(version),
        path: Option.getOrUndefined(path),
      },
      componentName,
    ),
)
