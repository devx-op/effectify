import * as Args from '@effect/cli/Args'
import * as Command from '@effect/cli/Command'
import * as Options from '@effect/cli/Options'
import * as FileSystem from '@effect/platform/FileSystem'
import * as Path from '@effect/platform/Path'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

// Arguments and options for create command
const projectNameArg = Args.text({ name: 'project-name' }).pipe(Args.withDescription('Name of the project to create'))

const templateOption = Options.text('template').pipe(
  Options.withAlias('t'),
  Options.withDescription('Template to use for the project (monorepo, react-app, solid-app)'),
  Options.withDefault('monorepo'),
)

const featuresOption = Options.text('features').pipe(
  Options.withAlias('f'),
  Options.withDescription('Comma-separated list of features to include'),
  Options.optional,
)

const packageManagerOption = Options.text('package-manager').pipe(
  Options.withAlias('pm'),
  Options.withDescription('Package manager to use (npm, yarn, pnpm, bun)'),
  Options.withDefault('bun'),
)

// Create project logic
const createProject = (
  options: {
    template: string
    features?: string
    packageManager: string
  },
  projectName: string,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* Console.log(`🚀 Creating project: ${projectName}`)
    yield* Console.log(`📋 Template: ${options.template}`)

    if (options.features) {
      const featureList = options.features.split(',').map((f) => f.trim())
      yield* Console.log(`✨ Features: ${featureList.join(', ')}`)
    }

    yield* Console.log(`📦 Package Manager: ${options.packageManager}`)

    // Check if template exists
    const templatePath = path.join(process.cwd(), 'templates', options.template)
    const templateExists = yield* fs.exists(templatePath)

    if (!templateExists) {
      yield* Console.error(`❌ Template '${options.template}' not found`)
      yield* Console.log('Available templates: monorepo, react-app, solid-app')
      return
    }

    // Create project directory
    const projectPath = path.join(process.cwd(), projectName)
    const projectExists = yield* fs.exists(projectPath)

    if (projectExists) {
      yield* Console.error(`❌ Directory '${projectName}' already exists`)
      return
    }

    yield* Console.log(`� Creating project directory: ${projectPath}`)
    yield* fs.makeDirectory(projectPath, { recursive: true })

    // TODO: Copy template files and process them
    yield* Console.log('⚠️  Template processing not yet implemented')
    yield* Console.log('✅ Project structure created successfully!')
  })

// Create command
export const createCommand = Command.make(
  'create',
  {
    projectName: projectNameArg,
    template: templateOption,
    features: featuresOption,
    packageManager: packageManagerOption,
  },
  ({ projectName, template, features, packageManager }) =>
    createProject(
      {
        template,
        features: Option.getOrUndefined(features),
        packageManager,
      },
      projectName,
    ),
)
