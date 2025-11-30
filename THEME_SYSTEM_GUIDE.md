# 🎨 Centralized Theme System Guide

## Overview
This application uses a **single source of truth for all styling**. All colors, spacing, typography, and design tokens are defined in one place and automatically apply to the entire app.

---

## 📍 Central Theme Locations

### 1. **CSS Variables** (`src/index.css`)
- **Location**: `src/index.css` - Defines all CSS custom properties
- **Coverage**: Colors, typography, spacing, shadows, animations, transitions
- **Light Mode**: `:root` selector
- **Dark Mode**: `.dark` class selector

### 2. **Tailwind Config** (`tailwind.config.cjs`)
- **Maps CSS Variables** to Tailwind utility classes
- **Semantic Color Names**: `primary`, `secondary`, `accent`, `destructive`, `warning`, `success`, `error`, `info`
- **No hardcoded values** - everything references CSS variables

### 3. **Theme Context** (`src/context/ThemeContext.tsx`)
- **Runtime Customization**: Allows users to modify theme colors
- **Accessibility**: Validates WCAG contrast ratios
- **Persistence**: Saves theme to localStorage
- **Export/Import**: Users can save and load themes

---

## 🎯 Color System

### Semantic Color Palette

| Color | Light Mode | Dark Mode | Usage |
|-------|-----------|----------|-------|
| **Primary** | `#f53c3c` (Red) | `#f04646` (Bright Red) | Main actions, buttons, primary UI |
| **Secondary** | `#a1a09f` (Gray) | `#262626` (Charcoal) | Inactive states, secondary actions |
| **Accent** | `#00a8ff` (Blue) | `#1fb4ff` (Bright Blue) | Highlights, special attention |
| **Destructive** | `#f53c3c` (Red) | `#f04646` (Bright Red) | Delete, danger actions |
| **Warning** | `#f59e0b` (Amber) | `#ffa726` (Orange) | Alerts, warnings |
| **Success** | `#15803d` (Green) | `#22c55e` (Bright Green) | Success messages, confirmations |
| **Error** | `#f53c3c` (Red) | `#f04646` (Bright Red) | Error states, problems |
| **Info** | `#00a8ff` (Blue) | `#1fb4ff` (Bright Blue) | Information, hints |
| **Background** | `#ffffff` (White) | `#171717` (Charcoal Black) | Main page background |
| **Card** | `#ffffff` (White) | `#1d1d1d` (Dark Charcoal) | Card surfaces |
| **Foreground** | `#292524` (Dark) | `#f5f5f5` (White) | Primary text |
| **Muted** | `#f5f5f4` (Light Gray) | `#242424` (Very Dark) | Subtle elements |
| **Border** | `#e7e5e4` (Light) | `#404040` (Dark Gray) | Borders |

### Sidebar/Navbar Colors (Dark Mode Only)
| Color | Value | Usage |
|-------|-------|-------|
| **Background** | `#0d1117` (Blue-Black) | Sidebar/navbar background |
| **Foreground** | `#ffffff` (White) | Text on sidebar/navbar |
| **Border** | `#151a1f` | Subtle borders on sidebar |

---

## 💻 How to Use

### ✅ CORRECT: Use Semantic Classes
```tsx
// ✅ GOOD - Uses theme system
<button className="bg-primary text-primary-foreground hover:bg-primary-hover">
  Delete
</button>

<div className="bg-warning text-warning-foreground">
  This is a warning
</div>

<div className="bg-destructive text-destructive-foreground">
  Error occurred
</div>
```

### ❌ INCORRECT: Don't Use Hardcoded Colors
```tsx
// ❌ BAD - Hardcoded color, won't respect theme
<button className="bg-red-600 hover:bg-red-700">
  Delete
</button>

// ❌ BAD - Hardcoded hex value
<div className="bg-[#f53c3c]">
  Error
</div>

// ❌ BAD - Tailwind color directly, not semantic
<button className="bg-red-500">
  Click me
</button>
```

---

## 🎨 Semantic Color Classes Available

### Background Colors
```tsx
className="bg-primary"           // Primary action background
className="bg-secondary"         // Secondary action background
className="bg-accent"            // Accent/highlight background
className="bg-destructive"       // Delete/danger background
className="bg-warning"           // Warning background
className="bg-success"           // Success background
className="bg-error"             // Error background
className="bg-info"              // Information background
className="bg-muted"             // Muted/subtle background
```

### Text Colors
```tsx
className="text-primary"         // Primary text
className="text-secondary"       // Secondary text
className="text-accent"          // Accent text
className="text-destructive"     // Destructive text
className="text-foreground"      // Main text color
className="text-muted-foreground" // Subtle text
```

### Foreground (Text on Colored Backgrounds)
```tsx
className="text-primary-foreground"       // White text on primary
className="text-destructive-foreground"   // White text on destructive
className="text-warning-foreground"       // Text on warning background
className="text-accent-foreground"        // White text on accent
```

### Border Colors
```tsx
className="border-primary"
className="border-destructive"
className="border-warning"
className="border-muted"
```

---

## 🎯 Component Pattern Examples

### Error Message (Alert)
```tsx
// ✅ CORRECT
<div className="bg-error/10 border border-error rounded-lg p-3 flex gap-2">
  <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
  <p className="text-error text-sm">{error}</p>
</div>

// Light mode: Light red background, red icon and text
// Dark mode: Dark red background, bright red icon and text
```

