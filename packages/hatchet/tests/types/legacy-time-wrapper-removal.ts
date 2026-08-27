import { Hatchet } from "../../src/index.js"
import { pushEvent } from "../../src/clients/index.js"
import type * as LegacyClients from "../../src/clients/index.js"

type ScheduleWrapperRemoved = "createSchedule" extends keyof typeof LegacyClients ? never : true
type CronWrapperRemoved = "createCron" extends keyof typeof LegacyClients ? never : true

const scheduleWrapperRemoved: ScheduleWrapperRemoved = true
const cronWrapperRemoved: CronWrapperRemoved = true

void Hatchet
void pushEvent
void scheduleWrapperRemoved
void cronWrapperRemoved
