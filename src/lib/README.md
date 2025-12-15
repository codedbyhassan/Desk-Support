# Centralized Design System

## 📁 File Organization

All design system files are organized as follows:

### `src/lib/design-system.ts`
**Purpose:** TypeScript design tokens, utilities, and type-safe constants

**Contains:**
- Color system (references CSS variables)
- Spacing system
- Typography system
- Sizing system
- Border system
- Shadow system
- Transition system
- Z-index system
- Component style presets
- Utility functions

**Usage:**
```typescript
import { colors, spacing, typography, componentStyles } from '@/lib/design-system'

// Use in components
<div style={{ color: colors.text.primary }}>
<div className={componentStyles.card.base}>
```

### `src/index.css`
**Purpose:** ALL CSS variables (single source of truth for colors, spacing, etc.)

**Contains:**
- All color variables (`--primary`, `--background`, etc.)
- All spacing variables (`--space-1`, `--space-2`, etc.)
- All typography variables (`--font-xs`, `--font-sm`, etc.)
- All border radius variables (`--radius-sm`, `--radius-md`, etc.)
- All shadow variables (`--shadow-sm`, `--shadow-md`, etc.)
- All transition variables (`--transition-fast`, etc.)
- Glass effect variables
- Component-specific color variables

**Usage:**
```tsx
// In Tailwind classes
<div className="bg-[hsl(var(--primary))] text-[hsl(var(--foreground))]">

// In inline styles
<div style={{ backgroundColor: 'hsl(var(--primary))' }}>
```

### `src/lib/theme.ts`
**Purpose:** Theme utilities and semantic token references

**Contains:**
- Semantic token references (maps to CSS variables)
- Legacy theme definitions (for backward compatibility)
- Theme helper functions

**Usage:**
```typescript
import { semanticTokens } from '@/lib/theme'

// Use semantic tokens
<div style={{ backgroundColor: semanticTokens.surface.primary }}>
```

### `src/context/ThemeContext.tsx`
**Purpose:** Theme context provider and theme management

**Contains:**
- Theme state management (light/dark/system)
- Custom theme overrides
- Theme settings (font size, border radius, spacing)
- Theme validation
- Theme export/import

**Usage:**
```typescript
import { useTheme } from '@/context/ThemeContext'

function MyComponent() {
  const { theme, toggleTheme, customTheme } = useTheme()
  // Use theme values
}
```

## 🎯 Design Principles

1. **Single Source of Truth:** All colors defined in `index.css` as CSS variables
2. **No Hardcoded Values:** Components must use CSS variables or design system imports
3. **Type Safety:** TypeScript types for all design tokens
4. **Theme-Aware:** All values automatically adapt to light/dark mode
5. **Centralized:** One place to change colors affects entire app

## 📝 Migration Guide

When updating components:

1. **Find hardcoded colors:**
   ```bash
   # Search for hex colors
   grep -r "#[0-9a-fA-F]\{6\}" src/components
   
   # Search for rgb/rgba
   grep -r "rgb(" src/components
   ```

2. **Replace with CSS variables:**
   ```tsx
   // Before
   <div className="bg-[#0066ff]">
   
   // After
   <div className="bg-[hsl(var(--primary))]">
   ```

3. **Use design system for complex values:**
   ```tsx
   // Before
   <div style={{ padding: '12px', margin: '16px' }}>
   
   // After
   import { spacing } from '@/lib/design-system'
   <div style={{ padding: spacing.padding.md, margin: spacing.margin.lg }}>
   ```

## 🔍 Quick Reference

### Colors
- Primary: `hsl(var(--primary))`
- Background: `hsl(var(--background))`
- Text: `hsl(var(--foreground))`
- Border: `hsl(var(--border))`
- Success: `hsl(var(--success))`
- Warning: `hsl(var(--warning))`
- Error: `hsl(var(--destructive))`

### Spacing
- Use Tailwind classes: `p-3`, `m-4`, `gap-2`
- Or CSS variables: `var(--space-3)`, `var(--space-4)`
- Or design system: `spacing.padding.md`

### Typography
- Font size: `text-sm`, `text-base`, `text-lg` (Tailwind)
- Or CSS variables: `var(--font-sm)`, `var(--font-base)`
- Or design system: `typography.fontSize.lg`

## ✅ Checklist for New Components

- [ ] No hardcoded hex colors (`#...`)
- [ ] No hardcoded RGB/RGBA colors
- [ ] Uses CSS variables for colors
- [ ] Uses Tailwind classes or design system for spacing
- [ ] Uses design system for typography
- [ ] Tested in both light and dark mode
- [ ] Colors adapt to theme changes

