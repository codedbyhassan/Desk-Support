/**
 * ============================================================================
 * CENTRALIZED THEME SYSTEM
 * ============================================================================
 * 
 * This file provides theme utilities and references to CSS variables defined
 * in src/index.css. All colors, spacing, and styling should use CSS variables
 * from index.css or import from src/lib/design-system.ts
 * 
 * IMPORTANT: Do NOT hardcode colors here. Use CSS variables instead.
 * 
 * For design tokens, see: src/lib/design-system.ts
 * For CSS variables, see: src/index.css
 */

// ============================================================================
// SEMANTIC COLOR TOKENS (References CSS Variables)
// ============================================================================

export const semanticTokens = {
  // Surface colors - Use CSS variables from index.css
  surface: {
    primary: 'hsl(var(--background))',
    secondary: 'hsl(var(--muted))',
    tertiary: 'hsl(var(--card))',
    interactive: 'hsl(var(--accent))',
    interactive_hover: 'hsl(var(--accent-hover))',
  },

  // Text colors - Use CSS variables from index.css
  text: {
    primary: 'hsl(var(--foreground))',
    secondary: 'hsl(var(--muted-foreground))',
    tertiary: 'hsl(var(--muted-foreground))',
    inverse: 'hsl(var(--primary-foreground))',
    disabled: 'hsl(var(--muted-foreground))',
  },

  // Brand colors - Use CSS variables from index.css
  brand: {
    primary: 'hsl(var(--primary))',
    primary_hover: 'hsl(var(--primary-hover))',
    primary_active: 'hsl(var(--primary-dark))',
  },

  // Semantic status colors - Use CSS variables from index.css
  status: {
    success: 'hsl(var(--success))',
    success_light: 'hsl(var(--success-50))',
    warning: 'hsl(var(--warning))',
    warning_light: 'hsl(var(--warning-50))',
    error: 'hsl(var(--destructive))',
    error_light: 'hsl(var(--error-50))',
    info: 'hsl(var(--info))',
    info_light: 'hsl(var(--info-50))',
  },

  // Border colors - Use CSS variables from index.css
  border: {
    default: 'hsl(var(--border))',
    light: 'hsl(var(--border))',
    strong: 'hsl(var(--border))',
  },

  // Specialized colors - Use CSS variables from index.css
  focus: 'hsl(var(--ring))',
  shadow: 'var(--shadow)',
  overlay: 'var(--color-overlay)',
};

// ============================================================================
// THEME DEFINITIONS (Legacy - Now using CSS variables from index.css)
// ============================================================================
// 
// NOTE: These theme definitions are kept for backward compatibility.
// All new code should use CSS variables directly from index.css.
// 
// To change colors, update CSS variables in src/index.css, not here.
// ============================================================================

export const lightTheme = {
  // These are now defined in index.css as CSS variables
  // Kept here for reference only - use CSS variables instead
  '--color-surface-primary': 'rgb(255, 255, 255)',
  '--color-surface-secondary': 'rgb(248, 250, 252)',
  '--color-surface-tertiary': 'rgb(241, 245, 249)',
  '--color-surface-interactive': 'rgb(229, 231, 235)',
  '--color-surface-interactive-hover': 'rgb(209, 213, 219)',

  '--color-text-primary': 'rgb(15, 23, 42)',
  '--color-text-secondary': 'rgb(71, 85, 105)',
  '--color-text-tertiary': 'rgb(148, 163, 184)',
  '--color-text-inverse': 'rgb(255, 255, 255)',
  '--color-text-disabled': 'rgb(203, 213, 225)',

  '--color-brand-primary': 'rgb(37, 99, 235)',
  '--color-brand-primary-hover': 'rgb(29, 78, 216)',
  '--color-brand-primary-active': 'rgb(23, 37, 84)',

  '--color-status-success': 'rgb(5, 150, 105)',
  '--color-status-success-light': 'rgb(236, 253, 245)',
  '--color-status-warning': 'rgb(202, 138, 4)',
  '--color-status-warning-light': 'rgb(254, 252, 232)',
  '--color-status-error': 'rgb(220, 38, 38)',
  '--color-status-error-light': 'rgb(254, 242, 242)',
  '--color-status-info': 'rgb(37, 99, 235)',
  '--color-status-info-light': 'rgb(239, 246, 255)',

  '--color-border-default': 'rgb(226, 232, 240)',
  '--color-border-light': 'rgb(241, 245, 249)',
  '--color-border-strong': 'rgb(148, 163, 184)',

  '--color-focus': 'rgb(37, 99, 235)',
  '--color-shadow': 'rgba(0, 0, 0, 0.1)',
  '--color-overlay': 'rgba(0, 0, 0, 0.5)',
};

