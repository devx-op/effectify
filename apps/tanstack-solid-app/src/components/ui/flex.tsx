import type { JSX } from 'solid-js'
import { cn } from '@/libs/cn'

interface FlexProps {
  children?: JSX.Element
  direction?: 'row' | 'col' | 'row-reverse' | 'column-reverse'
  wrap?: boolean
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  basis?: string | number
  grow?: boolean | number
  shrink?: boolean | number
  class?: string
  gap?: number | string
}

export const Flex = (props: FlexProps) => {
  return (
    <div
      class={cn(
        'flex',
        props.direction && `flex-${props.direction}`,
        props.wrap && 'flex-wrap',
        props.align && `items-${props.align}`,
        props.justify && `justify-${props.justify}`,
        props.basis && `basis-${props.basis}`,
        props.grow && (typeof props.grow === 'boolean' ? 'grow' : `grow-${props.grow}`),
        props.shrink && (typeof props.shrink === 'boolean' ? 'shrink' : `shrink-${props.shrink}`),
        props.gap && `gap-${props.gap}`,
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
