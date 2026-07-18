import type { CronExpression as BuiltCronExpression } from "../../dist/src/index.js"
import type { CronExpression as SourceCronExpression } from "../../src/index.js"

declare const built: BuiltCronExpression.CronExpression
declare const source: SourceCronExpression.CronExpression

const builtFromSource: BuiltCronExpression.CronExpression = source
const sourceFromBuilt: SourceCronExpression.CronExpression = built

void builtFromSource
void sourceFromBuilt
