import { cn } from '@effectify/solid-ui/lib/utils'
import type { JSX } from 'solid-js'

interface GridProps {
  children?: JSX.Element
  columns?: number
  gap?: string | number
  columnGap?: string | number
  rowGap?: string | number
  minChildWidth?: string | number
  class?: string
}

export const Grid = (props: GridProps) => {
  return (
    <div
      class={cn(
        'grid',
        props.columns && `grid-cols-${props.columns}`,
        props.minChildWidth && `grid-cols-[repeat(auto-fit,minmax(${props.minChildWidth}px,1fr))]`,
        props.gap && `gap-${props.gap}`,
        props.columnGap && `gap-x-${props.columnGap}`,
        props.rowGap && `gap-y-${props.rowGap}`,
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}

interface GridItemProps {
  children?: JSX.Element
  colSpan?: number
  rowSpan?: number
  colStart?: number
  colEnd?: number
  rowStart?: number
  rowEnd?: number
  class?: string
}

export const GridItem = (props: GridItemProps) => {
  return (
    <div
      class={cn(
        props.colSpan && `col-span-${props.colSpan}`,
        props.rowSpan && `row-span-${props.rowSpan}`,
        props.colStart && `col-start-${props.colStart}`,
        props.colEnd && `col-end-${props.colEnd}`,
        props.rowStart && `row-start-${props.rowStart}`,
        props.rowEnd && `row-end-${props.rowEnd}`,
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
