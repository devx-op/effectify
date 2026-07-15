import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Logger from "effect/Logger";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
	Hatchet,
	HatchetConfigError,
	HatchetSdkError,
	Task,
	TaskSchemaError,
} from "@effectify/hatchet";

const sdk = vi.hoisted(() => {
	const events: Array<string> = [];
	const start = vi.fn(() => new Promise<void>(() => undefined));
	const waitUntilReady = vi.fn(async () => {
		events.push("waitUntilReady");
	});
	const stop = vi.fn(async () => {
		events.push("stop");
	});
	const registerWorkflows = vi.fn(async () => {
		events.push("register");
	});
	const worker = vi.fn(async () => {
		events.push("create");
		return { registerWorkflows, start, waitUntilReady, stop };
	});
	const runNoWait = vi.fn(
		async (): Promise<{
			readonly runId: Promise<string>;
			readonly output: Promise<{ readonly value: unknown }>;
			readonly cancel: () => Promise<void>;
		}> => ({
			runId: Promise.resolve("sdk-run-42"),
			output: Promise.resolve({ value: "completed" }),
			cancel: vi.fn(async () => undefined),
		}),
	);
	const task = vi.fn((declaration) => ({ ...declaration, runNoWait }));
	return {
		init: vi.fn(() => ({ task, worker })),
		task,
		runNoWait,
		worker,
		registerWorkflows,
		start,
		waitUntilReady,
		stop,
		events,
	};
});

vi.mock("@hatchet-dev/typescript-sdk", () => ({
	Hatchet: { init: sdk.init },
}));

class TypedFailure {
	readonly _tag = "TypedFailure" as const;
}

const sdkContext = (controller: AbortController) => ({
	workflowRunId: () => "workflow-42",
	taskRunExternalId: () => "task-24",
	abortController: controller,
});

const registerLiveTask = async <Name extends string, Input, Output, Failure>(
	task: Task.Task<Name, Input, Output, Failure, never>,
) => {
	await Effect.runPromise(
		Effect.scoped(
			Hatchet.register(task).pipe(
				Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
			),
		),
	);
	return sdk.task.mock.calls.at(-1)?.[0];
};

const callbackCause = (error: unknown): Cause.Cause<unknown> => {
	if (!(error instanceof Error) || !("cause" in error)) {
		throw new Error("expected an adapter-owned callback Error");
	}
	return error.cause as Cause.Cause<unknown>;
};

const failureReasons = <Success, Failure>(exit: Exit.Exit<Success, Failure>) => {
	if (!Exit.isFailure(exit)) throw new Error("expected a failed Exit");
	return exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error);
};

