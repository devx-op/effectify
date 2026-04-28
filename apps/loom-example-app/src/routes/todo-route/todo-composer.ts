import { Atom } from "effect/unstable/reactivity"
import { Component, html, View, Web } from "@effectify/loom"
import { todoActionStatusAtom, todoDraftAtom } from "../todo-route-state.js"
import { submitTodoRouteSubmission } from "../todo-route-submission.js"
import { TodoPanel } from "./todo-route-shared.js"
import { ensureTemplateDocument } from "../../template-dom-support.js"

ensureTemplateDocument()

const renderTodoComposerInputSeam = (
  actionStatus: () => string,
  draft: () => string,
  onSubmit: (titleInput?: string) => Promise<void>,
  onSync: (value: string) => void,
) =>
  View.input().pipe(
    Web.className("todo-input"),
    Web.attr("placeholder", "What should we ship next?"),
    Web.attr("aria-label", "Todo title"),
    Web.data("todo-input", "true"),
    Web.attr("disabled", () => actionStatus() === "submitting"),
    Web.value(() => draft()),
    Web.on("input", ({ currentTarget }) => {
      if (currentTarget instanceof HTMLInputElement) {
        onSync(currentTarget.value)
      }
    }),
    Web.on("keydown", ({ event, currentTarget }) => {
      if (event instanceof KeyboardEvent && event.key === "Enter") {
        event.preventDefault()

        if (currentTarget instanceof HTMLInputElement) {
          void onSubmit(currentTarget.value)
        }
      }
    }),
  )

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
    View.use(TodoPanel, [
      html`
        <h2 class="todo-section-title">Composer</h2>
        <span class="todo-copy">
          The Add button now submits normalized action input through the Loom runtime before the loader revalidates the list.
        </span>
      `,
      html`
        <div class="todo-composer-row">
          ${renderTodoComposerInputSeam(state.actionStatus, state.draft, actions.submitDraft, actions.syncDraft)}
          <button
            type="button"
            class="contrast"
            data-todo-add-action="true"
            disabled=${() => state.actionStatus() === "submitting"}
            web:click=${() => actions.submitDraft()}
          >
            Add todo
          </button>
        </div>
      `,
      html`
        <div class="todo-composer-meta">
          <span class="todo-copy">Every successful submit triggers a self-revalidation through the route loader.</span>
          <span class="todo-session-count" data-todo-session-count="true">
            ${() => `Added from this mounted composer: ${state.additions()}`}
          </span>
        </div>
      `,
    ])
  ),
)
