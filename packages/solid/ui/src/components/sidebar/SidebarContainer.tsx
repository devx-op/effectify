import type { JSX } from 'solid-js'

interface Props {
  class?: string
  children: JSX.Element
}

export const SidebarContainer = (props: Props) => (
  <aside class={props.class}>
    <div class="bg-inherit flex flex-row justify-between w-full p-3.7 border-1 b-b-black dark:b-b-gray">
      <a href="/" aria-label="Go to start page">
        Logo
      </a>
    </div>
    {props.children}
  </aside>
)
