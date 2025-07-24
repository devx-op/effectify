import { cn } from '@effectify/solid-ui/lib/utils'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import type { PopoverContentProps, PopoverRootProps } from '@kobalte/core/popover'
import { Popover as PopoverPrimitive } from '@kobalte/core/popover'
import type { ParentProps, ValidComponent } from 'solid-js'
import { mergeProps, splitProps } from 'solid-js'

export const Trigger = PopoverPrimitive.Trigger
export const Title = PopoverPrimitive.Title
export const Description = PopoverPrimitive.Description

export const Root = (props: PopoverRootProps) => {
  const merge = mergeProps<PopoverRootProps[]>(
    {
      gutter: 4,
      flip: false,
    },
    props,
  )

  return <PopoverPrimitive {...merge} />
}

type popoverContentProps<T extends ValidComponent = 'div'> = ParentProps<
  PopoverContentProps<T> & {
    class?: string
    showClose?: boolean
  }
>

export const Body = <T extends ValidComponent = 'div'>(props: PolymorphicProps<T, popoverContentProps<T>>) => {
  const [local, rest] = splitProps(props as popoverContentProps, ['class', 'children', 'showClose'])

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={cn(
          'data-[expanded]:(animate-in fade-in-0 zoom-in-95) data-[closed]:(animate-out fade-out-0 zoom-out-95) z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          local.class,
        )}
        {...rest}
      >
        {local.children}
        {local.showClose && (
          <PopoverPrimitive.CloseButton class="focus:(outline-none absolute top-4 right-4 rounded-sm bg-inherit opacity-70 ring-1.5 ring-ring ring-offset-2) ring-offset-background transition-opacity transition-property-[opacity,box-shadow] hover:opacity-100 disabled:pointer-events-none">
            <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18 6L6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
              <title>Close</title>
            </svg>
          </PopoverPrimitive.CloseButton>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
