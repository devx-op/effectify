import { Button } from '@effectify/solid-ui/components/primitives/button'
import { createSignal } from 'solid-js'

export default function Counter() {
  const [count, setCount] = createSignal(0)
  return <Button onClick={() => setCount(count() + 1)}>Clicks: {count()}</Button>
}
