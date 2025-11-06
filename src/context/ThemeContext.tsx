import * as React from "react";
import { ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface CustomTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  destructive: string;
  warning: string;
}

interface ThemeSettings {
  fontSize: number;
  borderRadius: number;
  componentSpacing: 'compact' | 'default' | 'comfortable';
  buttonStyle: 'default' | 'outline' | 'ghost';
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  customTheme: CustomTheme | null;
  updateCustomTheme: (theme: Partial<CustomTheme>) => void;
  themeSettings: ThemeSettings;
  updateThemeSettings: (settings: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
  exportTheme: () => void;
  importTheme: (themeData: string) => void;
}

const defaultCustomTheme: CustomTheme = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#10b981',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  border: '#e2e8f0',
  destructive: '#ef4444',
  warning: '#f59e0b',
};

const defaultThemeSettings: ThemeSettings = {
  fontSize: 16,
  borderRadius: 8,
  componentSpacing: 'default',
  buttonStyle: 'default',
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) return stored;

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  const [customTheme, setCustomTheme] = React.useState<CustomTheme>(() => {
    const stored = localStorage.getItem("customTheme");
    return stored ? JSON.parse(stored) : defaultCustomTheme;
  });

  const [themeSettings, setThemeSettings] = React.useState<ThemeSettings>(() => {
    const stored = localStorage.getItem("themeSettings");
    return stored ? JSON.parse(stored) : defaultThemeSettings;
  });

  // Apply theme mode to DOM
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Apply custom theme colors to CSS variables
  React.useEffect(() => {
    const root = document.documentElement;
    Object.entries(customTheme).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    localStorage.setItem("customTheme", JSON.stringify(customTheme));
  }, [customTheme]);

  // Apply theme settings to CSS variables
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-size-base', `${themeSettings.fontSize}px`);
    root.style.setProperty('--border-radius', `${themeSettings.borderRadius}px`);
    localStorage.setItem("themeSettings", JSON.stringify(themeSettings));
  }, [themeSettings]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const updateCustomTheme = (newTheme: Partial<CustomTheme>) => {
    setCustomTheme(prev => ({ ...prev, ...newTheme }));
  };

  const updateThemeSettings = (newSettings: Partial<ThemeSettings>) => {
    setThemeSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetTheme = () => {
    setCustomTheme(defaultCustomTheme);
    setThemeSettings(defaultThemeSettings);
    setThemeState('light');
  };

  const exportTheme = () => {
    const themeData = {
      colors: customTheme,
      settings: themeSettings,
      mode: theme,
    };
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (themeData: string) => {
    try {
      const parsed = JSON.parse(themeData);
      if (parsed.colors) setCustomTheme(parsed.colors);
      if (parsed.settings) setThemeSettings(parsed.settings);
      if (parsed.mode) setThemeState(parsed.mode);
    } catch (error) {
      console.error('Failed to import theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme,
      customTheme,
      updateCustomTheme,
      themeSettings,
      updateThemeSettings,
      resetTheme,
      exportTheme,
      importTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}