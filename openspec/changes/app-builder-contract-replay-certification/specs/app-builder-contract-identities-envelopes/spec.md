# Delta for App Builder Contract Identities and Envelopes

## MODIFIED Requirements

### Requirement: Nominal validated identity references

The system MUST expose distinct validated brands and versioned references for protocol, run, tool, plan, callback, continuation, trace, schema, and digest identities. `DigestRef` MUST carry externally supplied algorithm identity and digest value with its versioned digest identity. Public constructors/codecs MUST retain brands, validate approved syntax, and MUST NOT permit cross-assignment, widening, digest computation, hashing/verification, or integrity/authenticity claims.

(Previously: `DigestRef` lacked algorithm/value.)

#### Scenario: Domain reference round trip

- GIVEN valid identity values, including external digest algorithm and value
- WHEN its public codec encodes and decodes its versioned reference
- THEN brand, version, algorithm, and digest value are retained

#### Scenario: Cross-domain or malformed ID

- GIVEN a cross-domain or invalid ID, or malformed digest metadata
- WHEN it is constructed or decoded through the public surface
- THEN it is rejected without coercion or digest computation