### Warning Message
```tsx
// ✅ CORRECT
<div className="bg-warning/10 border border-warning rounded-lg p-3">
  <AlertCircle className="h-4 w-4 text-warning" />
  <p className="text-warning text-sm">{warning}</p>
</div>
```

### Delete Button
```tsx
// ✅ CORRECT
<button className="bg-destructive hover:bg-destructive-hover text-destructive-foreground">
  Delete
</button>

// Works in both light and dark modes
```

### Hover State
```tsx
// ✅ CORRECT - Using semantic hover variants
<button className="bg-primary hover:bg-primary-hover">
  Primary Button
</button>

<button className="bg-destructive hover:bg-destructive-hover">
  Delete
</button>
```

---

## 🔄 Dark Mode Automatic

The theme system **automatically handles dark mode**. No need to add `dark:` prefixes for semantic colors:

```tsx
// ✅ CORRECT - No dark: prefix needed
<div className="bg-primary text-primary-foreground">
  This works in both light AND dark modes automatically
</div>

// Dark mode CSS variables are automatically adjusted
```

---

## 📱 Sidebar/Navbar Specific

For the sidebar and navbar (which use blue-black in dark mode):

```tsx
// ✅ CORRECT for sidebar in dark mode
className="bg-sidebar text-sidebar-foreground"

// Light mode: Uses standard background/foreground
// Dark mode: Uses blue-black (#0d1117) background
```

---

## 🎪 Avatar Gradients

For avatar backgrounds, use semantic colors:

```tsx
// ✅ CORRECT - Uses primary color
className="bg-gradient-to-br from-primary to-primary/80"

// ✅ CORRECT - Uses accent color  
className="bg-gradient-to-br from-accent to-accent/80"

// ✅ CORRECT - Uses success color
className="bg-gradient-to-br from-success-500 to-green-600"
```

---

## 🚀 Teams Component Color References

### TeamChatView
- **Header avatar**: `from-primary` gradient
- **Error messages**: `bg-error/10 border-error text-error`
- **Success states**: `bg-success/10 border-success text-success`
- **Muted states**: `bg-muted text-muted-foreground`

### TeamsPage
- **Avatar gradients**: Use semantic color palette
- **Error dialogs**: `bg-error/10 border-error text-error`
- **Delete buttons**: `bg-destructive hover:bg-destructive-hover`
- **Action buttons**: `bg-primary hover:bg-primary-hover`

### VideoCallView
- **End call button**: `bg-destructive hover:bg-destructive-hover`
- **Status indicators**: 
  - Connected: `bg-success`
  - Connecting: `bg-warning`
  - Disconnected: `bg-destructive`

### ParticipantsList
- **Muted indicators**: `bg-warning/20 text-warning`
- **Off indicators**: `bg-destructive/20 text-destructive`

---

## ✨ Typography & Spacing

All typography and spacing also comes from the theme:

```tsx
// Typography - Uses theme font sizes
className="text-xs"      // 12px
className="text-sm"      // 14px
className="text-base"    // 16px
className="text-lg"      // 18px
className="text-xl"      // 20px

// Font weights
className="font-normal"     // 400
className="font-medium"     // 500
className="font-semibold"   // 600
className="font-bold"       // 700

// Spacing
className="p-4"          // 16px padding
className="gap-3"        // 12px gap
className="mt-2"         // 8px margin
className="rounded-lg"   // 12px border radius
```

---

## 🔍 How to Debug

If a color doesn't change with theme switch:

1. **Check if using hardcoded colors**
   ```tsx
   // ❌ BAD
   className="bg-red-600"  // Hardcoded, won't change
   
   // ✅ GOOD
   className="bg-destructive"  // Will change with theme
   ```

2. **Check if CSS variable exists**
   - Open DevTools > Inspect element
   - Look at computed styles
   - Search for `--primary`, `--destructive`, etc.

3. **Check ThemeContext is active**
   - Ensure `<ThemeProvider>` wraps your app in `main.tsx`

4. **Force refresh browser cache**
   - Hard refresh: `Ctrl+Shift+R`

---

## 📋 Checklist for New Components

When creating new components:

- [ ] Use only semantic color classes (`primary`, `destructive`, `warning`, etc.)
- [ ] No hardcoded hex values (`#f53c3c`)
- [ ] No hardcoded Tailwind colors (`red-600`, `blue-500`)
- [ ] Use corresponding foreground classes for text
- [ ] Test in both light and dark modes
- [ ] Check contrast ratios with `ThemeContext.checkContrast()`

---

## 🎓 Summary

| **DON'T DO** | **DO THIS INSTEAD** |
|-------------|-------------------|
| `bg-red-600` | `bg-destructive` |
| `text-red-700` | `text-destructive` |
| `bg-[#f53c3c]` | `bg-primary` |
| `hover:bg-red-700` | `hover:bg-destructive-hover` |
| `bg-amber-500` | `bg-warning` |
| `text-green-600` | `text-success` |
| `dark:bg-white dark:text-slate-900` | `bg-card text-card-foreground` |

**Everything flows from the centralized theme system. Always use semantic class names!**
