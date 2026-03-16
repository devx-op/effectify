import "dotenv/config"
import { Runtime } from "@effectify/react-router"
import * as Layer from "effect/Layer"

const AppLayer = Layer.empty

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
