export function laneFingerprint({ lane, compilerVersion, patcherVersion = "none" }) {
  return `${lane}:${compilerVersion}:${patcherVersion}`;
}
