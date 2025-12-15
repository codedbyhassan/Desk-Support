/**
 * ============================================================================
 * CENTRALIZED DESIGN SYSTEM
 * ============================================================================
 * 
 * This file contains ALL design tokens, colors, spacing, typography, and styling
 * constants for the entire application. Components should import from here
 * instead of using hardcoded values.
 * 
 * Structure:
 * - Colors: All color definitions (use CSS variables)
 * - Spacing: All spacing values
 * - Typography: Font sizes, weights, line heights
 * - Sizing: Component sizes, icon sizes, etc.
 * - Borders: Border widths, radius values
 * - Shadows: Shadow definitions
 * - Transitions: Animation timings
 * - Breakpoints: Responsive breakpoints
 * - Z-Index: Layer management
 */

// ============================================================================
// COLOR SYSTEM - Use CSS Variables (defined in index.css)
// ============================================================================

export const colors = {
  // Primary colors - Deep Blue Theme
  primary: {
    base: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
    light: 'hsl(var(--primary-light))',
    dark: 'hsl(var(--primary-dark))',
    hover: 'hsl(var(--primary-hover))',
    // Scale
    '50': 'hsl(var(--primary-50))',
    '100': 'hsl(var(--primary-100))',
    '200': 'hsl(var(--primary-200))',
    '300': 'hsl(var(--primary-300))',
    '400': 'hsl(var(--primary-400))',
    '500': 'hsl(var(--primary-500))',
    '600': 'hsl(var(--primary-600))',
    '700': 'hsl(var(--primary-700))',
    '800': 'hsl(var(--primary-800))',
    '900': 'hsl(var(--primary-900))',
  },

  // Background colors
  background: {
    base: 'hsl(var(--background))',
    card: 'hsl(var(--card))',
    popover: 'hsl(var(--popover))',
    muted: 'hsl(var(--muted))',
  },

  // Text colors
  text: {
    primary: 'hsl(var(--foreground))',
    secondary: 'hsl(var(--muted-foreground))',
    muted: 'hsl(var(--muted-foreground))',
    inverse: 'hsl(var(--primary-foreground))',
    disabled: 'hsl(var(--muted-foreground))',
  },

  // Border colors
  border: {
    base: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
  },

  // Status colors
  status: {
    success: {
      base: 'hsl(var(--success))',
      foreground: 'hsl(var(--success-foreground))',
      light: 'hsl(var(--success-50))',
      dark: 'hsl(var(--success-900))',
    },
    warning: {
      base: 'hsl(var(--warning))',
      foreground: 'hsl(var(--warning-foreground))',
      light: 'hsl(var(--warning-50))',
      dark: 'hsl(var(--warning-900))',
    },
    error: {
      base: 'hsl(var(--destructive))',
      foreground: 'hsl(var(--destructive-foreground))',
      light: 'hsl(var(--error-50))',
      dark: 'hsl(var(--error-900))',
    },
    info: {
      base: 'hsl(var(--info))',
      foreground: 'hsl(var(--info-foreground))',
      light: 'hsl(var(--info-50))',
      dark: 'hsl(var(--info-900))',
    },
  },

  // Sidebar colors
  sidebar: {
    background: 'hsl(var(--sidebar-background))',
    foreground: 'hsl(var(--sidebar-foreground))',
    primary: 'hsl(var(--sidebar-primary))',
    accent: 'hsl(var(--sidebar-accent))',
    border: 'hsl(var(--sidebar-border))',
    ring: 'hsl(var(--sidebar-ring))',
  },

  // Glass effect colors (for glassmorphic design)
  glass: {
    bg: 'var(--glass-bg)',
    border: 'var(--glass-border)',
    shadow: 'var(--glass-shadow)',
    backdrop: 'var(--glass-backdrop)',
  },
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  // Padding
  padding: {
    xs: '0.375rem',    // 6px
    sm: '0.5rem',      // 8px
    md: '0.75rem',     // 12px
    lg: '1rem',        // 16px
    xl: '1.5rem',      // 24px
    '2xl': '2rem',     // 32px
    '3xl': '3rem',     // 48px
  },

  // Margin
  margin: {
    xs: '0.375rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
  },

  // Gap
  gap: {
    xs: '0.375rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
  },
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'var(--font-sans)',
    heading: "'Poppins', var(--font-sans)",
    body: "'Montserrat', var(--font-sans)",
  },

  // Font sizes
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// SIZING SYSTEM
// ============================================================================

