import { cn } from '@/libs/cn'
import { SettingsIcon } from 'lucide-solid'

export function Spinner({ className }: Readonly<{ className?: string }>) {
  return (
    <div class={cn('inline-block animate-spin duration-500', className)}>
      <SettingsIcon />
    </div>
  )
}
