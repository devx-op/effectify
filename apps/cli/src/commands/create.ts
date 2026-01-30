import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as Prompt from "@effect/cli/Prompt"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

// Arguments and options for create command
const projectNameArg = Args.text({ name: "projectName" }).pipe(Args.withDescription("Name of the project to create"))

const templateOption = Options.choice("template", ["monorepo", "backend-only", "frontend-only", "cli"]).pipe(
  Options.withAlias("t"),
  Options.withDescription("Template to use for the project"),
  Options.withDefault("monorepo"),
)

// Available features for multiselect
const availableFeatures = [
  { title: "Authentication", value: "auth", description: "Add authentication system with better-auth" },
  { title: "UI Components", value: "ui", description: "Include UI component library" },
  { title: "Testing Setup", value: "testing", description: "Add testing configuration with Vitest" },
  { title: "Storybook", value: "storybook", description: "Include Storybook for component development" },
  { title: "Docker", value: "docker", description: "Add Docker configuration" },
  { title: "CI/CD", value: "ci", description: "Include GitHub Actions CI/CD pipeline" },
] as const

// Interactive multiselect prompt for features
const featuresPrompt = Prompt.multiSelect({
  message: "Select features to include in your project:",
  choices: availableFeatures,
  min: 0,
  max: availableFeatures.length,
})

// Keep the original text option for non-interactive mode
const featuresOption = Options.text("features").pipe(
  Options.withAlias("f"),
  Options.withDescription("Comma-separated list of features (auth,ui,testing,storybook,docker,ci)"),
  Options.optional,
)

const packageManagerOption = Options.choice("package-manager", ["npm", "yarn", "pnpm", "bun"]).pipe(
  Options.withAlias("pm"),
  Options.withDescription("Package manager to use"),
  Options.withDefault("bun"),
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
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* Console.log(`🚀 Creating project: ${projectName}`)
    yield* Console.log(`📋 Template: ${options.template}`)

    // Handle features selection
    let selectedFeatures: string[] = []

    if (options.features) {
      // Use command-line provided features
      const featureList = options.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0)

      if (featureList.length > 0) {
        // Validate features
        const validFeatures = ["auth", "ui", "testing", "storybook", "docker", "ci"]
        const invalidFeatures = featureList.filter((f) => !validFeatures.includes(f))

        if (invalidFeatures.length > 0) {
          yield* Console.error(`❌ Invalid features: ${invalidFeatures.join(", ")}`)
          yield* Console.log(`Available features: ${validFeatures.join(", ")}`)
          return
        }

        selectedFeatures = featureList
      }
    } else {
      // Use interactive multiselect prompt
      yield* Console.log("")
      selectedFeatures = yield* Prompt.run(featuresPrompt)
    }

    if (selectedFeatures.length > 0) {
      yield* Console.log(`✨ Features: ${selectedFeatures.join(", ")}`)
    } else {
      yield* Console.log("✨ No additional features selected")
    }

    yield* Console.log(`📦 Package Manager: ${options.packageManager}`)

    // Check if template exists
    const templatePath = path.join(process.cwd(), "templates", options.template)
    const templateExists = yield* fs.exists(templatePath)

    if (!templateExists) {
      yield* Console.error(`❌ Template '${options.template}' not found`)
      yield* Console.log("Available templates: monorepo, backend-only, frontend-only, cli")
      return
    }

    // Create project directory
    const projectPath = path.join(process.cwd(), projectName)
    const projectExists = yield* fs.exists(projectPath)

    if (projectExists) {
      yield* Console.error(`❌ Directory '${projectName}' already exists`)
      return
    }

    yield* Console.log(`📁 Creating project directory: ${projectPath}`)
    yield* fs.makeDirectory(projectPath, { recursive: true })

    // TODO: Copy template files and process them
    yield* Console.log("⚠️  Template processing not yet implemented")
    yield* Console.log("✅ Project structure created successfully!")
  })

// Create command
export const createCommand = Command.make(
  "create",
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
