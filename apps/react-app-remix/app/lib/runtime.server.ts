import { Runtime } from '@effectify/react-remix'
import * as Layer from 'effect/Layer'

const layers = Layer.empty

export const { withLoaderEffect, withActionEffect } = Runtime.make(layers)