// ============================================================================
// DARK THEME DEFINITIONS - PREMIUM REDESIGNED
// ============================================================================

export const darkTheme = {
  // Surface colors - Premium dark gradient palette
  '--color-surface-primary': 'rgb(13, 17, 28)',      // Deep navy base
  '--color-surface-secondary': 'rgb(21, 26, 42)',    // Rich dark slate
  '--color-surface-tertiary': 'rgb(31, 37, 56)',     // Elevated dark slate
  '--color-surface-interactive': 'rgb(45, 51, 73)',  // Interactive hover base
  '--color-surface-interactive-hover': 'rgb(56, 63, 88)', // Interactive hover

  // Text colors - Premium readable palette
  '--color-text-primary': 'rgb(243, 244, 246)',      // Almost white (not harsh)
  '--color-text-secondary': 'rgb(209, 213, 219)',    // Light gray
  '--color-text-tertiary': 'rgb(156, 163, 175)',     // Medium gray
  '--color-text-inverse': 'rgb(13, 17, 28)',         // Dark inverse
  '--color-text-disabled': 'rgb(107, 114, 128)',     // Disabled state

  // Brand colors - Vibrant in dark mode
  '--color-brand-primary': 'rgb(96, 165, 250)',      // Bright sky blue
  '--color-brand-primary-hover': 'rgb(147, 197, 253)', // Lighter blue on hover
  '--color-brand-primary-active': 'rgb(59, 130, 246)', // Darker blue on active

  // Status colors - High contrast in dark mode
  '--color-status-success': 'rgb(34, 197, 94)',      // Vibrant green
  '--color-status-success-light': 'rgb(20, 83, 45)',  // Deep green tint
  '--color-status-warning': 'rgb(250, 204, 21)',     // Bright yellow
  '--color-status-warning-light': 'rgb(78, 65, 20)', // Deep yellow tint
  '--color-status-error': 'rgb(248, 113, 113)',      // Bright red
  '--color-status-error-light': 'rgb(127, 29, 29)',  // Deep red tint
  '--color-status-info': 'rgb(96, 165, 250)',        // Sky blue (same as brand)
  '--color-status-info-light': 'rgb(30, 58, 138)',   // Deep blue tint

  // Border colors - Subtle but visible
  '--color-border-default': 'rgb(55, 65, 81)',       // Medium border
  '--color-border-light': 'rgb(45, 51, 73)',         // Light border
  '--color-border-strong': 'rgb(75, 85, 99)',        // Strong border

  // Specialized colors
  '--color-focus': 'rgb(96, 165, 250)',              // Bright blue focus ring
  '--color-shadow': 'rgba(0, 0, 0, 0.5)',            // Deeper shadows
  '--color-overlay': 'rgba(0, 0, 0, 0.8)',           // Strong overlay
};

// ============================================================================
// LEGACY COLOR PALETTE (for backward compatibility during migration)
// ============================================================================

