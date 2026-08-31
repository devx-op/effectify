import type * as Layer from "effect/Layer"
import * as BuiltHatchet from "../../dist/src/Hatchet.js"
import * as BuiltTesting from "../../dist/src/testing/index.js"
import * as SourceHatchet from "../../src/Hatchet.js"
import * as SourceTesting from "../../src/testing/index.js"

const sourceLayer: Layer.Layer<SourceHatchet.Hatchet, never, never> = SourceTesting.layerInMemory
const builtLayer: Layer.Layer<BuiltHatchet.Hatchet, never, never> = BuiltTesting.layerInMemory
const sourceIdentity: typeof SourceHatchet.layerInMemory = SourceTesting.layerInMemory
const builtIdentity: typeof BuiltHatchet.layerInMemory = BuiltTesting.layerInMemory

type SourceTestingExportsAreExact = Exclude<keyof typeof SourceTesting, "layerInMemory"> extends never ? true : never
type BuiltTestingExportsAreExact = Exclude<keyof typeof BuiltTesting, "layerInMemory"> extends never ? true : never

const sourceTestingExportsAreExact: SourceTestingExportsAreExact = true
const builtTestingExportsAreExact: BuiltTestingExportsAreExact = true

// @ts-expect-error legacy mock-client exports were removed.
const removedSourceMockClient = SourceTesting.createMockHatchetClient
// @ts-expect-error legacy mock-context exports were removed.
const removedSourceMockContext = SourceTesting.createMockContext
// @ts-expect-error built declarations expose only the modern in-memory Layer.
const removedBuiltMockLayer = BuiltTesting.TestHatchetLayer
// @ts-expect-error built declarations no longer expose mock-context helpers.
const removedBuiltTestTask = BuiltTesting.testTask

void sourceLayer
void builtLayer
void sourceIdentity
void builtIdentity
void sourceTestingExportsAreExact
void builtTestingExportsAreExact
void removedSourceMockClient
void removedSourceMockContext
void removedBuiltMockLayer
void removedBuiltTestTask
