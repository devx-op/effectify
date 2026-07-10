const LITERAL_SKIP_NX_CACHE = "--skip-nx-cache";
const SHELL_CONTROL_OPERATOR = /&&|\|\||;|\||\r?\n|\$\(|`/;

function isSingleCommandSegment(command) {
  return typeof command === "string" && !SHELL_CONTROL_OPERATOR.test(command);
}

export function hasLiteralSkipNxCache(command) {
  return isSingleCommandSegment(command) && command.split(/\s+/).includes(LITERAL_SKIP_NX_CACHE);
}

export function isTopLevelNxInvocation(command) {
  return isSingleCommandSegment(command) && /^(?:pnpm\s+)?nx\s+run\s+\S+/.test(command.trim());
}

export function classifyEvidence({ command, executionClass, nxCache }) {
  const literalSkipNxCache = hasLiteralSkipNxCache(command);
  const topLevelNxInvocation = isTopLevelNxInvocation(command);
  const accepted =
    executionClass === "real" &&
    topLevelNxInvocation &&
    literalSkipNxCache &&
    nxCache === "disabled";

  return {
    accepted,
    executionClass,
    literalSkipNxCache,
    nxCache,
    topLevelNxInvocation,
  };
}
