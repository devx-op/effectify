import type { ContentProps, DescriptionProps, DynamicProps, LabelProps } from "@corvu/drawer"
import DrawerPrimitive from "@corvu/drawer"
import { cn } from "@effectify/solid-ui/lib/utils"
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js"
import { splitProps } from "solid-js"

export const Root = DrawerPrimitive
export const Trigger = DrawerPrimitive.Trigger
export const Close = DrawerPrimitive.Close

type drawerContentProps<T extends ValidComponent = "div"> = ParentProps<
  ContentProps<T> & {
    class?: string
  }
>

export const Body = <T extends ValidComponent = "div">(props: DynamicProps<T, drawerContentProps<T>>) => {
  const [local, rest] = splitProps(props as drawerContentProps, ["class", "children"])
  const ctx = DrawerPrimitive.useContext()

  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay
        class="fixed inset-0 z-50 data-[transitioning]:transition-colors data-[transitioning]:duration-200"
        style={{
          "background-color": `hsl(var(--background) / ${0.8 * ctx.openPercentage()})`,
        }}
      />
      <DrawerPrimitive.Content
        class={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-xl border bg-background after:absolute after:inset-x-0 after:top-full after:h-[50%] after:bg-inherit data-[transitioning]:transition-transform data-[transitioning]:duration-200 md:select-none",
          local.class,
        )}
        {...rest}
      >
        <div class="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        {local.children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  )
}

export const Header = (props: ComponentProps<"div">) => {
  const [local, rest] = splitProps(props, ["class"])

  return <div class={cn("grid gap-1.5 p-4 text-center sm:text-left", local.class)} {...rest} />
}

export const Footer = (props: ComponentProps<"div">) => {
  const [local, rest] = splitProps(props, ["class"])

  return <div class={cn("mt-auto flex flex-col gap-2 p-4", local.class)} {...rest} />
}

type DrawerLabelProps = LabelProps & {
  class?: string
}

export const Label = <T extends ValidComponent = "h2">(props: DynamicProps<T, DrawerLabelProps>) => {
  const [local, rest] = splitProps(props as DrawerLabelProps, ["class"])

  return (
    <DrawerPrimitive.Label class={cn("font-semibold text-lg leading-none tracking-tight", local.class)} {...rest} />
  )
}

type DrawerDescriptionProps = DescriptionProps & {
  class?: string
}

export const Description = <T extends ValidComponent = "p">(props: DynamicProps<T, DrawerDescriptionProps>) => {
  const [local, rest] = splitProps(props as DrawerDescriptionProps, ["class"])

  return <DrawerPrimitive.Description class={cn("text-muted-foreground text-sm", local.class)} {...rest} />
}
