import { cn } from '@effectify/solid-ui/lib/utils'
import { SettingsIcon } from 'lucide-solid'

export function Spinner({ className }: Readonly<{ className?: string }>) {
  return (
    <div class={cn('inline-block animate-spin duration-500', className)}>
      <SettingsIcon />
    </div>
  )
}
