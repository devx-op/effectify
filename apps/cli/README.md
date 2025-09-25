# Effectify CLI

A modern CLI built with Effect-TS for creating and managing Effect-based monorepos, inspired by [better-t-stack.dev](https://better-t-stack.dev/).

## 🎯 Project Vision

Effectify CLI is a command-line tool that enables:

1. **Create monorepos** with predefined templates (React, SolidJS, Node.js, CLI)
2. **Dynamic template system** with configurable features
3. **Component registry** Shadcn-style for reusable UI libraries
4. **Dependency management** and automatic configurations

## 🏗️ Architecture

### Core Technologies

- **Effect-TS**: Functional framework for TypeScript
- **@effect/cli**: Robust command system with automatic parsing
- **Nx**: Monorepo tooling and build system
- **Bun**: Package manager and runtime
- **Handlebars**: Template engine (coming soon)

### Project Structure

```
apps/cli/
├── src/
│   ├── commands/           # Individual commands
│   │   ├── create.ts      # Create projects from templates
│   │   ├── add.ts         # Add components from registry
│   │   ├── init.ts        # Initialize configuration
│   │   └── registry.ts    # Manage registries
│   ├── templates/         # Project templates
│   │   ├── monorepo/      # Complete monorepo template
│   │   ├── react-app/     # React application template
│   │   └── solid-app/     # SolidJS application template
│   └── main.ts           # Main entry point
├── dist/                 # Compiled files
└── README.md            # This documentation
```

## 🚀 Installation and Usage

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm/yarn/pnpm

### Local Installation

```bash
# From monorepo root
bun install
bun nx build cli

# Run CLI
bun apps/cli/dist/src/main.js [command] [options]
```

### Global Installation (Coming Soon)

```bash
npm install -g @effectify/cli
effectify [command] [options]
```

## 📖 Available Commands

### `create` - Create Project

Creates a new project from a predefined template.

```bash
effectify create [options] <project-name>
```

**Options:**

- `-t, --template <type>`: Template to use (monorepo, react-app, solid-app) [default: monorepo]
- `-f, --features <list>`: Comma-separated list of features (auth, ui, testing)
- `--pm, --package-manager <manager>`: Package manager (npm, yarn, pnpm, bun) [default: bun]

**Examples:**

```bash
# Create basic monorepo
effectify create my-project

# Create React app with authentication and UI
effectify create --template react-app --features auth,ui my-react-app

# Use pnpm as package manager
effectify create --template solid-app --pm pnpm my-solid-app
```

### `add` - Add Component

Adds a component from a registry to your project.

```bash
effectify add [options] <component-name>
```

**Options:**

- `-r, --registry <url>`: Registry URL [default: https://registry.effectify.dev]
- `-v, --version <version>`: Specific component version
- `-p, --path <path>`: Custom path to install the component

**Examples:**

```bash
# Add button component
effectify add button

# Add specific version from custom registry
effectify add --registry https://my-registry.com --version 1.2.3 card
```

### `init` - Initialize Configuration

Initializes Effectify configuration in the current project.

```bash
effectify init [options]
```

**Options:**

- `-r, --registry <url>`: Default registry to use
- `-c, --config-file <file>`: Configuration file [default: effectify.config.json]
- `-f, --force`: Overwrite existing configuration

**Examples:**

```bash
# Initialize with default configuration
effectify init

# Configure custom registry
effectify init --registry https://my-company-registry.com --force
```

### `registry` - Manage Registries

Manages component registries with various subcommands.

#### `registry list` - List Registries

```bash
effectify registry list
```

#### `registry search` - Search Components

```bash
effectify registry search <query>
```

#### `registry publish` - Publish Component

```bash
effectify registry publish [options] <component-path>
```

**Options:**

- `-r, --registry <url>`: Registry to publish to

## 🎨 Template System

### Available Templates

#### `monorepo` (Default)

Complete monorepo with:

- Nx configuration
- Multiple applications (React, SolidJS, Node.js)
- Shared libraries
- Testing configuration
- CI/CD setup

#### `react-app`

Standalone React application with:

- Vite as bundler
- TypeScript configured
- Routing with React Router
- State with Zustand
- Styling with Tailwind CSS

#### `solid-app`

Standalone SolidJS application with:

- Vite as bundler
- TypeScript configured
- Routing with Solid Router
- State with Solid Store
- Styling with Tailwind CSS

### Configurable Features

- `auth`: Authentication system
- `ui`: UI component library
- `testing`: Testing setup (Vitest, Testing Library)
- `storybook`: Component documentation
- `docker`: Containerization
- `ci`: CI/CD configuration

## 🏪 Registry System

Inspired by Shadcn/ui, enables:

- Download reusable components
- Component versioning
- Public and private registries
- Customizable configuration

### Component Structure

```json
{
  "name": "button",
  "version": "1.0.0",
  "description": "Reusable button with variants",
  "dependencies": ["@effect/core"],
  "files": ["button.tsx", "button.stories.tsx", "button.test.tsx"]
}
```

## 📊 Project Status

### ✅ Completed

- [x] **Effect-TS CLI Base**: Complete architecture with @effect/cli
- [x] **Main Commands**: create, add, init, registry working
- [x] **Argument Parsing**: Options and arguments with validation
- [x] **Modular Structure**: Commands separated in individual files
- [x] **Automatic Help**: Auto-generated documentation
- [x] **Template Validation**: Verification of existing templates
- [x] **Directory Creation**: Basic project structure

### 🔄 In Progress

- [ ] **Template Processing**: Copy files and process with Handlebars
- [ ] **Dynamic Variables**: Replace placeholders in templates
- [ ] **Feature Configuration**: Apply selected features

### ⏳ Next Steps

1. **Complete Template System**
   - Implement file copying from templates
   - Integrate Handlebars for dynamic processing
   - Configure project variables (name, author, etc.)

2. **Component Registry**
   - API for downloading components
   - Versioning system
   - Local component cache

3. **Advanced Configuration**
   - effectify.config.json configuration file
   - Custom registries
   - Aliases and shortcuts

4. **Testing and Quality**
   - Unit tests for each command
   - Integration tests
   - Template validation

5. **Distribution**
   - npm publication
   - Global installation
   - Complete documentation

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Bun (recommended)

### Local Setup

```bash
# Clone the monorepo
git clone <repo-url>
cd effectify

# Install dependencies
bun install

# Build CLI
bun nx build cli

# Run in development mode
bun apps/cli/dist/src/main.js --help
```

### Available Scripts

```bash
# Build
bun nx build cli

# Build without cache
bun nx build cli --skip-nx-cache

# Clean dist
bun nx reset cli

# View build logs
bun nx build cli --verbose
```

### Command Structure

Each command follows the pattern:

1. **Define arguments and options** with @effect/cli
2. **Implement business logic** with Effect-TS
3. **Handle errors** with Effect.catchAll
4. **Export command** for use in main.ts

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Create Pull Request

## 📄 License

MIT - See [LICENSE](LICENSE) for more details.
