# App Builder Contracts

`@effectify/app-builder-contracts` publishes browser-neutral, passive contracts
for describing App Builder declarations, replay material, and compatibility.
It contains no execution engine, handlers, filesystem access, IPC, services, or
runtime layers.

## Importing the public API

Import from the package root. The root exposes a small named allowlist and
module namespaces; helper decoders and failure constructors remain private.

```ts
import {
  decodeReplayContract,
  projectReplayMaterial,
  certifyPackageCompatibility,
} from "@effectify/app-builder-contracts"
```

Use a namespace when a leaf contract type or codec is needed:

```ts
import { Replay, Reference } from "@effectify/app-builder-contracts"

const digest: Reference.DigestRef = Reference.DigestRef.make({
  id: "digest:release-material",
  version: { major: 1, minor: 0, patch: 0 },
  algorithm: "sha256",
  value: "externally-supplied-value",
})
```

## Compatibility matrix

Compatibility is finite and declaration-driven. Certification accepts only the
following range; it never infers a same-major match and does not solve ranges.

| Module                  | Module range | Protocol                       | Protocol range | Schema          | Schema range |
| ----------------------- | ------------ | ------------------------------ | -------------- | --------------- | ------------ |
| `app-builder-contracts` | `1.0.x`      | `protocol:app-builder` `1.0.x` | `1.0.x`        | `schema:result` | `1.0.x`      |

`certifyPackageCompatibility` rejects unknown or duplicate modules, undeclared
module or protocol versions, and schema-document mismatches with tagged
failures. Returned modules retain declaration order.

## Canonical replay material

Call `decodeReplayContract` at an untrusted boundary, then pass the decoded
contract to `projectReplayMaterial`. The projection preserves every replay
semantic field and identity-significant array order. Object-key normalization
belongs to `effectify-cjson/1`; the replay envelope records
`format: "effectify-replay/1"` before canonicalization.

Equivalent object-key insertion orders produce the same canonical material.
Changing a semantic field or reordering a plan, input, callback, continuation,
baseline, validation, expectation, declaration, or digest-claim array produces

## Digest ownership

`DigestRef` is an external digest claim with `id`, `version`, `algorithm`, and
`value`. An external authority owns digest computation and integrity claims.
This package does not hash, verify, authenticate, or otherwise interpret a
