import type { PopoverContentProps, PopoverRootProps } from '@kobalte/core/popover'
import type { ParentProps, ValidComponent } from 'solid-js'
import { mergeProps, splitProps } from 'solid-js'

import { cn } from '@/utils/cn'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import { Popover as PopoverPrimitive } from '@kobalte/core/popover'

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
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[expanded]:(animate-in fade-in-0 zoom-in-95) data-[closed]:(animate-out fade-out-0 zoom-out-95)',
          local.class,
        )}
        {...rest}
      >
        {local.children}
        {local.showClose && (
          <PopoverPrimitive.CloseButton class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:(outline-none ring-1.5 ring-ring ring-offset-2) disabled:pointer-events-none bg-inherit transition-property-[opacity,box-shadow]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 6L6 18M6 6l12 12"
              />
              <title>Close</title>
            </svg>
          </PopoverPrimitive.CloseButton>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
