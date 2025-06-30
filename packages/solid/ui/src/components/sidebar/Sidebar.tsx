export type Pages = {
  id: string
  category: string
  title?: string
  status?: string
  slug?: string
}

export interface Props {
  groups?: Pages[][]
}

export const Sidebar = (props: Props) => {
  return (
    <nav>
      <ul>sidebar list</ul>
    </nav>
  )
}
