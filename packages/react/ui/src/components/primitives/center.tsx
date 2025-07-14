import { cn } from '@effectify/react-ui/lib/utils'
import type React from 'react'

interface CenterProps {
  children?: React.ReactNode
  inline?: boolean
  class?: string
}

export const Center = (props: CenterProps) => {
  return (
    <div className={cn(props.inline ? 'inline-flex' : 'flex', 'items-center justify-center', props.class)}>
      {props.children}
    </div>
  )
}
