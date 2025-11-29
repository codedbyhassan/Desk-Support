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
  success: string;
}

interface ThemeSettings {
  fontSize: number;        // Base font size in px (14-20)
  borderRadius: number;    // Border radius in px (4-16)
  componentSpacing: 'compact' | 'default' | 'comfortable';
  buttonStyle: 'default' | 'outline' | 'ghost';
  highContrast: boolean;   // For accessibility
  reduceMotion: boolean;   // For accessibility
}

interface ContrastCheckResult {
  isCompliant: boolean;
  ratio: number;
  level: 'FAIL' | 'AA' | 'AAA';
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
  // NEW: Enterprise features
  validateTheme: () => string[]; // Returns list of validation errors
  checkContrast: (fg: string, bg: string) => ContrastCheckResult;
  isAccessibleTheme: () => boolean;
}

/* PROFESSIONAL DEFAULT PALETTE */
const defaultCustomTheme: CustomTheme = {
  primary: '#f53c3c',      // Professional red
  secondary: '#a1a09f',    // Gray
  accent: '#00a8ff',       // Bright blue
  background: '#ffffff',   // White
  foreground: '#292524',   // Dark text
  muted: '#f5f5f4',        // Light gray
  border: '#e7e5e4',       // Light border
  destructive: '#f53c3c',  // Red
  warning: '#f59e0b',      // Amber
  success: '#15803d',      // Green
};

const defaultThemeSettings: ThemeSettings = {
  fontSize: 16,
  borderRadius: 12,
  componentSpacing: 'default',
  buttonStyle: 'default',
  highContrast: false,
  reduceMotion: false,
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

/* ========================================
   ACCESSIBILITY & VALIDATION UTILITIES
   ======================================== */

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance (WCAG standard)
 */
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio (WCAG standard)
 * @returns number between 1 and 21
 */
function getContrastRatio(fg: string, bg: string): number {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  if (!fgRgb || !bgRgb) return 0;

  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG contrast compliance
 */
function checkContrast(fg: string, bg: string): ContrastCheckResult {
  const ratio = getContrastRatio(fg, bg);

  if (ratio >= 7) {
    return { isCompliant: true, ratio: Math.round(ratio * 100) / 100, level: 'AAA' };
  } else if (ratio >= 4.5) {
    return { isCompliant: true, ratio: Math.round(ratio * 100) / 100, level: 'AA' };
  } else {
    return { isCompliant: false, ratio: Math.round(ratio * 100) / 100, level: 'FAIL' };
  }
}

/**
 * Validate theme for accessibility
 */
function validateTheme(customTheme: CustomTheme): string[] {
  const errors: string[] = [];
  const lightBg = '#ffffff';
  const darkBg = '#0a0a0d';

  // Check text on light background
  const lightContrast = checkContrast(customTheme.foreground, lightBg);
  if (!lightContrast.isCompliant) {
    errors.push(
      `❌ Foreground/Light BG contrast (${lightContrast.ratio}:1) fails WCAG AA (4.5:1 required)`
    );
  }

  // Check text on dark background
  const darkContrast = checkContrast('#eaeaf0', darkBg);
  if (!darkContrast.isCompliant) {
    errors.push(
      `❌ Light text/Dark BG contrast (${darkContrast.ratio}:1) fails WCAG AA (4.5:1 required)`
    );
  }

  // Check primary button contrast
  const primaryContrast = checkContrast('#ffffff', customTheme.primary);
  if (!primaryContrast.isCompliant) {
    errors.push(
      `❌ Primary button contrast (${primaryContrast.ratio}:1) fails WCAG AA (4.5:1 required)`
    );
  }

  // Check destructive button contrast
  const destructiveContrast = checkContrast('#ffffff', customTheme.destructive);
  if (!destructiveContrast.isCompliant) {
    errors.push(
      `❌ Destructive button contrast (${destructiveContrast.ratio}:1) fails WCAG AA (4.5:1 required)`
    );
  }

  return errors;
}

/* ========================================
   THEME PROVIDER
   ======================================== */

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
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Apply high contrast if enabled
    if (themeSettings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Apply reduced motion if enabled or user prefers
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (themeSettings.reduceMotion || prefersReducedMotion) {
      root.style.setProperty("--transition-fast", "0.01ms");
      root.style.setProperty("--transition-normal", "0.01ms");
      root.style.setProperty("--transition-slow", "0.01ms");
    } else {
      root.style.setProperty("--transition-fast", "100ms");
      root.style.setProperty("--transition-normal", "150ms");
      root.style.setProperty("--transition-slow", "200ms");
    }

    localStorage.setItem("theme", theme);
  }, [theme, themeSettings.highContrast, themeSettings.reduceMotion]);

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

    // Font size (14-20px)
    const fontSize = Math.max(14, Math.min(20, themeSettings.fontSize));
    root.style.setProperty("--font-size-base", `${fontSize}px`);

    // Border radius (4-16px)
    const radius = Math.max(4, Math.min(16, themeSettings.borderRadius));
    root.style.setProperty("--radius", `${radius}px`);

    // Spacing
    const spacingMultiplier = {
      compact: 0.75,
      default: 1,
      comfortable: 1.25,
    }[themeSettings.componentSpacing];
    root.style.setProperty("--space-multiplier", String(spacingMultiplier));

    localStorage.setItem("themeSettings", JSON.stringify(themeSettings));
  }, [themeSettings]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const updateCustomTheme = (newTheme: Partial<CustomTheme>) => {
    setCustomTheme((prev) => {
      const updated = { ...prev, ...newTheme };
      // Validate on update
      const errors = validateTheme(updated);
      if (errors.length > 0) {
        console.warn("⚠️ Theme accessibility warnings:", errors);
      }
      return updated;
    });
  };

  const updateThemeSettings = (newSettings: Partial<ThemeSettings>) => {
    setThemeSettings((prev) => ({
      ...prev,
      ...newSettings,
      fontSize: Math.max(14, Math.min(20, newSettings.fontSize ?? prev.fontSize)),
      borderRadius: Math.max(4, Math.min(16, newSettings.borderRadius ?? prev.borderRadius)),
    }));
  };

  const resetTheme = () => {
    setCustomTheme(defaultCustomTheme);
    setThemeSettings(defaultThemeSettings);
    setThemeState("light");
  };

  const exportTheme = () => {
    const themeData = {
      version: "1.0",
      colors: customTheme,
      settings: themeSettings,
      mode: theme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `desk-support-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (themeData: string) => {
    try {
      const parsed = JSON.parse(themeData);
      if (parsed.colors) updateCustomTheme(parsed.colors);
      if (parsed.settings) updateThemeSettings(parsed.settings);
      if (parsed.mode) setThemeState(parsed.mode);
    } catch (error) {
      console.error("❌ Failed to import theme:", error);
    }
  };

  const contextValue: ThemeContextType = {
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
    validateTheme: () => validateTheme(customTheme),
    checkContrast,
    isAccessibleTheme: () => validateTheme(customTheme).length === 0,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}