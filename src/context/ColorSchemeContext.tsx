import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ColorScheme, applyColorScheme, getColorSchemeFromStorage, saveColorScheme } from '@/lib/colorSchemes'

interface ColorSchemeContextType { colorScheme: ColorScheme; setColorScheme: (scheme: ColorScheme) => void }
const ColorSchemeContext=createContext<ColorSchemeContextType|undefined>(undefined)

export function ColorSchemeProvider({children}:{children:ReactNode}){
 const [colorScheme,setColorScheme]=useState<ColorScheme>(()=>getColorSchemeFromStorage())
 useEffect(()=>{applyColorScheme(colorScheme);saveColorScheme(colorScheme)},[colorScheme])
 return <ColorSchemeContext.Provider value={{colorScheme,setColorScheme}}>{children}</ColorSchemeContext.Provider>
}
export function useColorScheme(){const value=useContext(ColorSchemeContext);if(!value)throw new Error('useColorScheme must be used within ColorSchemeProvider');return value}