export const sizing = {
  // Icon sizes
  icon: {
    xs: '0.875rem',   // 14px
    sm: '1rem',       // 16px
    md: '1.25rem',    // 20px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '2.5rem',  // 40px
  },

  // Button heights
  button: {
    sm: '2rem',       // 32px
    md: '2.25rem',    // 36px
    lg: '2.5rem',     // 40px
  },

  // Avatar sizes
  avatar: {
    sm: '2rem',       // 32px
    md: '2.5rem',     // 40px
    lg: '3rem',       // 48px
    xl: '4rem',       // 64px
  },

  // Container widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// ============================================================================
// BORDER SYSTEM
// ============================================================================

export const borders = {
  // Border widths
  width: {
    none: '0',
    thin: '1px',
    base: '2px',
    thick: '4px',
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    base: '0.375rem', // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
} as const;

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

export const shadows = {
  sm: 'var(--shadow-sm)',
  base: 'var(--shadow)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
  '2xl': 'var(--shadow-2xl)',
} as const;

// ============================================================================
// TRANSITION SYSTEM
// ============================================================================

export const transitions = {
  // Durations
  duration: {
    fast: 'var(--transition-fast)',
    normal: 'var(--transition-normal)',
    slow: 'var(--transition-slow)',
  },

  // Easing functions
  easing: {
    inOut: 'var(--ease-in-out)',
    out: 'var(--ease-out)',
    in: 'var(--ease-in)',
  },

  // Common transitions
  common: {
    colors: 'transition-colors var(--transition-normal) var(--ease-in-out)',
    all: 'transition-all var(--transition-normal) var(--ease-in-out)',
    opacity: 'transition-opacity var(--transition-normal) var(--ease-in-out)',
    transform: 'transition-transform var(--transition-normal) var(--ease-in-out)',
  },
} as const;

// ============================================================================
// Z-INDEX SYSTEM
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// BREAKPOINTS (for JavaScript use)
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// COMPONENT STYLES - Pre-composed class strings
// ============================================================================

export const componentStyles = {
  // Card styles
  card: {
    base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
    glass: 'glass-card rounded-lg border text-card-foreground',
    hover: 'hover:shadow-md transition-shadow',
  },

  // Button styles
  button: {
    base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },

  // Input styles
  input: {
    base: 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  },

  // Badge styles
  badge: {
    base: 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    outline: 'text-foreground',
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get color value from design system
 */
export function getColor(path: string): string {
  const keys = path.split('.');
  let value: any = colors;
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Color path "${path}" not found in design system`);
      return 'transparent';
    }
  }
  return value;
}

/**
 * Get spacing value
 */
export function getSpacing(size: keyof typeof spacing.padding): string {
  return spacing.padding[size];
}

/**
 * Combine class names safely
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorPath = 
  | 'primary.base' | 'primary.foreground' | 'primary.light' | 'primary.dark' | 'primary.hover'
  | 'background.base' | 'background.card' | 'background.popover' | 'background.muted'
  | 'text.primary' | 'text.secondary' | 'text.muted' | 'text.inverse' | 'text.disabled'
  | 'border.base' | 'border.input' | 'border.ring'
  | 'status.success.base' | 'status.warning.base' | 'status.error.base' | 'status.info.base'
  | 'sidebar.background' | 'sidebar.foreground' | 'sidebar.primary' | 'sidebar.accent' | 'sidebar.border';

export type SpacingSize = keyof typeof spacing.padding;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type BorderRadius = keyof typeof borders.radius;

