const fs = require('fs');
const path = require('path');

const tsSolutionSetupPath = path.join(
  process.cwd(),
  'node_modules/@nx/js/src/utils/typescript/ts-solution-setup.js'
);

const content = fs.readFileSync(tsSolutionSetupPath, 'utf-8');
const patchedContent = content.replace(
  /packageJson\.workspaces\.includes/g,
  'Array.isArray(packageJson.workspaces) && packageJson.workspaces.includes'
);

fs.writeFileSync(tsSolutionSetupPath, patchedContent)
