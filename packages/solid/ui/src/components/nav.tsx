import { buttonVariants } from "@effectify/solid-ui/components/primitives/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@effectify/solid-ui/components/primitives/tooltip"
import { cn } from "@effectify/solid-ui/lib/utils"
import { For, type JSX, Show } from "solid-js"

type Props = {
  isCollapsed: boolean
  links: {
    title: string
    label?: string
    icon: JSX.Element
    variant: "default" | "ghost"
  }[]
}

export const Nav = (props: Props) => {
  return (
    <div class="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2" data-collapsed={props.isCollapsed}>
      <nav class="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        <For each={props.links}>
          {(item) => (
            <Show
              fallback={
                <a
                  class={cn(
                    buttonVariants({
                      variant: item.variant,
                      size: "sm",
                      class: "text-sm",
                    }),
                    item.variant === "default" &&
                      "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
                    "justify-start",
                  )}
                  href="/"
                >
                  <div class="mr-2">{item.icon}</div>
                  {item.title}
                  {item.label && (
                    <span class={cn("ml-auto", item.variant === "default" && "text-background dark:text-white")}>
                      {item.label}
                    </span>
                  )}
                </a>
              }
              when={props.isCollapsed}
            >
              <Tooltip closeDelay={0} openDelay={0} placement="right">
                <TooltipTrigger
                  as="a"
                  class={cn(
                    buttonVariants({ variant: item.variant, size: "icon" }),
                    "h-9 w-9",
                    item.variant === "default" &&
                      "dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white",
                  )}
                  href="#"
                >
                  {item.icon}
                  <span class="sr-only">{item.title}</span>
                </TooltipTrigger>
                <TooltipContent class="flex items-center gap-4">
                  {item.title}
                  <Show when={item.label}>
                    <span class="ml-auto text-muted-foreground">{item.label}</span>
                  </Show>
                </TooltipContent>
              </Tooltip>
            </Show>
          )}
        </For>
      </nav>
    </div>
  )
}
