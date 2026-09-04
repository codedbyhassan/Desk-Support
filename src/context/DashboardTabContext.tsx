import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface DashboardTabContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const DashboardTabContext = createContext<DashboardTabContextValue | undefined>(undefined)

export function DashboardTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState('overview')
  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab])
  return <DashboardTabContext.Provider value={value}>{children}</DashboardTabContext.Provider>
}

export function useDashboardTab() {
  const value = useContext(DashboardTabContext)
  if (!value) throw new Error('useDashboardTab must be used within DashboardTabProvider')
  return value
}
