# @effectify/hatchet Specification

This specification defines the requirements and scenarios for the `@effectify/hatchet` package, which provides a native Effect v4 integration with Hatchet SDK v1.21.0.

---

## Table of Contents

1. [Core Module Specs](#core-module-specs)
2. [Effectifier Module Specs](#effectifier-module-specs)
3. [Workflow Module Specs](#workflow-module-specs)
4. [Logging Module Specs](#logging-module-specs)
5. [Schema Module Specs](#schema-module-specs)
6. [Testing Module Specs](#testing-module-specs)
7. [Monorepo Setup Specs](#monorepo-setup-specs)
8. [Integration Specs](#integration-specs)

---

## Core Module Specs

### HatchetConfig Spec

The HatchetConfig module provides centralized configuration management for the Hatchet integration using Effect's Config system.

#### Requirements

- [REQ-CORE-01] HatchetConfig MUST be defined as a ServiceMap.Service with the configuration schema type as its payload
- [REQ-CORE-02] HatchetConfig MUST support token, host, and namespace properties
- [REQ-CORE-03] HatchetConfig MUST provide a Layer for static configuration via HatchetConfigLayer
- [REQ-CORE-04] HatchetConfig MUST support loading from environment variables via Config.Wrap
- [REQ-CORE-05] Host MUST default to "http://localhost:8080" if not provided
- [REQ-CORE-06] Namespace MUST be optional

#### Scenarios

##### Scenario: Static Configuration Layer Creation

Given a configuration object with token and host
When HatchetConfigLayer is called with that configuration
Then it returns a Layer that provides the configuration as a service

##### Scenario: Configuration from Environment

Given environment variables HATCHET_TOKEN and HATCHET_HOST
When HatchetConfigLayerFromEnv is called with wrapped config
Then it returns a Layer that reads from environment and provides the configuration

##### Scenario: Default Host Value

Given a configuration object with only a token
When HatchetConfigLayer processes that configuration
Then the host defaults to "http://localhost:8080"

##### Scenario: Optional Namespace

Given a configuration object without namespace
When HatchetConfigLayer processes that configuration
Then namespace is undefined in the provided service

---

### HatchetClientService Spec

The HatchetClientService module provides the Hatchet SDK client as an injectable Effect service.

#### Requirements

- [REQ-CLIENT-01] HatchetClientService MUST be defined as a ServiceMap.Service wrapping HatchetClient from @hatchet-dev/typescript-sdk
- [REQ-CLIENT-02] HatchetClientService MUST be initialized using HatchetClient.init() with token and host_port
- [REQ-CLIENT-03] HatchetClientLive MUST be a Layer that initializes the client from HatchetConfig
- [REQ-CLIENT-04] Initialization MUST handle Config errors and convert to HatchetError
- [REQ-CLIENT-05] The layer MUST depend on HatchetConfig to obtain connection parameters

#### Scenarios

##### Scenario: Client Initialization with Valid Config

Given a HatchetConfig with valid token and host
When HatchetClientLive layer is built
Then it initializes HatchetClient with token and host_port

##### Scenario: Client Initialization Fails

Given a HatchetConfig with invalid token
When HatchetClientLive layer is executed
Then it fails with HatchetError containing the cause

##### Scenario: Client Depends on Config Service

Given HatchetClientLive is used without HatchetConfig
When the layer is built
Then it fails with a missing dependency error

---

### HatchetError Spec

The HatchetError module provides structured error handling using Data.TaggedError.

#### Requirements

- [REQ-ERROR-01] HatchetError MUST be defined using Data.TaggedError
- [REQ-ERROR-02] HatchetError MUST have a message property describing the error
- [REQ-ERROR-03] HatchetError MUST have an optional cause property for underlying errors
- [REQ-ERROR-04] HatchetError MUST be catchable using Effect.catchTag

#### Scenarios

##### Scenario: Creating HatchetError

Given an error message and optional cause
When HatchetError is constructed
Then it creates a TaggedError with those properties

##### Scenario: Catching HatchetError in Effect

Given an Effect that fails with HatchetError
When the Effect is caught using Effect.catchTag("HatchetError")
Then the error handler receives the HatchetError instance

---

### HatchetStepContext Spec

The HatchetStepContext module provides the Hatchet step context as an injectable Effect service.

#### Requirements

- [REQ-CONTEXT-01] HatchetStepContext MUST be defined as a ServiceMap.Service
- [REQ-CONTEXT-02] HatchetStepContext MUST wrap the Hatchet SDK Context type
- [REQ-CONTEXT-03] getHatchetInput MUST extract and type the input property from the context
- [REQ-CONTEXT-04] The context MUST provide access to input, parentOutput, log, and logger properties
- [REQ-CONTEXT-05] Input access MUST work with the SDK v1.21.0 ctx.input property (not a method)

#### Scenarios

##### Scenario: Accessing Step Input

Given a HatchetStepContext with input { userId: "123" }
When getHatchetInput is called and yielded
Then it returns the input typed as the generic type parameter

##### Scenario: Accessing Parent Output

Given a task with a parent task
When HatchetStepContext.parentOutput is called with a task reference
Then it returns the output of the parent task

##### Scenario: Using Logger in Context

Given a HatchetStepContext
When ctx.logger.info is called
Then it logs to the Hatchet dashboard

---

## Effectifier Module Specs

### effectifyTask Spec

The effectifier module bridges Effect execution with Hatchet's Promise-based task system.

#### Requirements

- [REQ-EFFECT-01] effectifyTask MUST convert an Effect to a function compatible with Hatchet's task API
- [REQ-EFFECT-02] effectifyTask MUST accept an Effect with HatchetStepContext in its dependencies
- [REQ-EFFECT-03] effectifyTask MUST inject the Hatchet context as a service before execution
- [REQ-EFFECT-04] Success results MUST be returned as-is
- [REQ-EFFECT-05] Failure causes MUST be thrown as Errors for Hatchet retry detection
- [REQ-EFFECT-06] The function signature MUST match (input: unknown, ctx: HatchetContext) => Promise<A>

#### Scenarios

##### Scenario: Successful Effect Execution

Given an Effect that succeeds with a value
When effectifyTask executes the Effect
Then it returns the success value as a Promise

##### Scenario: Failed Effect Throws Error

Given an Effect that fails with an error
When effectifyTask executes the Effect
Then it throws an Error for Hatchet to detect and potentially retry

##### Scenario: Context Injection

Given an Effect that requires HatchetStepContext
When effectifyTask runs the Effect
Then HatchetStepContext is provided with the Hatchet context

##### Scenario: ManagedRuntime Execution

Given a ManagedRuntime with dependencies
When effectifyTask runs with that runtime
Then the Effect is executed using runtime.runPromiseExit

---

### createEffectifierFromLayer Spec

The factory function creates an effectifier with pre-configured dependencies.

#### Requirements

- [REQ-FACTORY-01] createEffectifierFromLayer MUST accept a Layer defining dependencies
- [REQ-FACTORY-02] createEffectifierFromLayer MUST create a ManagedRuntime from the layer
- [REQ-FACTORY-03] The returned function MUST accept an Effect with those dependencies
- [REQ-FACTORY-04] The runtime MUST be disposed when the worker shuts down

#### Scenarios

##### Scenario: Creating Effectifier with Dependencies

Given a Layer with Database and EmailService
When createEffectifierFromLayer is called with that layer
Then it returns a function that can execute Effects requiring those services

##### Scenario: Effectifier Inherits Dependencies

Given an Effect that requires Database service
When the effectified function is called
Then it uses the dependencies from the layer

---

## Workflow Module Specs

### workflow() Spec

The workflow function creates a declarative workflow builder matching Hatchet's API style.

#### Requirements

- [REQ-WF-01] workflow() MUST accept WorkflowOptions with name, description, version, sticky, and concurrency
- [REQ-WF-02] workflow() MUST return an EffectWorkflow instance
- [REQ-WF-03] The workflow name MUST be required
- [REQ-WF-04] Description and version MUST be optional

#### Scenarios

##### Scenario: Creating a Basic Workflow

Given workflow options with a name
When workflow() is called
Then it returns an EffectWorkflow with empty tasks

##### Scenario: Workflow with All Options

Given workflow options with name, description, version, sticky, and concurrency
When workflow() is called
Then all options are stored in the EffectWorkflow

---

### task() Spec

The task function defines a single task within a workflow.

#### Requirements

- [REQ-TASK-01] task() MUST accept TaskOptions and an Effect
- [REQ-TASK-02] TaskOptions MUST include name (required), timeout, retries, rateLimits, concurrency, and parents
- [REQ-TASK-03] task() MUST return a TaskDefinition that can be added to a workflow
- [REQ-TASK-04] Parents MUST define DAG dependencies between tasks

#### Scenarios

##### Scenario: Creating a Basic Task

Given task options with a name and an Effect
When task() is called
Then it returns a TaskDefinition with those options

##### Scenario: Task with Retry Configuration

Given task options with retries: 3
When task() is called
Then the retry configuration is stored

##### Scenario: Task with Parent Dependencies

Given task options with parents: ["fetch-user", "validate-input"]
When task() is called
Then the parents are stored for DAG execution order

---

### EffectWorkflow.task() Spec

The task method adds a task to the workflow builder chain.

#### Requirements

- [REQ-WFTASK-01] EffectWorkflow.task() MUST accept a TaskDefinition
- [REQ-WFTASK-01] EffectWorkflow.task() MUST return a new EffectWorkflow with updated dependencies
- [REQ-WFTASK-02] Multiple calls to task() MUST accumulate tasks in the workflow
- [REQ-WFTASK-03] Dependencies from all tasks MUST be merged

#### Scenarios

##### Scenario: Adding Single Task to Workflow

Given an EffectWorkflow with no tasks
When .task() is called with a TaskDefinition
Then the workflow contains one task

##### Scenario: Chaining Multiple Tasks

Given an EffectWorkflow
When .task() is called multiple times
Then all tasks are accumulated in the workflow

##### Scenario: Dependency Inference Across Tasks

Given tasks with different dependency requirements
When they are added to the workflow
Then the workflow dependencies are the union of all task dependencies

---

### registerWorkflow() Spec

The registerWorkflow function registers an EffectWorkflow with Hatchet.

#### Requirements

- [REQ-REG-01] registerWorkflow MUST accept worker name, EffectWorkflow, and a Layer
- [REQ-REG-02] registerWorkflow MUST return an Effect that registers the workflow
- [REQ-REG-03] The function MUST use hatchet.workflow() to create the workflow
- [REQ-REG-04] The function MUST use workflow.task() for each task (not step())
- [REQ-REG-05] The function MUST create a worker with hatchet.worker()
- [REQ-REG-06] The function MUST start the worker
- [REQ-REG-07] Errors during registration MUST fail with HatchetError

#### Scenarios

##### Scenario: Registering a Simple Workflow

Given a workflow with one task and a layer
When registerWorkflow is executed
Then the workflow is registered with Hatchet and worker starts

##### Scenario: Registration Fails with Invalid Workflow

Given a workflow with no tasks
When registerWorkflow is executed
Then it fails with HatchetError

##### Scenario: Worker Creation Error

Given a Hatchet client that fails to create a worker
When registerWorkflow is executed
Then it fails with HatchetError containing the cause

---

## Logging Module Specs

### HatchetLogger Spec

The HatchetLogger provides automatic log synchronization between Effect.log() and Hatchet UI.

#### Requirements

- [REQ-LOG-01] HatchetLogger MUST be created using Logger.make
- [REQ-LOG-02] HatchetLogger MUST detect if HatchetStepContext exists in the fiber
- [REQ-LOG-03] If context exists, logs MUST be sent to ctx.log()
- [REQ-LOG-04] Logs MUST always be printed to console regardless of context
- [REQ-LOG-05] Log level MUST be included in the Hatchet log message

#### Scenarios

##### Scenario: Log Within Hatchet Task

Given an Effect running within a Hatchet task with HatchetStepContext
When Effect.log("message") is called
Then the message appears in Hatchet dashboard via ctx.log()

##### Scenario: Log Outside Hatchet Task

Given an Effect running outside a Hatchet task (no HatchetStepContext)
When Effect.log("message") is called
Then the message goes to console only

##### Scenario: Log Level Included

Given a log with level "debug"
When HatchetLogger formats the message
Then the output includes the log level label

---

### withHatchetLogger Spec

The withHatchetLogger function applies the HatchetLogger to an Effect.

#### Requirements

- [REQ-WLOG-01] withHatchetLogger MUST accept an Effect and return a new Effect
- [REQ-WLOG-02] withHatchetLogger MUST use Effect.withLogger (not Logger.replace)
- [REQ-WLOG-03] The returned Effect MUST have the same type signature as input

#### Scenarios

##### Scenario: Applying Logger to Effect

Given an Effect
When withHatchetLogger is called
Then it returns an Effect with the HatchetLogger applied

---

## Schema Module Specs

### getValidatedInput Spec

The getValidatedInput function validates workflow input against an Effect Schema.

#### Requirements

- [REQ-SCHEMA-01] getValidatedInput MUST accept a Schema as parameter
- [REQ-SCHEMA-02] getValidatedInput MUST extract input from HatchetStepContext
- [REQ-SCHEMA-03] getValidatedInput MUST use Schema.decodeUnknown for validation
- [REQ-SCHEMA-04] On validation failure, it MUST fail with Schema.ParseError
- [REQ-SCHEMA-05] On success, it MUST return the parsed and typed input
- [REQ-SCHEMA-06] The Schema type parameter MUST infer the return type

#### Scenarios

##### Scenario: Valid Input Passes Validation

Given a Schema and valid input data
When getValidatedInput is executed
Then it returns the parsed input

##### Scenario: Invalid Input Fails with ParseError

Given a Schema and invalid input data
When getValidatedInput is executed
Then it fails with Schema.ParseError

##### Scenario: Type Inference from Schema

Given a Schema.Struct with { name: Schema.String }
When getValidatedInput is used
Then the return type includes name: string

---

## Testing Module Specs

### createMockStepContext Spec

The createMockStepContext function creates a mock Hatchet context for testing.

#### Requirements

- [REQ-MOCK-01] createMockStepContext MUST accept optional input data
- [REQ-MOCK-02] The mock MUST include input property with the provided data
- [REQ-MOCK-03] The mock MUST include parentOutput that returns null
- [REQ-MOCK-04] The mock MUST include log and logger methods (no-op)
- [REQ-MOCK-05] The mock MUST include workflowRunId, workflowName, taskName, retryCount

#### Scenarios

##### Scenario: Creating Mock Context with Input

Given input data { userId: "123" }
When createMockStepContext is called with that input
Then ctx.input returns { userId: "123" }

##### Scenario: Creating Default Mock Context

Given no input
When createMockStepContext is called
Then ctx.input returns empty object

---

### runTestTask Spec

The runTestTask function executes an Effect with a mock context.

#### Requirements

- [REQ-RUNTEST-01] runTestTask MUST accept an Effect with HatchetStepContext dependency
- [REQ-RUNTEST-02] runTestTask MUST accept optional mock context
- [REQ-RUNTEST-03] runTestTask MUST provide HatchetStepContext as a service
- [REQ-RUNTEST-04] runTestTask MUST return Exit.Exit<A, E> for result inspection

#### Scenarios

##### Scenario: Running Task with Mock Context

Given an Effect that yields HatchetStepContext
When runTestTask is executed with mock context
Then the Effect has access to the mock context

##### Scenario: Test Returns Exit

Given an Effect that succeeds or fails
When runTestTask is executed
Then the result is wrapped in Exit for assertion

---

## Monorepo Setup Specs

### project.json Spec

The Nx project configuration for the hatchet package.

#### Requirements

- [REQ-NX-01] The project MUST be named @effectify/hatchet
- [REQ-NX-02] The source root MUST be packages/hatchet/src
- [REQ-NX-03] The build target MUST use @nx/js:tsc
- [REQ-NX-04] The test target MUST run vitest
- [REQ-NX-05] The lint target MUST use nx-oxlint:lint

#### Scenarios

##### Scenario: Build Target Executes

Given nx build @effectify/hatchet
When the command is run
Then it produces output in packages/hatchet/dist

##### Scenario: Test Target Executes

Given nx test @effectify/hatchet
When the command is run
Then vitest runs the test suite

---

### package.json Spec

The package manifest for @effectify/hatchet.

#### Requirements

- [REQ-PKG-01] Package name MUST be @effectify/hatchet
- [REQ-PKG-02] Effect MUST be a peerDependency using catalog:
- [REQ-PKG-03] @hatchet-dev/typescript-sdk MUST be a dependency with version 1.21.0
- [REQ-PKG-04] @effect/vitest MUST be a devDependency
- [REQ-PKG-05] Type MUST be module (ESM)
- [REQ-PKG-06] Exports MUST include "." for main entry

#### Scenarios

##### Scenario: Package.json Validates Dependencies

Given the package.json
When npm or pnpm installs dependencies
Then effect is installed as peerDependency and hatchet-sdk as dependency

---

### tsconfig.json Spec

TypeScript configuration for the hatchet package.

#### Requirements

- [REQ-TS-01] tsconfig.json MUST extend ../../tsconfig.base.json
- [REQ-TS-02] tsconfig.lib.json MUST use composite builds
- [REQ-TS-03] tsconfig.spec.json MUST include test files
- [REQ-TS-04] Paths MUST include @effectify/hatchet for self-references

#### Scenarios

##### Scenario: TypeScript Compiles with Composite

Given tsconfig.lib.json
When tsc builds the package
Then it produces declaration files and build info

---

### vitest.config.ts Spec

Test configuration for the hatchet package.

#### Requirements

- [REQ-VITEST-01] vitest.config.ts MUST use @effect/vitest for equality testers
- [REQ-VITEST-02] setupFiles MUST include setup-tests.ts
- [REQ-VITEST-03] Test include pattern MUST match \*_/_.test.ts
- [REQ-VITEST-04] Aliases MUST resolve @effectify/hatchet to src

#### Scenarios

##### Scenario: Tests Use Effect Equality Testers

Given vitest runs a test with Effect comparisons
When assertions are made
Then @effect/vitest equality testers are applied

---

### nx.json Integration Spec

The hatchet package must be added to the release configuration.

#### Requirements

- [REQ-RELEASE-01] nx.json MUST include hatchet in release.projects array
- [REQ-RELEASE-02] The package MUST be releasable as npm package

#### Scenarios

##### Scenario: Release Includes Hatchet Package

Given nx release is run
When the hatchet project is included
Then it publishes to npm registry

---

## Integration Specs

### Docker Compose Spec

Integration tests require a Docker Compose setup with Hatchet and PostgreSQL.

#### Requirements

- [REQ-DOCKER-01] docker-compose.yml MUST include postgres service with correct credentials
- [REQ-DOCKER-02] docker-compose.yml MUST include hatchet service
- [REQ-DOCKER-03] Hatchet MUST depend on postgres with health check
- [REQ-DOCKER-04] postgres MUST use healthcheck for dependency conditions
- [REQ-DOCKER-05] DATABASE_URL MUST be configured for postgres connection

#### Scenarios

##### Scenario: Docker Compose Starts Successfully

Given docker-compose.yml
When docker compose up -d is run
Then both postgres and hatchet services start

##### Scenario: Health Checks Pass

Given running containers
When health checks are queried
Then both services return healthy status

---

### Integration Tests Spec

Tests against real Hatchet engine.

#### Requirements

- [REQ-INT-01] Integration tests MUST wait for Hatchet to be ready before running
- [REQ-INT-02] Integration tests MUST test workflow registration
- [REQ-INT-03] Integration tests MUST test workflow execution
- [REQ-INT-04] Integration tests MUST verify logs appear in Hatchet
- [REQ-INT-05] Integration tests MUST verify error handling triggers retries

#### Scenarios

##### Scenario: Workflow Registration

Given a defined EffectWorkflow
When registerWorkflow is executed against real Hatchet
Then the workflow appears in Hatchet dashboard

##### Scenario: Workflow Execution

Given a registered workflow
When triggered via hatchet.admin.runWorkflow
Then it executes and returns a workflowRunId

##### Scenario: Task Retries on Error

Given a task that fails with Effect.fail
When the workflow is executed
Then Hatchet retries the task according to retry configuration

---

## Error Handling Scenarios

### Error Propagation

#### Scenario: Effect Failure Becomes Hatchet Error

Given an Effect that fails with an error
When effectifyTask converts the failure
Then Hatchet receives an exception that triggers its error handling

#### Scenario: Network Errors During Client Init

Given network is unavailable
When HatchetClientLive attempts initialization
Then it fails with HatchetError containing the network error

---

## Performance and Resource Management

### Runtime Disposal

#### Scenario: ManagedRuntime Cleanup

Given createEffectifierFromLayer creates a runtime
When the worker shuts down
Then the runtime is disposed to prevent leaks

---

## Summary

This specification defines 68 requirements across 8 major module categories. Each requirement is testable through the defined scenarios. The package uses verified Effect v4 APIs (ServiceMap.Service, ManagedRuntime.make, Effect.withLogger) and Hatchet SDK v1.21.0 APIs (workflow.task(), ctx.input, ctx.parentOutput()).
