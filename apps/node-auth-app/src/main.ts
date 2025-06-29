import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Layer from 'effect/Layer'
import * as Http from './http.js'

Layer.launch(Http.Live).pipe(NodeRuntime.runMain())
