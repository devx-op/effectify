import { cn } from '@/utils/cn'
import type { JSX } from 'solid-js'

type Placement =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'left-start'
  | 'left'
  | 'left-end'
  | 'right-start'
  | 'right'
  | 'right-end'

interface FloatProps {
  children?: JSX.Element
  placement: Placement
  offset?: string | number
  offsetX?: string | number
  offsetY?: string | number
  class?: string
}

export const Float = (props: FloatProps) => {
  const getPositionClasses = () => {
    const positions: Record<Placement, string> = {
      'top-start': 'top-0 left-0',
      top: 'top-0 left-1/2 -translate-x-1/2',
      'top-end': 'top-0 right-0',
      'bottom-start': 'bottom-0 left-0',
      bottom: 'bottom-0 left-1/2 -translate-x-1/2',
      'bottom-end': 'bottom-0 right-0',
      'left-start': 'left-0 top-0',
      left: 'left-0 top-1/2 -translate-y-1/2',
      'left-end': 'left-0 bottom-0',
      'right-start': 'right-0 top-0',
      right: 'right-0 top-1/2 -translate-y-1/2',
      'right-end': 'right-0 bottom-0',
    }
    return positions[props.placement]
  }

  return (
    <div
      class={cn(
        'absolute',
        getPositionClasses(),
        props.offset && `m-[${props.offset}]`,
        props.offsetX && `mx-[${props.offsetX}]`,
        props.offsetY && `my-[${props.offsetY}]`,
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
