import { type ConfigColorMode, type MaybeConfigColorMode, useColorMode } from '@kobalte/core/color-mode'
import { type JSX, Match, Switch, createSignal, onMount } from 'solid-js'

import { DesktopIcon } from '@effectify/solid-ui/components/icons'
import { Button } from '@effectify/solid-ui/components/primitives/button'
import { MoonIcon, SunIcon } from 'lucide-solid'

interface ThemeOption {
  value: ConfigColorMode
  label: string
  icon: (clazz: string) => JSX.Element
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (clazz: string) => <SunIcon class={clazz} />,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (clazz: string) => <MoonIcon class={clazz} />,
  },
  {
    value: 'system',
    label: 'System',
    icon: (clazz: string) => <DesktopIcon class={clazz} />,
  },
]

function parseCookie(): MaybeConfigColorMode {
  const match = document.cookie.match(/(^| )kb-color-mode=([^;]+)/)
  return match?.[2] as MaybeConfigColorMode
}

export function ThemeSelector() {
  const { colorMode, setColorMode } = useColorMode()
  const [_, setSelectedTheme] = createSignal<ThemeOption>()

  onMount(() => {
    setSelectedTheme(THEME_OPTIONS.find((option) => option.value === parseCookie()))
  })

  const handleClick = () => {
    setColorMode(colorMode() === 'light' ? 'dark' : 'light')
  }

  return (
    <Button onClick={handleClick} variant="ghost" size={'sm'}>
      <Switch fallback={<SunIcon />}>
        <Match when={colorMode() === 'dark'}>
          <SunIcon class="h-4" />
        </Match>
        <Match when={colorMode() === 'light'}>
          <MoonIcon class="h-4" />
        </Match>
      </Switch>
    </Button>
  )
}
