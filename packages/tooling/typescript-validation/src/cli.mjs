const VALID_COMMANDS = new Set(["typecheck", "acceptance", "preflight", "cache-isolation-test", "fingerprint"]);
const VALID_LANES = new Set(["ts6", "ts7"]);

function invalid(message) {
  const error = new Error(message);
  error.code = "INVALID_CLI";
  return error;
}

export function parseCli(argv) {
  const [command, ...args] = argv;
  if (!VALID_COMMANDS.has(command)) throw invalid(`Unknown command: ${command}`);

  const options = new Map();
  for (const arg of args) {
    if (!arg.startsWith("--")) throw invalid(`Invalid argument: ${arg}`);
    const [key, value = true] = arg.slice(2).split("=", 2);
    options.set(key, value);
  }

  if (options.has("projects") && (options.has("base") || options.has("head"))) {
    throw invalid("--projects cannot be combined with --base or --head");
  }

  const lane = options.get("lane");
  if (["typecheck", "acceptance", "fingerprint"].includes(command)) {
    if (!VALID_LANES.has(lane)) throw invalid("--lane must be ts6 or ts7");
  }

  const result = { command };
  if (lane) result.lane = lane;
  if (options.has("projects")) {
    result.projects = String(options.get("projects")).split(",").filter(Boolean).sort();
  }
  if (options.has("base")) result.base = options.get("base");
  if (options.has("head")) result.head = options.get("head");
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const parsed = parseCli(process.argv.slice(2));
    console.log(`[${parsed.lane ?? "control"}] SKIPPED(not implemented in WU-1)`);
    process.exitCode = 4;
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.code === "INVALID_CLI" ? 2 : 1;
  }
}