export const colors = {
  // Primary colors
  primary: {
    main: 'bg-blue-500',
    light: 'bg-blue-50',
    lighter: 'bg-blue-100',
    medium: 'bg-blue-500',
    dark: 'bg-blue-600',
    darker: 'bg-blue-700',
    darkest: 'bg-blue-900',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    textLight: 'text-blue-500',
    border: 'border-blue-500',
    borderLight: 'border-blue-200',
  },

  // Success/Emerald colors
  success: {
    main: 'bg-emerald-500',
    light: 'bg-emerald-50',
    lighter: 'bg-emerald-100',
    medium: 'bg-emerald-500',
    dark: 'bg-emerald-600',
    darker: 'bg-emerald-700',
    text: 'text-emerald-600',
    textDark: 'text-emerald-700',
    border: 'border-emerald-500',
    borderLight: 'border-emerald-200',
  },

  // Green colors (alternative success)
  green: {
    light: 'bg-green-50',
    lighter: 'bg-green-100',
    medium: 'bg-green-500',
    dark: 'bg-green-600',
    darker: 'bg-green-700',
    text: 'text-green-600',
    textDark: 'text-green-700',
    border: 'border-green-500',
    borderLight: 'border-green-200',
  },

  // Warning/Amber colors
  warning: {
    main: 'bg-amber-500',
    light: 'bg-amber-50',
    lighter: 'bg-amber-100',
    medium: 'bg-amber-500',
    dark: 'bg-amber-600',
    darker: 'bg-amber-700',
    text: 'text-amber-600',
    textDark: 'text-amber-700',
    textLight: 'text-amber-500',
    border: 'border-amber-500',
    borderLight: 'border-amber-200',
  },

  // Danger/Red colors
  danger: {
    main: 'bg-red-500',
    light: 'bg-red-50',
    lighter: 'bg-red-100',
    medium: 'bg-red-500',
    dark: 'bg-red-600',
    darker: 'bg-red-700',
    text: 'text-red-600',
    textDark: 'text-red-700',
    textLight: 'text-red-500',
    border: 'border-red-500',
    borderLight: 'border-red-200',
  },

  // Neutral/Gray colors
  neutral: {
    main: 'bg-gray-500',
    light: 'bg-gray-50',
    lighter: 'bg-gray-100',
    lightish: 'bg-gray-200',
    medium: 'bg-gray-500',
    dark: 'bg-gray-600',
    darker: 'bg-gray-700',
    darkest: 'bg-gray-900',
    text: 'text-gray-600',
    textLight: 'text-gray-500',
    textLighter: 'text-gray-400',
    textDark: 'text-gray-900',
    border: 'border-gray-500',
    borderLight: 'border-gray-200',
  },

  // Purple colors
  purple: {
    main: 'bg-purple-500',
    light: 'bg-purple-50',
    lighter: 'bg-purple-100',
    medium: 'bg-purple-500',
    dark: 'bg-purple-600',
    darker: 'bg-purple-700',
    text: 'text-purple-600',
    textDark: 'text-purple-700',
    border: 'border-purple-500',
    borderLight: 'border-purple-200',
  },

  // Orange colors
  orange: {
    light: 'bg-orange-50',
    lighter: 'bg-orange-100',
    medium: 'bg-orange-500',
    dark: 'bg-orange-600',
    darker: 'bg-orange-700',
    text: 'text-orange-600',
    textDark: 'text-orange-700',
    border: 'border-orange-500',
    borderLight: 'border-orange-200',
  },

  // Slate colors
  slate: {
    light: 'bg-slate-50',
    lighter: 'bg-slate-100',
    medium: 'bg-slate-500',
    dark: 'bg-slate-600',
    darker: 'bg-slate-700',
    darkest: 'bg-slate-900',
    text: 'text-slate-600',
    textLight: 'text-slate-500',
    textLighter: 'text-slate-400',
    textDark: 'text-slate-900',
    border: 'border-slate-500',
    borderLight: 'border-slate-200',
  },
};

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
  // Ticket status gradients
  status: {
    open: 'from-red-600 via-red-500 to-red-400',
    in_progress: 'from-amber-600 via-amber-500 to-amber-400',
    resolved: 'from-emerald-600 via-emerald-500 to-emerald-400',
    closed: 'from-slate-600 via-slate-500 to-slate-400',
  },

  // Priority gradients
  priority: {
    high: 'from-red-600 to-red-500',
    medium: 'from-amber-600 to-amber-500',
    low: 'from-emerald-600 to-emerald-500',
  },

  // General purpose gradients
  primary: 'from-blue-600 to-blue-500',
  success: 'from-emerald-600 to-emerald-500',
  warning: 'from-amber-600 to-amber-500',
  danger: 'from-red-600 to-red-500',
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: 'p-1.5',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
  xl: 'p-6',
  '2xl': 'p-8',
  
  gapXs: 'gap-1.5',
  gapSm: 'gap-2',
  gapMd: 'gap-3',
  gapLg: 'gap-4',
  gapXl: 'gap-6',

  cardPadding: 'p-4 sm:p-6 lg:p-8',
  cardGap: 'gap-4 md:gap-6 lg:gap-8',
};

// ============================================================================
// SIZING
// ============================================================================

