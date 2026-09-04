import { createContext, useContext, useState, type ReactNode } from 'react'

export type DashboardTab = 'overview' | 'tickets' | 'assets' | 'people' | 'activity'
interface DashboardTabContextType { activeTab: DashboardTab; setActiveTab: (tab: DashboardTab) => void }
const DashboardTabContext=createContext<DashboardTabContextType|undefined>(undefined)
export function DashboardTabProvider({children}:{children:ReactNode}){const [activeTab,setActiveTab]=useState<DashboardTab>('overview');return <DashboardTabContext.Provider value={{activeTab,setActiveTab}}>{children}</DashboardTabContext.Provider>}
export function useDashboardTab(){const value=useContext(DashboardTabContext);if(!value)throw new Error('useDashboardTab must be used within DashboardTabProvider');return value}
