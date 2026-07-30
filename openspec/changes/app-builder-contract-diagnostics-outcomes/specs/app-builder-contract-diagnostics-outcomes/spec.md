# App Builder Contract Diagnostics and Outcomes Specification

## Purpose

Define private, browser-neutral terminal outcomes composed with the canonical identity envelope.

## Requirements

### Requirement: Ordered diagnostic wire contract

The system MUST define `Diagnostic { severity, code, message, path? }`. `severity` MUST be exactly `info`, `warning`, or `error`; `code` MUST be a stable non-empty machine string; `message` MUST be a non-empty human string. When present, `path` MUST retain its ordered string/number segments without sorting, deduplication, or rewriting.

#### Scenario: Ordered diagnostics

- GIVEN diagnostics with repeated codes and mixed path segments
- WHEN they are encoded and decoded
- THEN their fields and caller order are retained exactly

#### Scenario: Invalid diagnostic shape

- GIVEN an unknown severity, invalid path segment, or extra diagnostic field
- WHEN it is decoded
- THEN it is rejected

### Requirement: Exact generic outcome algebra

The system MUST accept only these case-sensitive outcome objects: `Success { _tag, value }`, `Failure { _tag, failure }`, and `InputRequired { _tag, callbackRef, continuationRef, responseSchemaRef }`. `Success.value` and `Failure.failure` MUST use supplied schemas and preserve distinct Effect `Type` and `Encoded` channels. Unknown tags, aliases, omitted fields, contradictory fields, and extra fields MUST be rejected.

#### Scenario: Generic payload channel round trip

- GIVEN distinct decoded and encoded success and failure schemas
- WHEN each valid outcome is encoded then decoded
- THEN its matching payload preserves both declared channels

#### Scenario: Unknown or mixed case

- GIVEN an unknown tag or a `Success` object containing `failure`
- WHEN it is decoded
- THEN it is rejected without coercion

### Requirement: Input-required exchange scope

`InputRequired` MUST contain only `callbackRef: CallbackRef`, `continuationRef: ContinuationRef`, and `responseSchemaRef: SchemaRef` besides `_tag`. It MUST request later input and MUST NOT define values, tools, permissions, services, persistence, or transition rules.

#### Scenario: Reference-only input request

- GIVEN valid callback, continuation, and response-schema references
- WHEN an `InputRequired` outcome is decoded
- THEN exactly those references are available for the later exchange

### Requirement: Complete-envelope composition and strictness

The system MUST compose one complete envelope from canonical `EnvelopeIdentity`, one `outcome`, and one required `diagnostics` array. Diagnostics MUST appear only at this root, never inside an outcome. The complete-envelope boundary and its owned outcome/diagnostic objects MUST reject extra fields. Canonical identity fields remain owned by identities/envelopes.

#### Scenario: Shared envelope observations

- GIVEN any valid outcome and zero or more diagnostics
- WHEN the complete envelope is encoded then decoded
- THEN identity, one outcome, and diagnostics occur once with diagnostic order intact

#### Scenario: Extra envelope field

- GIVEN an otherwise valid complete envelope with an extra root field
- WHEN it is decoded
- THEN it is rejected

### Requirement: Safe unknown-boundary decoding

`decodeDiagnostic`, `decodeOutcome`, and `decodeCompleteEnvelope` MUST return `Result` successes or fresh finite failures in their respective categories: `MalformedDiagnostic`, `MalformedOutcome`, and `MalformedCompleteEnvelope`. For malformed, hostile, or unknown input they MUST NOT throw, echo, retain, or expose input, causes, schema issues, messages, paths, keys, or values.

#### Scenario: Hostile inspection

- GIVEN a proxy or getter that throws during inspection
- WHEN any owned unknown-boundary decoder receives it
- THEN it returns only a fresh applicable malformed category

#### Scenario: Non-echoing malformed input

- GIVEN malformed data containing secret-like strings
- WHEN decoding fails
- THEN the returned failure contains none of that data or parse detail

### Requirement: Ownership and review boundary

This capability MUST remain private and browser-neutral. It MUST compose identities, references, and the envelope shell, and MUST NOT import or define JSON/canonicalization, runtime, permissions, tools, replay, hashing, public exports, or certification.

#### Scenario: Private scope and import firewall

- GIVEN the private contract source modules and their import inventory
- WHEN the scope and import-firewall checks execute
- THEN only the permitted browser-neutral contract dependencies are present and excluded concerns remain absent

## Delivery Gate (non-product)

After independent verification and normalization, a human Tuicr review MUST occur in a new Herdr tab before native review. Feedback MUST receive targeted reverification and normalization. Native review requires explicit Tuicr acceptance.
