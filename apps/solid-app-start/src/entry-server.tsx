/// <reference types="@tanstack/solid-start/server" />
import { createHandler, renderAsync, StartServer } from '@tanstack/solid-start/server'

export default createHandler(renderAsync((event) => <StartServer event={event} />))
