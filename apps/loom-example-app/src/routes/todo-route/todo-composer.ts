import { Atom } from "effect/unstable/reactivity"
import { Component, html, View } from "@effectify/loom"
import { todoActionStatusAtom, todoDraftAtom } from "../todo-route-state.js"
import { submitTodoRoute } from "../todo-route.js"
import { TodoPanel } from "./todo-route-shared.js"

const readTodoTitleInput = (form: HTMLFormElement): string | undefined => {
  const titleInput = form.elements.namedItem("title")
  return titleInput instanceof HTMLInputElement ? titleInput.value : undefined
}

export const TodoComposer = Component.make().pipe(
  Component.state({
    actionStatus: todoActionStatusAtom,
    draft: todoDraftAtom,
    additions: () => Atom.make(0),
  }),
  Component.actions(({ model }) => ({
    submitDraft: async (titleInput?: string): Promise<void> => {
      const title = titleInput ?? model.draft.get()
      const result = await submitTodoRoute({
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
          <form
            class="todo-composer-form"
            web:submit=${({ currentTarget, event }) => {
        event.preventDefault()

        if (currentTarget instanceof HTMLFormElement) {
          void actions.submitDraft(readTodoTitleInput(currentTarget))
        }
      }}
          >
            <input
              type="text"
              class="todo-input"
              placeholder="What should we ship next?"
              aria-label="Todo title"
              data-todo-input="true"
              name="title"
              disabled=${() => state.actionStatus() === "submitting"}
              web:value=${() => state.draft()}
              web:input=${({ currentTarget }) => {
        if (currentTarget instanceof HTMLInputElement) {
          actions.syncDraft(currentTarget.value)
        }
      }}
            />
            <button
              type="button"
              class="contrast"
              data-todo-add-action="true"
              disabled=${() => state.actionStatus() === "submitting"}
              web:click=${() => actions.submitDraft()}
            >
              Add todo
            </button>
          </form>
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
