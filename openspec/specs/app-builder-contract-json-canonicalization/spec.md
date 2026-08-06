# App Builder Contract JSON Canonicalization Specification

## Purpose

Define `effectify-cjson/1`: safe JSON, frozen material, canonical text, and UTF-8. Hashing and replay are excluded.

## Requirements

### Requirement: Guarded JSON acceptance

The system MUST accept only `null`, booleans, finite numbers, strings, dense arrays, and plain string-keyed data records. Plain means guarded prototype `null` or a realm's `Object.prototype` (prototype `null`); normal, null-prototype, and cross-realm records SHALL pass, while classes and other prototypes MUST fail.

Before child reads, the system MUST guard own-key, prototype, and descriptor inspection. Records allow only enumerable string data descriptors; arrays only dense indexes plus `length`. Holes, accessors, symbol keys, non-enumerable record keys, and extra array properties MUST fail without invoking accessors.

#### Scenario: Safe records and arrays

- GIVEN normal, null-prototype, or cross-realm plain records with JSON scalars and dense arrays
- WHEN the boundary normalizes the value
- THEN it succeeds without observing inherited properties

#### Scenario: Forbidden or hostile shape

- GIVEN an accessor, symbol key, hole, class instance, or throwing inspection trap
- WHEN the boundary normalizes the value
- THEN it returns a typed failure and MUST NOT throw or execute an accessor

### Requirement: Deterministic finite rejection and depth

The system MUST return a `Result` with a stable reason: `inspection-failed`, `unsupported-value`, `invalid-record`, `invalid-array`, `cycle`, or `depth-exceeded`. Failures MUST NOT retain or echo input, keys, values, paths, causes, or messages.

Rejection selection SHALL be deterministic depth-first: arrays by index and records by raw UTF-16 key order. Inspection failure precedes shape rejection; guarded descriptors precede reads; an active ancestor is `cycle` before descent; then depth is checked.

`effectify-cjson/1` MUST allow at most **256 containers** on a root-to-leaf path: scalar root 0; 256 nested containers valid; 257 fails. This bounds ancestor bookkeeping and copy/freeze/serialize path cost, not portable JavaScript stack capacity; overflow MUST be `depth-exceeded`, never a host stack exception.

#### Scenario: Depth boundary

- GIVEN a 256-container JSON path and a 257-container JSON path
- WHEN each value is normalized
- THEN the former succeeds and the latter returns only `depth-exceeded`

#### Scenario: Cycle precedence

- GIVEN a reachable self-reference at or beyond the depth boundary
- WHEN the boundary reaches that child
- THEN it returns only `cycle`

### Requirement: Immutable canonical material and text

On success, the system MUST return deeply copied/frozen JSON material and `effectify-cjson/1` text together. Later source mutation MUST NOT alter either, and no mutable source alias may remain.

Object keys MUST sort by raw ECMAScript UTF-16 code units; array order MUST remain unchanged. Text MUST use ECMAScript JSON scalar semantics: finite number formatting, `-0` as `0`, control/quote/backslash escaping, and escaped—not replaced—lone UTF-16 surrogates.

#### Scenario: Canonical equivalence and isolation

- GIVEN equivalent records with reordered keys and a mutable nested source
- WHEN each is canonicalized and the source is later mutated
- THEN their text matches and their frozen material remains unchanged

#### Scenario: Scalar edge semantics

- GIVEN `-0`, exponent-boundary finite numbers, astral strings, and lone surrogates
- WHEN canonical text is produced
- THEN it follows ECMAScript JSON text semantics with valid escaped surrogates

### Requirement: Direct RFC 3629 bytes

The system MUST directly encode canonical text as fresh RFC 3629 UTF-8 bytes without a leading BOM or another serialization/wrapper. U+FEFF inside a JSON string is content, not a document BOM.

#### Scenario: Bytes are canonical and isolated

- GIVEN canonical text containing a lone surrogate and a U+FEFF string character
- WHEN UTF-8 bytes are requested twice
- THEN each allocation is fresh, has no prefixed BOM, and encodes the string content exactly

### Requirement: Ownership boundary

This capability MUST remain browser-neutral and private. It MUST NOT define hashing, digests, replay, diagnostics/outcomes, descriptors, tool contracts, public exports, or certification.

#### Scenario: Downstream hashing composition

- GIVEN a downstream consumer needs a digest or replay record
- WHEN it consumes canonical text or bytes
- THEN that consumer owns hashing and its downstream contract
