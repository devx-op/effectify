# Delta for App Builder CLI Tools

## ADDED Requirements

### Requirement: Closed Agent-Tool Surface

The public interface MUST expose only `catalog`, `plan`, `generate`, `verify`, `replay`, `explain`, and `doctor`. Each command MUST use versioned request, result, and error schemas, accept complete payloads from stdin or an explicit file, and map failures to stable exit classes.

#### Scenario: Execute a supported machine command

- GIVEN a schema-valid file or stdin request for `plan`
- WHEN the CLI executes
- THEN it MUST emit the versioned terminal result and its stable exit class

#### Scenario: Reject an unsupported command

- GIVEN an unknown command or invalid request schema
- WHEN the CLI is invoked
- THEN it MUST emit the typed error contract without mutation

### Requirement: Machine and Human Protocol Separation

Standard output MUST contain JSON only; human diagnostics MUST use standard error. Events MUST be JSON Lines only when `--events=jsonl` is explicitly selected, and the stream MUST end with exactly one terminal envelope.

#### Scenario: Default output protocol

- GIVEN a non-streaming command invocation
- WHEN it completes or fails
- THEN stdout MUST contain exactly one JSON terminal envelope and no human text

#### Scenario: Explicit event protocol

- GIVEN `--events=jsonl` is selected
- WHEN a long-running operation reports progress
- THEN stdout MUST contain JSONL events followed by one terminal envelope

### Requirement: Closed Automation Boundary

The CLI MUST NOT expose MCP. Effect AI is deferred; a future AI adapter MAY produce only a validated `CreationIntent` and MUST NOT mutate, execute, or register arbitrary tools.

#### Scenario: Reject arbitrary automation authority

- GIVEN an automation request attempts to register a tool or execute a command
- WHEN it reaches the public boundary
- THEN it MUST be rejected without execution
