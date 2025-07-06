import { cn } from '@/lib/utils'
import type React from 'react'

interface StackProps {
  children?: React.ReactNode
  gap?: number | string
  className?: string
  direction?: 'row' | 'col' | 'row-reverse' | 'column-reverse'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
}

type HVStackProps = Omit<StackProps, 'direction'>

export const Stack = (props: StackProps) => {
  return (
    <div
      className={cn(
        'flex',
        props.direction ? `flex-${props.direction}` : 'flex-col',
        props.align && `items-${props.align}`,
        props.justify && `justify-${props.justify}`,
        props.gap && `gap-${props.gap}`,
        props.className,
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
  const { className, ...rest } = props
  return <Stack {...rest} direction="col" className={className} />
}