export const sizing = {
  // Icon sizes
  iconXs: 'h-3.5 w-3.5',
  iconSm: 'h-4 w-4',
  iconMd: 'h-5 w-5',
  iconLg: 'h-6 w-6',
  iconXl: 'h-8 w-8',
  icon2xl: 'h-10 w-10',
  icon3xl: 'h-12 w-12',

  // Common sizes
  buttonHeight: 'h-9',
  buttonHeightSm: 'h-8',
  buttonHeightLg: 'h-10',

  // Avatar sizes
  avatarSm: 'h-8 w-8',
  avatarMd: 'h-10 w-10',
  avatarLg: 'h-12 w-12',
};

// ============================================================================
// RADIUS
// ============================================================================

export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  base: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Sizes
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',

  // Weights
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',

  // Line clamps
  line1: 'line-clamp-1',
  line2: 'line-clamp-2',
  line3: 'line-clamp-3',
  line4: 'line-clamp-4',
};

// ============================================================================
// COMPONENT STYLES
// ============================================================================

export const components = {
  // Card styles - Premium dark mode support
  card: {
    base: 'rounded-lg border bg-white shadow-sm dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:shadow-xl dark:shadow-black/40',
    dark: 'dark:bg-slate-900/80 dark:border-slate-800/50 dark:backdrop-blur-sm',
    hover: 'hover:shadow-md dark:hover:shadow-2xl dark:hover:shadow-black/50 transition-all duration-200',
    glass: 'backdrop-blur-sm bg-white/50 dark:bg-slate-800/40 border-white/20 dark:border-slate-700/30 dark:backdrop-blur-lg',
    interactive: 'hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
  },

  // Button styles - Enhanced dark mode
  button: {
    base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white dark:shadow-lg dark:shadow-blue-500/20',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700/50 dark:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800/40',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:shadow-lg dark:shadow-red-500/20',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:shadow-lg dark:shadow-emerald-500/20',
  },

  // Badge styles - Premium dark mode
  badge: {
    default: 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
    primary: 'border-transparent bg-blue-500 text-white dark:bg-blue-600/40 dark:text-blue-200 dark:border-blue-500/30',
    success: 'border-transparent bg-emerald-500 text-white dark:bg-emerald-600/40 dark:text-emerald-200 dark:border-emerald-500/30',
    warning: 'border-transparent bg-amber-500 text-white dark:bg-amber-600/40 dark:text-amber-200 dark:border-amber-500/30',
    danger: 'border-transparent bg-red-500 text-white dark:bg-red-600/40 dark:text-red-200 dark:border-red-500/30',
    outline: 'text-slate-900 border-slate-200 dark:text-slate-100 dark:border-slate-700/50',
  },

  // Input styles - Enhanced dark mode
  input: {
    base: 'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm placeholder-slate-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder-slate-500 dark:focus-visible:ring-blue-400 dark:focus-visible:bg-slate-800',
    dark: 'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
    invalid: 'border-red-500 dark:border-red-500/50 focus-visible:ring-red-500 dark:focus-visible:ring-red-400',
  },

  // Alert styles - Premium dark mode
  alert: {
    info: 'flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-200',
    success: 'flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700/50 dark:text-emerald-200',
    warning: 'flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-200',
    error: 'flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-200',
  },

  // Table styles - Premium dark mode
  table: {
    header: 'bg-slate-100 dark:bg-slate-800/50 font-semibold text-slate-900 dark:text-slate-100 dark:border-b dark:border-slate-700/50',
    row: 'border-b border-slate-200 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
    cell: 'px-4 py-3 text-slate-900 dark:text-slate-300',
  },

  // Tag/Chip styles - Premium dark mode
  tag: {
    base: 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium gap-1 transition-all',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border dark:border-blue-700/50',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border dark:border-emerald-700/50',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border dark:border-amber-700/50',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border dark:border-red-700/50',
  },

  // Modal/Dialog - Premium dark mode
  modal: {
    overlay: 'fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm',
    content: 'bg-white dark:bg-slate-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/50 border dark:border-slate-700/50',
  },

  // Scrollbar - Dark mode optimized
  scrollbar: 'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent',
};

// ============================================================================
// STATUS MAPPINGS
// ============================================================================

