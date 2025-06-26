import { ssr, ssrHydrationKey, escape } from 'solid-js/web';
import * as fs from 'fs';
import { c as createServerRpc, d as createServerFn, e as createFileRoute, b as useRouter } from './ssr.mjs';
import 'solid-js';
import '@solid-primitives/refs';
import '@tanstack/router-core';
import 'solid-js/store';
import 'tiny-warning';
import 'tiny-invariant';
import 'effect';
import 'effect/Array';
import 'effect/Chunk';
import 'effect/DateTime';
import 'effect/Effect';
import 'effect/Random';
import 'effect/Schedule';
import 'effect/Schema';
import 'effect/Stream';
import 'effect/SubscriptionRef';
import '@tanstack/solid-query';
import 'effect/ManagedRuntime';
import 'effect/Duration';
import 'effect/Fiber';
import 'effect/Exit';
import 'jsesc';
import '@tanstack/history';
import 'node:async_hooks';
import 'isbot';
import 'node:stream/web';

var _tmpl$ = ["<div", ' class="p-4"><button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Add 1 to <!--$-->', "<!--/-->?</button></div>"];
const filePath = "count.txt";
async function readCount() {
  return parseInt(await fs.promises.readFile(filePath, "utf-8").catch(() => "0"));
}
const getCount_createServerFn_handler = createServerRpc("src_routes_demo_start_server-funcs_tsx--getCount_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return getCount.__executeServer(opts, signal);
});
const getCount = createServerFn({
  method: "GET"
}).handler(getCount_createServerFn_handler, () => {
  return readCount();
});
const updateCount_createServerFn_handler = createServerRpc("src_routes_demo_start_server-funcs_tsx--updateCount_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return updateCount.__executeServer(opts, signal);
});
const updateCount = createServerFn({
  method: "POST"
}).validator((d) => d).handler(updateCount_createServerFn_handler, async ({
  data
}) => {
  const count = await readCount();
  await fs.promises.writeFile(filePath, `${count + data}`);
});
const Route = createFileRoute("/demo/start/server-funcs")({
  component: Home,
  loader: async () => await getCount()
});
function Home() {
  useRouter();
  const state = Route.useLoaderData();
  return ssr(_tmpl$, ssrHydrationKey(), escape(state));
}

export { getCount_createServerFn_handler, updateCount_createServerFn_handler };
//# sourceMappingURL=demo.start.server-funcs-CLgaEQA6.mjs.map
