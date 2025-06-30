import { HStack } from '@/components/primitives/stack'
import { ChevronRight } from 'lucide-solid'

export const Breadcrumbs = () => {
  // const { pathname } = useLocation()
  const crumbs = ''
    .split('/')
    .filter(Boolean)
    .filter((path) => !['docs', 'react', 'vue', 'solid', 'usage', 'types'].includes(path))
    .map((path) => path.replace(/-/g, ' '))
    .map((item) => item.charAt(0).toUpperCase() + item.substring(1))

  return (
    <HStack gap="1">
      {crumbs?.map((crumb, index, arr) => (
        <>
          <span class="text-sm text-primary font-medium capitalize">{crumb}</span>
          {arr.length - 1 !== index && (
            <div class="color-bluegray">
              <ChevronRight size="16" />
            </div>
          )}
        </>
      ))}
    </HStack>
  )
}
