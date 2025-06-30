import type { ComponentProps, ParentComponent } from 'solid-js'

import { cn } from '@/utils/cn'
import { splitProps } from 'solid-js'

export const Root = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class'])

  return <div class={cn('rounded-xl border bg-card text-card-foreground shadow', local.class)} {...rest} />
}

export const Header = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class'])

  return <div class={cn('flex flex-col space-y-1.5 p-6', local.class)} {...rest} />
}

export const Title: ParentComponent<ComponentProps<'h1'>> = (props) => {
  const [local, rest] = splitProps(props, ['class'])

  return <h1 class={cn('font-semibold leading-none tracking-tight', local.class)} {...rest} />
}

export const Description: ParentComponent<ComponentProps<'h3'>> = (props) => {
  const [local, rest] = splitProps(props, ['class'])

  return <h3 class={cn('text-sm text-muted-foreground', local.class)} {...rest} />
}

export const Body = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class'])

  return <div class={cn('p-6 pt-0', local.class)} {...rest} />
}

export const Footer = (props: ComponentProps<'div'>) => {
  const [local, rest] = splitProps(props, ['class'])

  return <div class={cn('flex items-center p-6 pt-0', local.class)} {...rest} />
}
