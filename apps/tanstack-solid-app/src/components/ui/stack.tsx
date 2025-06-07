import { cn } from '@/libs/cn'
import type { JSX } from 'solid-js'

interface StackProps {
  children?: JSX.Element
  gap?: number | string
  class?: string
  direction?: 'row' | 'col' | 'row-reverse' | 'column-reverse'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
}

type HVStackProps = Omit<StackProps, 'direction'>

export const Stack = (props: StackProps) => {
  return (
    <div
      class={cn(
        'flex',
        props.direction ? `flex-${props.direction}` : 'flex-col',
        props.align && `items-${props.align}`,
        props.justify && `justify-${props.justify}`,
        props.gap && `gap-${props.gap}`,
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}

export const HStack = (props: HVStackProps) => {
  return <Stack {...props} direction="row" />
}

export const VStack = (props: HVStackProps) => {
  const { class: className, ...rest } = props
  return <Stack {...rest} direction="col" class={className} />
}
