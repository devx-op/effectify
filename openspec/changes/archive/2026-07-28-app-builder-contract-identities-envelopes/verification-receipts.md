pnpm nx show project @effectify/app-builder-contracts --json | exit=0 | proof=test,typecheck,lint,build targets present | PASS
pnpm nx test @effectify/app-builder-contracts | exit=0 | proof=5 files, 8 tests passed | PASS
pnpm nx typecheck @effectify/app-builder-contracts | exit=0 | proof=lib and spec checks passed | PASS
pnpm nx lint @effectify/app-builder-contracts | exit=0 | proof=12 files, 0 errors | PASS
pnpm nx build @effectify/app-builder-contracts | exit=0 | proof=TypeScript compilation passed | PASS
pnpm exec oxfmt --write candidate-owned paths | exit=0 | proof=14 paths formatted | PASS
pnpm exec oxfmt --list-different candidate-owned paths | exit=0 | proof=all owned paths formatted | PASS
pnpm exec oxfmt --check candidate-owned corrected paths | exit=0 | proof=17 files formatted | PASS
pnpm nx test @effectify/app-builder-contracts | exit=0 | proof=5 files, 9 tests passed | PASS
pnpm nx typecheck @effectify/app-builder-contracts | exit=0 | proof=lib and spec checks passed | PASS
pnpm nx lint @effectify/app-builder-contracts | exit=0 | proof=11 files, 0 errors | PASS
pnpm nx build @effectify/app-builder-contracts | exit=0 | proof=TypeScript compilation passed | PASS
pnpm install --frozen-lockfile --ignore-scripts | exit=0 | proof=lockfile up to date | PASS
pnpm exec oxfmt --write candidate-owned paths | exit=0 | proof=20 paths formatted | PASS
pnpm exec oxfmt --check candidate-owned paths | exit=0 | proof=20 paths formatted | PASS
pnpm nx test @effectify/app-builder-contracts | exit=0 | proof=5 files, 10 tests passed | PASS
pnpm nx typecheck @effectify/app-builder-contracts | exit=0 | proof=lib and spec checks passed | PASS
pnpm nx lint @effectify/app-builder-contracts | exit=0 | proof=11 files, 0 errors | PASS
pnpm nx build @effectify/app-builder-contracts | exit=0 | proof=TypeScript compilation passed from valid cache | PASS
pnpm install --frozen-lockfile --ignore-scripts | exit=0 | proof=lockfile up to date | PASS
git diff --check | exit=0 | proof=no whitespace errors | PASS
pnpm exec oxfmt --check corrected paths | exit=0 | proof=4 corrected paths formatted | PASS
pnpm nx test @effectify/app-builder-contracts | exit=0 | proof=5 files, 11 tests passed | PASS
pnpm nx typecheck @effectify/app-builder-contracts | exit=0 | proof=lib and spec checks passed | PASS
pnpm nx lint @effectify/app-builder-contracts | exit=0 | proof=11 files, 0 errors | PASS
pnpm nx build @effectify/app-builder-contracts | exit=0 | proof=TypeScript compilation passed | PASS
pnpm install --frozen-lockfile --ignore-scripts | exit=0 | proof=lockfile up to date | PASS
git diff --check | exit=0 | proof=no whitespace errors | PASS
