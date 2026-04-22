import { Atom } from "effect/unstable/reactivity"
import { Component, View, Web } from "@effectify/loom"
import { todoActionStatusAtom, todoDraftAtom } from "../todo-route-state.js"
import { submitTodoRouteSubmission } from "../todo-route-submission.js"
import { TodoPanel } from "./todo-route-shared.js"

export const TodoComposer = Component.make("TodoComposer").pipe(
  Component.state({
    actionStatus: todoActionStatusAtom,
    draft: todoDraftAtom,
    additions: () => Atom.make(0),
  }),
  Component.actions(({ model }) => ({
    submitDraft: async (titleInput?: string): Promise<void> => {
      const title = titleInput ?? model.draft.get()
      const result = await submitTodoRouteSubmission({
        intent: "create",
        title,
      })

      if (result.action._tag === "success") {
        model.draft.set("")
        model.additions.update((value: number) => value + 1)
      }
    },
    syncDraft: (value: string): void => {
      model.draft.set(value)
    },
  })),
  Component.view(({ state, actions }) =>
    Component.use(TodoPanel, [
      View.text("Composer").pipe(Web.as("h2"), Web.className("todo-section-title")),
      View.text(
        "The Add button now submits normalized action input through the Loom runtime before the loader revalidates the list.",
      ).pipe(Web.className("todo-copy")),
      View.hstack(
        View.input().pipe(
          Web.className("todo-input"),
          Web.attr("placeholder", "What should we ship next?"),
          Web.attr("aria-label", "Todo title"),
          Web.data("todo-input", "true"),
          Web.value(() => state.draft()),
          Web.on("input", ({ currentTarget }) => {
            if (currentTarget instanceof HTMLInputElement) {
              actions.syncDraft(currentTarget.value)
            }
          }),
          Web.on("keydown", ({ event, currentTarget }) => {
            if (event instanceof KeyboardEvent && event.key === "Enter") {
              event.preventDefault()

              if (currentTarget instanceof HTMLInputElement) {
                void actions.submitDraft(currentTarget.value)
              }
            }
          }),
        ),
        View.button("Add todo", () => actions.submitDraft()).pipe(
          Web.className("contrast"),
          Web.attr("disabled", () => state.actionStatus() === "submitting"),
          Web.data("todo-add-action", "true"),
        ),
      ).pipe(Web.className("todo-composer-row")),
      View.hstack(
        View.text("Every successful submit triggers a self-revalidation through the route loader.").pipe(
          Web.className("todo-copy"),
        ),
        View.text(() => `Added from this mounted composer: ${state.additions()}`).pipe(
          Web.className("todo-session-count"),
          Web.data("todo-session-count", "true"),
        ),
      ).pipe(Web.className("todo-composer-meta")),
    ])
  ),
)
