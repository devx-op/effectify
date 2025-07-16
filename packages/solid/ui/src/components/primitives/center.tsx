import { cn } from '@effectify/solid-ui/lib/utils'
import type { JSX } from 'solid-js'

interface CenterProps {
  children?: JSX.Element
  inline?: boolean
  class?: string
}

export const Center = (props: CenterProps) => {
  return (
    <div class={cn(props.inline ? 'inline-flex' : 'flex', 'items-center justify-center', props.class)}>
      {props.children}
    </div>
  )
}
