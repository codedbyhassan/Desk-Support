export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  badge?: string
}

export interface NavLinksProps {
  items: NavItem[]
  pathname: string
}