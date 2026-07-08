import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultBuildRoot = resolve(__dirname, "../build");

/**
 * @param {string} serverBundle
 */
export const extractServerAssetUrls = (serverBundle) => {
  const assetUrls = serverBundle.match(/\/assets\/[A-Za-z0-9._-]+\.js/g) ?? [];

  return [...new Set(assetUrls)].sort();
};

/**
 * @param {string} buildRoot
 */
export const validateBuildAssetContract = (buildRoot) => {
  const serverEntryPath = resolve(buildRoot, "server/index.js");
  const serverBundle = readFileSync(serverEntryPath, "utf8");
  const assetUrls = extractServerAssetUrls(serverBundle);
  const missingAssetUrls = assetUrls.filter((assetUrl) => {
    const assetPath = resolve(buildRoot, "client/assets", basename(assetUrl));
    return !existsSync(assetPath);
  });

  return {
    assetUrls,
    missingAssetUrls,
    serverEntryPath,
  };
};

const runCli = () => {
  const buildRoot = process.argv[2]
    ? resolve(process.argv[2])
    : defaultBuildRoot;
  const { assetUrls, missingAssetUrls, serverEntryPath } =
    validateBuildAssetContract(buildRoot);

  if (assetUrls.length === 0) {
    console.error(`No /assets/*.js references found in ${serverEntryPath}`);
    process.exitCode = 1;
    return;
  }

  if (missingAssetUrls.length > 0) {
    console.error(`Missing emitted client assets for ${serverEntryPath}:`);
    for (const assetUrl of missingAssetUrls) {
      console.error(`- ${assetUrl}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Validated ${assetUrls.length} asset references in ${serverEntryPath}`,
  );
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}
