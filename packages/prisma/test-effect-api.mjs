import * as Effect from "effect";
import * as Runtime from "effect/Runtime";

const runtimeKeys = Object.keys(Runtime);
console.log("Runtime exports:", runtimeKeys.join(", "));

const effectKeys = Object.keys(Effect);
const forkRunKeys = effectKeys.filter(
  (k) =>
    k.includes("run") ||
    k.includes("fork") ||
    k.includes("Fork") ||
    k.includes("Run") ||
    k.includes("sync")
);
console.log("Effect fork/run keys:", forkRunKeys.join(", "));

// Check defaultRuntime
const defaultRuntime = Runtime.defaultRuntime;
console.log("defaultRuntime:", typeof defaultRuntime);

// Try running a simple effect
const prog = Effect.succeed(42);
try {
  const result = Effect.runPromise(prog);
  result
    .then((r) => console.log("runPromise works:", r))
    .catch((e) => console.log("runPromise error:", e.message));
} catch (e) {
  console.log("Error running effect:", e.message);
}