export const statusStyles = {
  // Ticket status
  ticketStatus: {
    open: {
      gradient: gradients.status.open,
      accent: colors.danger.text,
      light: colors.danger.light,
      label: 'Open',
    },
    in_progress: {
      gradient: gradients.status.in_progress,
      accent: colors.warning.text,
      light: colors.warning.light,
      label: 'In Progress',
    },
    resolved: {
      gradient: gradients.status.resolved,
      accent: colors.success.text,
      light: colors.success.light,
      label: 'Resolved',
    },
    closed: {
      gradient: gradients.status.closed,
      accent: colors.slate.text,
      light: colors.slate.light,
      label: 'Closed',
    },
  },

  // Priority levels
  priority: {
    high: {
      gradient: gradients.priority.high,
      badge: `${components.badge.default} bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800`,
      text: colors.danger.text,
      light: colors.danger.light,
      label: 'High',
    },
    medium: {
      gradient: gradients.priority.medium,
      badge: `${components.badge.default} bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800`,
      text: colors.warning.text,
      light: colors.warning.light,
      label: 'Medium',
    },
    low: {
      gradient: gradients.priority.low,
      badge: `${components.badge.default} bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800`,
      text: colors.success.text,
      light: colors.success.light,
      label: 'Low',
    },
  },

  // Attendance status
  attendance: {
    present: {
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      text: colors.success.text,
      label: 'Present',
    },
    absent: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      text: colors.danger.text,
      label: 'Absent',
    },
    leave: {
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      text: colors.primary.text,
      label: 'Leave',
    },
  },

  // Role colors
  role: {
    admin: {
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      text: colors.purple.text,
    },
    manager: {
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      text: colors.primary.text,
    },
    hr: {
      badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      text: 'text-pink-600',
    },
    employee: {
      badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
      text: colors.slate.text,
    },
  },
};

// ============================================================================
// UTILITY PATTERNS
// ============================================================================

export const patterns = {
  // Glass effect
  glass: 'backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/20',

  // Smooth transitions
  smoothTransition: 'transition-all duration-200 ease-in-out',
  fadeTransition: 'transition-opacity duration-150 ease-in-out',

  // Focus states
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',

  // Disabled states
  disabled: 'disabled:pointer-events-none disabled:opacity-50',

  // Shadows
  shadowSm: 'shadow-sm',
  shadowBase: 'shadow',
  shadowMd: 'shadow-md',
  shadowLg: 'shadow-lg',
};

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