describe("live SDK port", () => {
	beforeEach(() => {
		sdk.events.length = 0;
		vi.clearAllMocks();
		sdk.init.mockImplementation(() => ({ task: sdk.task, worker: sdk.worker }));
		sdk.worker.mockImplementation(async () => {
			sdk.events.push("create");
			return {
				registerWorkflows: sdk.registerWorkflows,
				start: sdk.start,
				waitUntilReady: sdk.waitUntilReady,
				stop: sdk.stop,
			};
		});
		sdk.registerWorkflows.mockImplementation(async () => {
			sdk.events.push("register");
		});
		sdk.start.mockImplementation(() => {
			sdk.events.push("start");
			return new Promise<void>(() => undefined);
		});
		sdk.waitUntilReady.mockImplementation(async () => {
			sdk.events.push("waitUntilReady");
		});
		sdk.stop.mockImplementation(async () => {
			sdk.events.push("stop");
		});
		sdk.runNoWait.mockImplementation(async () => ({
			runId: Promise.resolve("sdk-run-42"),
			output: Promise.resolve({ value: "completed" }),
			cancel: vi.fn(async () => undefined),
		}));
	});
	it("constructs and maps structured errors through originalCause without the native cause getter collision", async () => {
		const nativeCause = new Error("native cause");
		expect(
			() =>
				new HatchetConfigError({ field: "client", originalCause: nativeCause }),
		).not.toThrow();
		const sdkError = new HatchetSdkError({
			operation: "worker.waitUntilReady",
			originalCause: nativeCause,
		});
		expect(sdkError.originalCause).toBe(nativeCause);

		sdk.init.mockImplementationOnce(() => {
			throw nativeCause;
		});
		const configExit = await Effect.runPromiseExit(
			Effect.scoped(
				Effect.void.pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);
		const configFailures = failureReasons(configExit);
		expect(configFailures).toHaveLength(1);
		expect(configFailures[0]).toBeInstanceOf(HatchetConfigError);
		if (!(configFailures[0] instanceof HatchetConfigError)) {
			throw new Error("expected a HatchetConfigError");
		}
		expect(configFailures[0].originalCause).toBe(nativeCause);
	});

	it("exposes the scoped live layer alongside the installed SDK contract", () => {
		expect(Hatchet).toHaveProperty("layer");
	});

	it("creates one SDK standalone declaration when a task is registered", async () => {
		const registeredTask = Task.make({
			name: "live-declaration",
			fn: (input: string) => Effect.succeed(input.toUpperCase()),
		});

		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(registeredTask).pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		expect(sdk.init).toHaveBeenCalledWith({});
		expect(sdk.task).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "live-declaration",
				fn: expect.any(Function),
			}),
		);
	});

	it("executes the declaration through the captured task pipeline and SDK context identities", async () => {
		const task = Task.make({
			name: "callback-context",
			fn: (input: string, context) =>
				Effect.succeed(
					`${input}:${Option.getOrThrow(context.workflowRunId)}:${Option.getOrThrow(context.taskRunExternalId)}`,
				),
		});
		const controller = new AbortController();
		const addEventListener = vi.spyOn(controller.signal, "addEventListener");
		const removeEventListener = vi.spyOn(
			controller.signal,
			"removeEventListener",
		);

		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		const declaration = sdk.task.mock.calls.at(-1)?.[0];
		await expect(
			declaration.fn("input", {
				workflowRunId: () => "workflow-42",
				taskRunExternalId: () => "task-24",
				abortController: controller,
			}),
		).resolves.toEqual({ value: "input:workflow-42:task-24" });
		expect(addEventListener).toHaveBeenCalledTimes(1);
		expect(addEventListener).toHaveBeenCalledWith(
			"abort",
			expect.any(Function),
			{ once: true },
		);
		expect(removeEventListener).toHaveBeenCalledTimes(1);
	});

	it("encodes schema-backed output before wrapping it in the internal SDK envelope", async () => {
		const task = Task.make({
			name: "callback-schema-output",
			output: Schema.NumberFromString,
			fn: () => Effect.succeed(7),
		});
		const controller = new AbortController();

		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		const declaration = sdk.task.mock.calls.at(-1)?.[0];
		await expect(
			declaration.fn(undefined, {
				workflowRunId: () => "workflow-42",
				taskRunExternalId: () => "task-24",
				abortController: controller,
			}),
		).resolves.toEqual({ value: "7" });
	});

	it("wraps a transportable record output in the internal SDK envelope", async () => {
		const task = Task.make({
			name: "callback-record",
			fn: () => Effect.succeed({ result: "ok", count: 2 }),
		});
		const controller = new AbortController();

		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		const declaration = sdk.task.mock.calls.at(-1)?.[0];
		await expect(
			declaration.fn(undefined, {
				workflowRunId: () => "workflow-42",
				taskRunExternalId: () => "task-24",
				abortController: controller,
			}),
		).resolves.toEqual({ value: { result: "ok", count: 2 } });
	});

	it("rejects schema-free non-serializable callback output at the live transport boundary", async () => {
		const declaration = await registerLiveTask(
			Task.make({
				name: "callback-non-serializable",
				fn: () => Effect.succeed(new Date()),
			}),
		);

		const error = await declaration
			.fn(undefined, sdkContext(new AbortController()))
			.catch((reason: unknown) => reason);
		const cause = callbackCause(error);
		expect(Cause.hasDies(cause)).toBe(true);
	});

	it("retains typed user, schema, defect, and interruption Causes in callback errors", async () => {
		const typed = await registerLiveTask(
			Task.make({
				name: "callback-typed-failure",
				fn: () => Effect.fail(new TypedFailure()),
			}),
		);
		const schema = await registerLiveTask(
			Task.make({
				name: "callback-schema-failure",
				input: Schema.Number,
				fn: (input) => Effect.succeed(input),
			}),
		);
		const defect = await registerLiveTask(
			Task.make({
				name: "callback-defect",
				fn: () => Effect.die("unexpected defect"),
			}),
		);
		const interrupted = await registerLiveTask(
			Task.make({ name: "callback-interrupted", fn: () => Effect.never }),
		);

		const typedError = await typed
			.fn(undefined, sdkContext(new AbortController()))
			.catch((error: unknown) => error);
		const schemaError = await schema
			.fn("not-a-number", sdkContext(new AbortController()))
			.catch((error: unknown) => error);
		const defectError = await defect
			.fn(undefined, sdkContext(new AbortController()))
			.catch((error: unknown) => error);
		const controller = new AbortController();
		const interruptedPromise = interrupted.fn(
			undefined,
			sdkContext(controller),
		);
		controller.abort();
		const interruptedError = await interruptedPromise.catch(
			(error: unknown) => error,
		);

		const typedCause = callbackCause(typedError);
		const schemaCause = callbackCause(schemaError);
		const defectCause = callbackCause(defectError);
		const interruptedCause = callbackCause(interruptedError);
		expect(
			typedCause.reasons
				.filter(Cause.isFailReason)
				.map((reason) => reason.error),
		).toEqual([new TypedFailure()]);
		const schemaFailures = schemaCause.reasons
			.filter(Cause.isFailReason)
			.map((reason) => reason.error);
		expect(schemaFailures).toHaveLength(1);
		expect(schemaFailures[0]).toBeInstanceOf(TaskSchemaError);
		expect(Cause.hasDies(defectCause)).toBe(true);
		expect(Cause.hasInterrupts(interruptedCause)).toBe(true);
	});

	it("removes one abort listener after repeated abort calls", async () => {
		const task = Task.make({
			name: "callback-repeated-abort",
			fn: () => Effect.never,
		});
		const controller = new AbortController();
		const removeEventListener = vi.spyOn(
			controller.signal,
			"removeEventListener",
		);
		const declaration = await registerLiveTask(task);

		const callback = declaration.fn(undefined, sdkContext(controller));
		controller.abort();
		controller.abort();
		const callbackError = await callback.catch((error: unknown) => error);
		expect(Cause.hasInterrupts(callbackCause(callbackError))).toBe(true);
		expect(removeEventListener).toHaveBeenCalledTimes(1);
	});

	it("starts one lazy worker in create → register → fork start → waitUntilReady → ready order", async () => {
		const task = Task.make({
			name: "lifecycle-order",
			fn: (input: string) => Effect.succeed(input),
		});

		await expect(
			Effect.runPromise(
				Effect.scoped(
					Hatchet.register(task).pipe(
						Effect.flatMap((registered) => Hatchet.run(registered, {})),
						Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
					),
				),
			),
		).resolves.toBe("completed");
		expect(sdk.events).toEqual([
			"create",
			"register",
			"start",
			"waitUntilReady",
			"stop",
		]);
		expect(sdk.worker).toHaveBeenCalledTimes(1);
		expect(sdk.registerWorkflows).toHaveBeenCalledTimes(1);
		expect(sdk.start).toHaveBeenCalledTimes(1);
		expect(sdk.waitUntilReady).toHaveBeenCalledTimes(1);
	});

	it("shares one concurrent startup and closes registration once activation begins", async () => {
		const first = Task.make({
			name: "lifecycle-first",
			fn: (_input: undefined) => Effect.succeed("first"),
		});
		const late = Task.make({
			name: "lifecycle-late",
			fn: (_input: undefined) => Effect.succeed("late"),
		});

		const result = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(first).pipe(
					Effect.flatMap((registered) =>
						Effect.all(
							[
								Hatchet.run(registered, {}),
								Hatchet.run(registered, {}),
							],
							{
								concurrency: "unbounded",
							},
						).pipe(Effect.andThen(Hatchet.register(late))),
					),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		expect(sdk.worker).toHaveBeenCalledTimes(1);
		expect(sdk.registerWorkflows).toHaveBeenCalledTimes(1);
		const failures = failureReasons(result);
		expect(failures).toHaveLength(1);
		if (
			typeof failures[0] !== "object" ||
			failures[0] === null ||
			!("_tag" in failures[0])
		) {
			throw new Error("expected a WorkerAlreadyStartedError");
		}
		expect(failures[0]._tag).toBe("WorkerAlreadyStartedError");
	});

	it("stops once and joins the start work when readiness fails during partial acquisition", async () => {
		const readinessFailure = new Error("not ready");
		let resolveStart: (() => void) | undefined;
		sdk.start.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					sdk.events.push("start");
					resolveStart = () => {
						sdk.events.push("start-settled");
						resolve();
					};
				}),
		);
		sdk.stop.mockImplementation(async () => {
			sdk.events.push("stop");
			resolveStart?.();
		});
		sdk.waitUntilReady.mockImplementationOnce(async () => {
			sdk.events.push("waitUntilReady");
			throw readinessFailure;
		});
		const task = Task.make({
			name: "lifecycle-cleanup",
			fn: (_input: undefined) => Effect.succeed("ok"),
		});

		const result = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		expect(result).toMatchObject({ _tag: "Failure" });
		expect(sdk.stop).toHaveBeenCalledTimes(1);
		expect(sdk.events).toEqual([
			"create",
			"register",
			"start",
			"waitUntilReady",
			"stop",
			"start-settled",
		]);
	});

	it("bounds a never-settling stop while completing start-fiber cleanup", async () => {
		sdk.stop.mockImplementation(() => {
			sdk.events.push("stop");
			return new Promise<void>(() => undefined);
		});
		const logs: Array<unknown> = [];
		const logger = Logger.make((entry) => logs.push(entry));
		const task = Task.make({
			name: "stop-timeout",
			fn: () => Effect.succeed("ok"),
		});

		const closure = Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(
						Hatchet.layer({
							worker: { name: "live-worker", stopTimeout: 10 },
						}),
					),
				),
			).pipe(Effect.provide(Logger.layer([logger]))),
		);
		const exit = await Promise.race([
			closure,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("scope closure remained blocked")), 500),
			),
		]);

		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit)) throw new Error("expected stop timeout defect");
		expect(Cause.hasDies(exit.cause)).toBe(true);
		expect(sdk.stop).toHaveBeenCalledTimes(1);
		expect(logs).toEqual([
			expect.objectContaining({
				message: ["Hatchet worker stop timed out", "live-worker"],
			}),
		]);
	});

	it("closes a ready worker once, stops it, and waits for its long-running start", async () => {
		let resolveStart: (() => void) | undefined;
		sdk.start.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					sdk.events.push("start");
					resolveStart = () => {
						sdk.events.push("start-settled");
						resolve();
					};
				}),
		);
		sdk.stop.mockImplementation(async () => {
			sdk.events.push("stop");
			resolveStart?.();
		});
		const task = Task.make({
			name: "normal-scope-cleanup",
			fn: () => Effect.succeed("ok"),
		});

		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		expect(sdk.stop).toHaveBeenCalledTimes(1);
		expect(sdk.events).toEqual([
			"create",
			"register",
			"start",
			"waitUntilReady",
			"stop",
			"start-settled",
		]);
	});

	it("continues start cleanup after stop rejects while retaining the readiness failure", async () => {
		const readinessFailure = new Error("not ready");
		const stopFailure = new Error("stop failed");
		let resolveStart: (() => void) | undefined;
		sdk.start.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					sdk.events.push("start");
					resolveStart = () => {
						sdk.events.push("start-settled");
						resolve();
					};
				}),
		);
		sdk.waitUntilReady.mockImplementationOnce(async () => {
			sdk.events.push("waitUntilReady");
			throw readinessFailure;
		});
		sdk.stop.mockImplementation(async () => {
			sdk.events.push("stop");
			resolveStart?.();
			throw stopFailure;
		});
		const task = Task.make({
			name: "failed-scope-cleanup",
			fn: () => Effect.succeed("ok"),
		});

		const logs: Array<unknown> = [];
		const logger = Logger.make((entry) => logs.push(entry));
		const exit = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			).pipe(Effect.provide(Logger.layer([logger]))),
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit)) throw new Error("expected cleanup failure");

		const failures = exit.cause.reasons
			.filter(Cause.isFailReason)
			.map((reason) => reason.error);
		expect(failures).toHaveLength(1);
		const readinessError = failures[0];
		expect(readinessError).toBeInstanceOf(HatchetSdkError);
		if (!(readinessError instanceof HatchetSdkError)) {
			throw new Error("expected a HatchetSdkError readiness failure");
		}
		expect(readinessError.operation).toBe("worker.waitUntilReady");
		expect(readinessError.originalCause).toBe(readinessFailure);

		expect(Cause.hasDies(exit.cause)).toBe(false);
		expect(logs).toHaveLength(1);
		expect(logs[0]).toMatchObject({
			message: [
				"Hatchet worker stop failed during failed scope cleanup",
				stopFailure,
			],
		});

		expect(sdk.stop).toHaveBeenCalledTimes(1);
		expect(sdk.events).toContain("start-settled");
	});

	it("exposes a stop rejection as a defect after successful scope cleanup", async () => {
		const stopFailure = new Error("stop failed");
		let resolveStart: (() => void) | undefined;
		sdk.start.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					sdk.events.push("start");
					resolveStart = () => {
						sdk.events.push("start-settled");
						resolve();
					};
				}),
		);
		sdk.stop.mockImplementation(async () => {
			sdk.events.push("stop");
			resolveStart?.();
			throw stopFailure;
		});
		const task = Task.make({
			name: "successful-scope-stop-rejection",
			fn: () => Effect.succeed("ok"),
		});

		const exit = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit)) throw new Error("expected finalizer defect");
		expect(Cause.hasDies(exit.cause)).toBe(true);
		expect(exit.cause.reasons.filter(Cause.isFailReason)).toHaveLength(0);
		const defects = exit.cause.reasons
			.filter(Cause.isDieReason)
			.map((reason) => reason.defect);
		expect(defects).toHaveLength(1);
		if (!(defects[0] instanceof Error) || !("originalCause" in defects[0])) {
			throw new Error("expected an internal stop defect with originalCause");
		}
		expect(defects[0].originalCause).toBe(stopFailure);
		expect(sdk.stop).toHaveBeenCalledTimes(1);
		expect(sdk.events).toContain("start-settled");
	});

	it("rejects runs retained past a closed live-worker scope", async () => {
		const task = Task.make({
			name: "closed-worker-run",
			fn: () => Effect.succeed("ok"),
		});
		const retained = await Effect.runPromise(
			Effect.scoped(
				Effect.gen(function* () {
					const service = yield* Hatchet.Hatchet;
					const registered = yield* Hatchet.register(task);
					yield* Hatchet.run(registered, {});
					return { registered, service };
				}).pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		const exit = await Effect.runPromiseExit(
			Effect.scoped(retained.service.run(retained.registered, undefined)),
		);
		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit))
			throw new Error("expected closed-worker failure");
		const failures = exit.cause.reasons
			.filter(Cause.isFailReason)
			.map((reason) => reason.error);
		expect(failures).toHaveLength(1);
		expect(failures[0]).toBeInstanceOf(HatchetSdkError);
		if (!(failures[0] instanceof HatchetSdkError)) {
			throw new Error("expected a HatchetSdkError");
		}
		expect(failures[0].operation).toBe("worker.run");
	});

	it("rejects an already-aborted SDK callback and does not register an abort listener", async () => {
		const task = Task.make({
			name: "callback-abort",
			fn: () => Effect.never,
		});
		const controller = new AbortController();
		const addEventListener = vi.spyOn(controller.signal, "addEventListener");
		controller.abort();

		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		const declaration = sdk.task.mock.calls.at(-1)?.[0];
		const callbackError = await declaration
			.fn(undefined, {
				workflowRunId: () => "workflow-42",
				taskRunExternalId: () => "task-24",
				abortController: controller,
			})
			.catch((error: unknown) => error);
		expect(Cause.hasInterrupts(callbackCause(callbackError))).toBe(true);
		expect(addEventListener).not.toHaveBeenCalled();
	});

	it("acquires the real SDK RunHandle and unwraps primitive and record output", async () => {
		const primitive = Task.make({
			name: "remote-primitive",
			fn: () => Effect.succeed("unused"),
		});
		const record = Task.make({
			name: "remote-record",
			fn: () => Effect.succeed({ unused: true }),
		});
		const cancel = vi.fn(async () => undefined);
		sdk.runNoWait
			.mockResolvedValueOnce({
				runId: Promise.resolve("remote-primitive-id"),
				output: Promise.resolve({ value: "remote-value" }),
				cancel,
			})
			.mockResolvedValueOnce({
				runId: Promise.resolve("remote-record-id"),
				output: Promise.resolve({ value: { complete: true } }),
				cancel,
			});

		const result = await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(primitive).pipe(
					Effect.bindTo("primitive"),
					Effect.bind("record", () => Hatchet.register(record)),
					Effect.flatMap(({ primitive, record }) =>
						Effect.all([
							Hatchet.runNoWait(primitive, {}),
							Hatchet.run(record, {}),
						]),
					),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		expect(result[0].id).toBe("remote-primitive-id");
		expect(await Effect.runPromise(result[0].await)).toBe("remote-value");
		expect(result[1]).toEqual({ complete: true });
		expect(sdk.runNoWait).toHaveBeenCalledTimes(2);
		expect(cancel).not.toHaveBeenCalled();
	});

	it("encodes transformed schema input before dispatch and preserves callback decoding", async () => {
		const task = Task.make({
			name: "remote-schema-input",
			input: Schema.Struct({ value: Schema.NumberFromString }),
			fn: ({ value }) => Effect.succeed(value),
		});
		await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, { value: 7 })),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		const declaration = sdk.task.mock.calls.at(-1)?.[0];
		expect(sdk.runNoWait).toHaveBeenCalledWith({ value: "7" });
		await expect(
			declaration.fn(
				{ value: "8" },
				sdkContext(new AbortController()),
			),
		).resolves.toEqual({ value: 8 });
	});

	it("rejects schema-free primitive input before SDK dispatch", async () => {
		const task = Task.make({
			name: "remote-primitive-input",
			fn: (input: string) => Effect.succeed(input),
		});
		const exit = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, "unsafe")),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);
		expect(failureReasons(exit)).toEqual([
			expect.objectContaining({
				_tag: "HatchetSdkError",
				operation: "task.runNoWait.input",
				resourceId: "remote-primitive-input",
				originalCause: expect.any(TypeError),
			}),
		]);
		expect(sdk.runNoWait).not.toHaveBeenCalled();
	});

	it("maps RunHandle acquisition, identity, output, and cancellation rejections to retained-cause SDK errors", async () => {
		const task = Task.make({
			name: "remote-errors",
			fn: () => Effect.succeed("unused"),
		});
		const acquisition = new Error("acquisition");
		const runId = new Error("runId");
		const cancellation = new Error("cancel");
		const cancel = vi.fn(async () => {
			throw cancellation;
		});
		sdk.runNoWait
			.mockRejectedValueOnce(acquisition)
			.mockResolvedValueOnce({
				runId: Promise.reject(runId),
				output: Promise.resolve({ value: "unused" }),
				cancel,
			})
			.mockResolvedValueOnce({
				runId: Promise.resolve("cancel-id"),
				output: Promise.resolve({ value: "still-running" }),
				cancel,
			});

		const outcomes = await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) =>
						Effect.all([
							Hatchet.runNoWait(registered, {}).pipe(Effect.exit),
							Hatchet.runNoWait(registered, {}).pipe(Effect.exit),
							Hatchet.runNoWait(registered, {}).pipe(Effect.exit),
						]),
					),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);
		for (const [index, operation, cause] of [
			[0, "task.runNoWait", acquisition],
			[1, "run.runId", runId],
		] as const) {
			const failures = failureReasons(outcomes[index]);
			expect(failures).toHaveLength(1);
			expect(failures[0]).toBeInstanceOf(HatchetSdkError);
			if (!(failures[0] instanceof HatchetSdkError)) {
				throw new Error("expected a HatchetSdkError");
			}
			expect(failures[0].operation).toBe(operation);
			expect(failures[0].originalCause).toBe(cause);
		}
		const handle =
			outcomes[2]._tag === "Success" ? outcomes[2].value : undefined;
		expect(handle).toBeDefined();
		const cancellationFailures = failureReasons(
			await Effect.runPromiseExit(handle!.cancel),
		);
		expect(cancellationFailures).toHaveLength(1);
		expect(cancellationFailures[0]).toBeInstanceOf(HatchetSdkError);
		if (!(cancellationFailures[0] instanceof HatchetSdkError)) {
			throw new Error("expected a HatchetSdkError cancellation failure");
		}
		expect(cancellationFailures[0].operation).toBe("run.cancel");
		expect(cancellationFailures[0].resourceId).toBe("cancel-id");
		expect(cancellationFailures[0].originalCause).toBe(cancellation);
	});

	it("maps SDK output rejection to a retained-cause error instead of user failure", async () => {
		const task = Task.make({
			name: "remote-output-rejection",
			fn: () => Effect.fail(new TypedFailure()),
		});
		const output = new Error("output");
		sdk.runNoWait.mockImplementationOnce(async () => ({
			runId: Promise.resolve("output-id"),
			output: Promise.reject(output),
			cancel: vi.fn(async () => undefined),
		}));
		const exit = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);
		const failures = failureReasons(exit);
		expect(failures).toHaveLength(1);
		expect(failures[0]).toBeInstanceOf(HatchetSdkError);
		if (!(failures[0] instanceof HatchetSdkError)) {
			throw new Error("expected a HatchetSdkError output failure");
		}
		expect(failures[0].operation).toBe("run.output");
		expect(failures[0].resourceId).toBe("output-id");
		expect(failures[0].originalCause).toBe(output);
	});

	it("decodes schema-backed output only after unwrapping the SDK envelope", async () => {
		const task = Task.make({
			name: "schema-after-unwrapping",
			output: Schema.NumberFromString,
			fn: () => Effect.succeed(0),
		});
		sdk.runNoWait.mockResolvedValueOnce({
			runId: Promise.resolve("schema-output-id"),
			output: Promise.resolve({ value: "7" }),
			cancel: vi.fn(async () => undefined),
		});

		await expect(
			Effect.runPromise(
				Effect.scoped(
					Hatchet.register(task).pipe(
						Effect.flatMap((registered) => Hatchet.run(registered, {})),
						Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
					),
				),
			),
		).resolves.toBe(7);
	});

	it("reports post-unwrapping schema validation failures as task schema errors", async () => {
		const task = Task.make({
			name: "invalid-schema-after-unwrapping",
			output: Schema.Number,
			fn: () => Effect.succeed(0),
		});
		sdk.runNoWait.mockResolvedValueOnce({
			runId: Promise.resolve("invalid-schema-output-id"),
			output: Promise.resolve({ value: "not-a-number" }),
			cancel: vi.fn(async () => undefined),
		});

		const exit = await Effect.runPromiseExit(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) => Hatchet.run(registered, {})),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);
		const failures = failureReasons(exit);
		expect(failures).toHaveLength(1);
		expect(failures[0]).toBeInstanceOf(TaskSchemaError);
		if (!(failures[0] instanceof TaskSchemaError)) {
			throw new Error("expected a TaskSchemaError");
		}
		expect(failures[0].phase).toBe("output");
	});

	it("maps every malformed resolved envelope to a retained-cause SDK error", async () => {
		const task = Task.make({
			name: "malformed-envelope",
			fn: () => Effect.fail(new TypedFailure()),
		});
		const malformed = [
			null,
			[],
			"primitive",
			{},
			Object.create({ value: "inherited" }),
		];
		for (const [index, output] of malformed.entries()) {
			sdk.runNoWait.mockResolvedValueOnce({
				runId: Promise.resolve(`bad-envelope-${index}`),
				output: Promise.resolve(output),
				cancel: vi.fn(async () => undefined),
			});
			const exit = await Effect.runPromiseExit(
				Effect.scoped(
					Hatchet.register(task).pipe(
						Effect.flatMap((registered) => Hatchet.run(registered, {})),
						Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
					),
				),
			);
			const failures = failureReasons(exit);
			expect(failures).toHaveLength(1);
			expect(failures[0]).toBeInstanceOf(HatchetSdkError);
			if (!(failures[0] instanceof HatchetSdkError)) {
				throw new Error("expected a HatchetSdkError malformed-envelope failure");
			}
			expect(failures[0].operation).toBe("run.output");
			expect(failures[0].resourceId).toBe(`bad-envelope-${index}`);
			expect(failures[0].originalCause).toBe(output);
		}
	});

	it("treats accepted cancellation separately from remote completion", async () => {
		const task = Task.make({
			name: "cancel-is-not-completion",
			fn: () => Effect.succeed("unused"),
		});
		let rejectOutput: ((reason: unknown) => void) | undefined;
		const cancel = vi.fn(async () => undefined);
		sdk.runNoWait.mockResolvedValueOnce({
			runId: Promise.resolve("cancel-separate-id"),
			output: new Promise((_, reject) => {
				rejectOutput = reject;
			}),
			cancel,
		});
		const handle = await Effect.runPromise(
			Effect.scoped(
				Hatchet.register(task).pipe(
					Effect.flatMap((registered) =>
						Hatchet.runNoWait(registered, {}),
					),
					Effect.provide(Hatchet.layer({ worker: { name: "live-worker" } })),
				),
			),
		);

		await expect(Effect.runPromise(handle.cancel)).resolves.toBeUndefined();
		expect(cancel).toHaveBeenCalledTimes(1);
		const completion = new Error("remote cancelled");
		rejectOutput?.(completion);
		const completionError = await Effect.runPromise(handle.await).catch(
			(error: unknown) => error,
		);
		expect(completionError).toBeInstanceOf(HatchetSdkError);
		if (!(completionError instanceof HatchetSdkError)) {
			throw new Error("expected a HatchetSdkError completion failure");
		}
		expect(completionError.operation).toBe("run.output");
		expect(completionError.resourceId).toBe("cancel-separate-id");
		expect(completionError.originalCause).toBe(completion);
	});
});
