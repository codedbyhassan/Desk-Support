/**
 * ============================================================================
 * COLOR SCHEME CONTEXT
 * ============================================================================
 * 
 * Manages color schemes (premium 4-way system) separately from themes.
 * Color schemes override theme colors via CSS custom properties.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ColorScheme, applyColorScheme, getColorSchemeFromStorage, saveColorScheme } from '@/lib/colorSchemes';

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

interface ColorSchemeProviderProps {
  children: ReactNode;
}

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    return getColorSchemeFromStorage();
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply color scheme on mount and when it changes
  useEffect(() => {
    applyColorScheme(colorScheme);
    saveColorScheme(colorScheme);
    setIsInitialized(true);

    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('colorSchemeChanged', { detail: { scheme: colorScheme } }));
  }, [colorScheme]);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  // Prevent flash of unstyled content
  if (!isInitialized) {
    return <>{children}</>;
  }

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

/**
 * Hook to access color scheme context
 */
export function useColorScheme(): ColorSchemeContextType {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
}

