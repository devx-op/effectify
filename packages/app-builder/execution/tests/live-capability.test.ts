import { lstat, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Cleanup from "../src/cleanup.js"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as Ownership from "../src/ownership.js"
import * as Recovery from "../src/recovery.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import { RunLifecycle } from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
  _tag: "Draft",
  runRef: { id: "run:live-capability", version },
  contracts: {
    planRef: { id: "plan:live-capability", version },
    protocolRef: { id: "protocol:live-capability", version },
  },
  revision: 0,
  lastSequence: 0,
  history: [],
}).runRef
const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    randomBytes: (size) => new Uint8Array(size),
    digest: (_algorithm, bytes) => Effect.sync(() => new Uint8Array(createHash("sha256").update(bytes).digest())),
  }),
)

it("fails the live adapter closed before read, publication, or cleanup when no-follow proof is unavailable", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "effectify-run-store-"))
  try {
    const fileSystem = DurableFileSystem.makeLive()
    const ownership = Ownership.issueForScope({ workspace, lockPath: WorkspaceLock.workspaceLockPath(workspace) })
    const capability = await Effect.runPromise(Effect.result(DurableFileSystem.requireCapabilities(fileSystem)))
    const publication = await Effect.runPromise(
      Effect.result(DurableFileSystem.prepareRunJournalDirectory(fileSystem, workspace, "run:live-capability")),
    )
    const recovery = await Effect.runPromise(
      Recovery.recover({ workspace, runRef }).pipe(
        Effect.provideService(DurableFileSystem.Service, fileSystem),
        Effect.provide(cryptoLayer),
      ),
    )
    const cleanup = await Effect.runPromise(
      Cleanup.cleanup({ workspace, runRef, expectedTailDigest: "0".repeat(64), ownership }).pipe(
        Effect.provideService(DurableFileSystem.Service, fileSystem),
        Effect.provide(cryptoLayer),
      ),
    )

    expect(capability).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "UnsupportedDurability", capability: "noFollowPaths" },
    })
    expect(publication).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "UnsupportedDurability", capability: "noFollowPaths" },
    })
    expect(recovery).toMatchObject({ _tag: "RecoveryBlocked", reason: "UnsupportedDurability" })
    expect(cleanup).toMatchObject({ _tag: "CleanupPreserved", reason: "UnsupportedDurability" })
    await expect(lstat(join(workspace, ".effectify"))).rejects.toMatchObject({ code: "ENOENT" })
  } finally {
    await rm(workspace, { force: true, recursive: true })
  }
})
