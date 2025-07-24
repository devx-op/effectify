import type { JSX } from 'solid-js'

interface Props {
  class?: string
  children: JSX.Element
}

export const SidebarContainer = (props: Props) => (
  <aside class={props.class}>
    <div class="b-b-black dark:b-b-gray flex w-full flex-row justify-between border-1 bg-inherit p-3.7">
      <a aria-label="Go to start page" href="/">
        Logo
      </a>
    </div>
    {props.children}
  </aside>
)
