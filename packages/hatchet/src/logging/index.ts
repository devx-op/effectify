/**
 * @effectify/hatchet - Logging Module
 *
 * Automatic log synchronization between Effect.log() and Hatchet UI.
 * When Effect.log() is called inside a Hatchet task, logs appear in Hatchet dashboard.
 */

export { createHatchetLogger, HatchetLogger, makeHatchetLogger, withHatchetLogger } from "./hatchet-logger.js"
