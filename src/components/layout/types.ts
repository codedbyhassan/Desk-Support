import { ReactNode } from 'react'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  badge?: string
  description?: string
  id: string
  adminOnly?: boolean
  adminOrHR?: boolean
}

export interface NavLinksProps {
  items: NavItem[]
  pathname: string
}