export const responsive = {
  mobileFirst: 'sm:',
  tabletUp: 'md:',
  desktopUp: 'lg:',
  wideUp: 'xl:',
  maxUp: '2xl:',

  // Common responsive patterns
  mobileToDesktop: 'w-full md:w-auto',
  stackToRow: 'flex flex-col md:flex-row',
  gridResponsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

// ============================================================================
// DARK MODE UTILITIES - PREMIUM REDESIGNED
// ============================================================================

export const darkMode = {
  // Background - Deep premium colors
  bg: 'dark:bg-slate-950',
  bgSecondary: 'dark:bg-slate-900',
  bgTertiary: 'dark:bg-slate-800',
  bgPrimary: 'dark:bg-[#0d111c]',         // Ultra deep navy
  bgElevated: 'dark:bg-[#151a2a]',        // Elevated surface
  bgFloating: 'dark:bg-[#1f2538]',        // Floating element

  // Text - Refined readable palette
  text: 'dark:text-slate-100',
  textSecondary: 'dark:text-slate-300',
  textTertiary: 'dark:text-slate-400',
  textMuted: 'dark:text-slate-500',
  textWeak: 'dark:text-slate-600',

  // Borders - Visible but not harsh
  border: 'dark:border-slate-700/50',
  borderSecondary: 'dark:border-slate-700/30',
  borderStrong: 'dark:border-slate-600',
  borderGlow: 'dark:border-slate-600/50',

  // Focus states - Vibrant
  focusRing: 'dark:focus-visible:ring-blue-400',
  focusRingStrong: 'dark:focus-visible:ring-blue-500',

  // Hover states - Subtle elevation
  hoverBg: 'dark:hover:bg-slate-800/50',
  hoverBgElevated: 'dark:hover:bg-slate-700/50',

  // Card backgrounds - Glass effect
  cardBg: 'dark:bg-slate-800/50 dark:backdrop-blur-sm',
  cardBgOpaque: 'dark:bg-slate-800',

  // Status badges - High contrast
  statusSuccess: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50',
  statusWarning: 'dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50',
  statusError: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50',
  statusInfo: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',

  // Input fields
  inputBg: 'dark:bg-slate-900/50 dark:border-slate-700',
  inputBgFocus: 'dark:bg-slate-800/50',
  inputPlaceholder: 'dark:placeholder-slate-400',

  // Shadows - Enhanced depth
  shadowSm: 'dark:shadow-xl dark:shadow-black/50',
  shadowMd: 'dark:shadow-2xl dark:shadow-black/60',
  shadowLg: 'dark:shadow-2xl dark:shadow-black/70',

  // Gradients - Dark mode optimized
  gradientBase: 'dark:from-slate-800 dark:to-slate-900',
  gradientElevated: 'dark:from-slate-700 dark:to-slate-800',
  gradientOverlay: 'dark:from-black/40 dark:to-transparent',

  // Glass morphism
  glass: 'dark:bg-slate-900/40 dark:backdrop-blur-md dark:border dark:border-slate-700/30',
  glassElevated: 'dark:bg-slate-800/60 dark:backdrop-blur-lg dark:border dark:border-slate-600/40',
};

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

/**
 * Get status style configuration by ticket status
 */
export function getTicketStatusStyle(status: string) {
  return statusStyles.ticketStatus[status as keyof typeof statusStyles.ticketStatus] || statusStyles.ticketStatus.closed;
}

/**
 * Get priority style configuration by priority level
 */
export function getPriorityStyle(priority: string) {
  return statusStyles.priority[priority as keyof typeof statusStyles.priority] || statusStyles.priority.low;
}

/**
 * Get role-based colors
 */
export function getRoleStyle(role: string) {
  return statusStyles.role[role as keyof typeof statusStyles.role] || statusStyles.role.employee;
}

/**
 * Combine multiple class strings safely
 */
export function combineClasses(...classes: (string | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// SEMANTIC TOKEN HELPER FUNCTIONS
// ============================================================================

/**
 * Create a CSS custom property style object
 * Used for inline styles with semantic tokens
 */
export function createSemanticStyle(token: string): React.CSSProperties {
  return {
    backgroundColor: token.includes('text') ? 'transparent' : `var(${token})`,
    color: token.includes('text') ? `var(${token})` : 'inherit',
  };
}

/**
 * Create inline style with semantic color token
 * @example getSemanticBgColor('--color-surface-primary')
 */
export function getSemanticBgColor(token: string): React.CSSProperties {
  return { backgroundColor: `var(${token})` };
}

/**
 * Create inline style with semantic text color token
 */
export function getSemanticTextColor(token: string): React.CSSProperties {
  return { color: `var(${token})` };
}

/**
 * Create inline style with semantic border color token
 */
export function getSemanticBorderColor(token: string): React.CSSProperties {
  return { borderColor: `var(${token})` };
}

/**
 * Get semantic component styles with proper light/dark mapping
 */
export const semanticComponents = {
  // Card styles using semantic tokens
  card: {
    base: `bg-[var(--color-surface-primary)] border-[var(--color-border-default)] shadow-sm dark:shadow-xl dark:shadow-black/40`,
    hover: `hover:shadow-md dark:hover:shadow-2xl dark:hover:shadow-black/50 transition-all duration-200`,
    interactive: `bg-[var(--color-surface-interactive)] hover:bg-[var(--color-surface-interactive-hover)] transition-colors`,
    glass: 'backdrop-blur-sm bg-white/50 dark:bg-slate-800/40 border-white/20 dark:border-slate-700/30 dark:backdrop-blur-lg',
  },

  // Button styles using semantic tokens
  button: {
    base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-[var(--color-surface-primary)]`,
    primary: `bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-primary-hover)] dark:shadow-lg dark:shadow-[var(--color-brand-primary)]/20`,
    secondary: `bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] transition-colors`,
    ghost: `hover:bg-[var(--color-surface-interactive)] text-[var(--color-text-primary)]`,
    outline: `border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors`,
    danger: `bg-[var(--color-status-error)] text-[var(--color-text-inverse)] hover:opacity-90 dark:shadow-lg dark:shadow-[var(--color-status-error)]/20`,
    success: `bg-[var(--color-status-success)] text-[var(--color-text-inverse)] hover:opacity-90 dark:shadow-lg dark:shadow-[var(--color-status-success)]/20`,
  },

  // Badge styles using semantic tokens
  badge: {
    default: `inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold`,
    primary: `border-transparent bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] dark:bg-[var(--color-brand-primary)]/30 dark:text-blue-200 dark:border dark:border-[var(--color-brand-primary)]/50`,
    success: `border-transparent bg-[var(--color-status-success)] text-[var(--color-text-inverse)] dark:bg-[var(--color-status-success)]/30 dark:text-green-200 dark:border dark:border-[var(--color-status-success)]/50`,
    warning: `border-transparent bg-[var(--color-status-warning)] text-[var(--color-text-inverse)] dark:bg-[var(--color-status-warning)]/30 dark:text-yellow-200 dark:border dark:border-[var(--color-status-warning)]/50`,
    error: `border-transparent bg-[var(--color-status-error)] text-[var(--color-text-inverse)] dark:bg-[var(--color-status-error)]/30 dark:text-red-200 dark:border dark:border-[var(--color-status-error)]/50`,
    outline: `text-[var(--color-text-primary)] border-[var(--color-border-default)]`,
  },

  // Input styles using semantic tokens
  input: {
    base: `flex h-9 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-1 text-sm text-[var(--color-text-primary)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--color-surface-secondary)] dark:border-[var(--color-border-light)] placeholder-[var(--color-text-tertiary)]`,
    dark: `dark:border-[var(--color-border-default)] dark:bg-[var(--color-surface-secondary)] dark:text-[var(--color-text-primary)]`,
  },

  // Alert styles using semantic tokens
  alert: {
    info: `flex items-center gap-3 p-3 bg-[var(--color-status-info-light)] rounded-lg border border-[var(--color-status-info)] text-[var(--color-text-primary)] dark:bg-[var(--color-status-info)]/10 dark:border-[var(--color-status-info)]/50 dark:text-blue-200`,
    success: `flex items-center gap-3 p-3 bg-[var(--color-status-success-light)] rounded-lg border border-[var(--color-status-success)] text-[var(--color-text-primary)] dark:bg-[var(--color-status-success)]/10 dark:border-[var(--color-status-success)]/50 dark:text-green-200`,
    warning: `flex items-center gap-3 p-3 bg-[var(--color-status-warning-light)] rounded-lg border border-[var(--color-status-warning)] text-[var(--color-text-primary)] dark:bg-[var(--color-status-warning)]/10 dark:border-[var(--color-status-warning)]/50 dark:text-yellow-200`,
    error: `flex items-center gap-3 p-3 bg-[var(--color-status-error-light)] rounded-lg border border-[var(--color-status-error)] text-[var(--color-text-primary)] dark:bg-[var(--color-status-error)]/10 dark:border-[var(--color-status-error)]/50 dark:text-red-200`,
  },

  // Table styles using semantic tokens
  table: {
    header: `bg-[var(--color-surface-secondary)] font-semibold text-[var(--color-text-primary)] dark:border-b dark:border-[var(--color-border-light)]`,
    row: `border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-interactive)] transition-colors dark:hover:bg-[var(--color-surface-interactive)]/40`,
    cell: `px-4 py-3 text-[var(--color-text-primary)]`,
  },

  // Tag/Chip styles using semantic tokens
  tag: {
    base: `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium gap-1 transition-all`,
    primary: `bg-[var(--color-brand-primary)] bg-opacity-10 text-[var(--color-brand-primary)] dark:bg-[var(--color-brand-primary)]/20 dark:text-blue-300 dark:border dark:border-[var(--color-brand-primary)]/40`,
    success: `bg-[var(--color-status-success)] bg-opacity-10 text-[var(--color-status-success)] dark:bg-[var(--color-status-success)]/20 dark:text-green-300 dark:border dark:border-[var(--color-status-success)]/40`,
    warning: `bg-[var(--color-status-warning)] bg-opacity-10 text-[var(--color-status-warning)] dark:bg-[var(--color-status-warning)]/20 dark:text-yellow-300 dark:border dark:border-[var(--color-status-warning)]/40`,
    error: `bg-[var(--color-status-error)] bg-opacity-10 text-[var(--color-status-error)] dark:bg-[var(--color-status-error)]/20 dark:text-red-300 dark:border dark:border-[var(--color-status-error)]/40`,
  },

  // Modal/Dialog
  modal: {
    overlay: 'fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm',
    content: `bg-[var(--color-surface-primary)] rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-[var(--color-border-default)]`,
  },

  // Panel/Container
  panel: {
    base: `bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border-light)] p-4 dark:shadow-lg dark:shadow-black/20`,
    elevated: `bg-[var(--color-surface-primary)] rounded-lg border border-[var(--color-border-default)] shadow-md dark:shadow-xl dark:shadow-black/40`,
  },
};
