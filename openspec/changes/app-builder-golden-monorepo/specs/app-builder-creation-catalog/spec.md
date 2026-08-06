# Delta for App Builder Creation Catalog

## ADDED Requirements

### Requirement: Schema-Validated Finite Creation Intent

The system MUST accept a versioned `CreationIntent` only after schema validation. It SHALL select only declared catalog capabilities and MUST reject arbitrary package, module, template, callback, or command references.

#### Scenario: Resolve a declared Todo intent

- GIVEN a valid intent selecting the Todo preset and declared capabilities
- WHEN the intent is decoded and resolved
- THEN the system MUST return only catalog-backed selections

#### Scenario: Reject an untrusted selector

- GIVEN an intent containing an undeclared module or command selector
- WHEN validation runs
- THEN it MUST return a typed validation failure without planning or mutation

### Requirement: Trusted Catalog Compatibility

The catalog MUST contain official entries and only preinstalled, explicitly allowlisted community plugins. Resolution MUST validate capability and dependency compatibility, compute the declared dependency closure, and return a deterministic result for equivalent catalog and intent inputs.

#### Scenario: Resolve compatible community contribution

- GIVEN a preinstalled allowlisted community plugin with compatible metadata
- WHEN its declared capability is selected
- THEN its catalog-backed contribution MUST be included deterministically

#### Scenario: Reject unavailable or incompatible contribution

- GIVEN a non-allowlisted, missing, or incompatible plugin/capability
- WHEN resolution runs
- THEN it MUST reject the intent and MUST NOT invoke plugin code
