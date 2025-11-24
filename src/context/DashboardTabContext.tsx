import { createContext, useContext, useState, ReactNode } from 'react'

interface DashboardTabContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const DashboardTabContext = createContext<DashboardTabContextType | undefined>(undefined)

export function DashboardTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <DashboardTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </DashboardTabContext.Provider>
  )
}

export function useDashboardTab() {
  const context = useContext(DashboardTabContext)
  if (context === undefined) {
    throw new Error('useDashboardTab must be used within a DashboardTabProvider')
  }
  return context
}

