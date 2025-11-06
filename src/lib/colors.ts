// Brand colors
export const colors = {
  // Primary
  primary: '#185ee0',
  primaryHover: '#1450c4',
  primaryLight: '#e6eef9',
  
  // Accent
  accent: '#f97316',
  accentHover: '#ea580c',
  accentLight: '#fed7aa',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Neutrals (keep these)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    // ... etc
  }
} as const

// Helper for Tailwind classes
export const buttonPrimary = 'bg-[#185ee0] hover:bg-[#1450c4] text-white'
export const buttonAccent = 'bg-[#f97316] hover:bg-[#ea580c] text-white'
export const badgePrimary = 'bg-[#e6eef9] text-[#185ee0]'