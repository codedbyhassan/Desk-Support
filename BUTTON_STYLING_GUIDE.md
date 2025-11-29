# Adaptive Button Styling Guide

## Overview
Buttons now automatically adapt their colors based on their background. Use the provided utility classes to ensure proper contrast and visibility.

## Button Classes

### On Light/White Backgrounds
When placing buttons on white or light-colored cards/backgrounds, use:

#### Primary Button (Blue-black with white text)
```tsx
<Button className="btn-on-light">Save Changes</Button>
```
- **Background**: Slate-900 (blue-black)
- **Text**: White
- **Hover**: Slate-800 (slightly lighter)
- **Active**: Slate-700 (even lighter)
- **Disabled**: Slate-400

#### Secondary Button
```tsx
<Button className="btn-on-light-secondary" variant="secondary">Action</Button>
```
- Same styling as primary on light backgrounds

#### Ghost Button
```tsx
<Button className="btn-on-light-ghost" variant="ghost">Cancel</Button>
```
- **Text**: Slate-900
- **Hover**: Slate-100 background
- **Disabled**: Slate-400 text

#### Outline Button
```tsx
<Button className="btn-on-light-outline" variant="outline">Delete</Button>
```
- **Border**: Slate-900
- **Text**: Slate-900
- **Hover**: Slate-50 background
- **Disabled**: Slate-400

---

### On Dark/Black Backgrounds
When placing buttons on dark cards/backgrounds (dark mode), use:

#### Primary Button (White with black text)
```tsx
<Button className="btn-on-dark">Save Changes</Button>
```
- **Background**: White
- **Text**: Slate-900 (black)
- **Hover**: Slate-100 (slightly darker)
- **Active**: Slate-200 (even darker)
- **Disabled**: Slate-300

#### Secondary Button
```tsx
<Button className="btn-on-dark-secondary" variant="secondary">Action</Button>
```
- **Background**: Slate-100
- **Text**: Slate-900
- **Hover**: Slate-200
- **Disabled**: Slate-300

#### Ghost Button
```tsx
<Button className="btn-on-dark-ghost" variant="ghost">Cancel</Button>
```
- **Text**: White
- **Hover**: Slate-700 background
- **Disabled**: Slate-500 text

#### Outline Button
```tsx
<Button className="btn-on-dark-outline" variant="outline">Delete</Button>
```
- **Border**: White
- **Text**: White
- **Hover**: Slate-700 background
- **Disabled**: Slate-500 border and text

---

## Usage Examples

### Light Mode Card
```tsx
<Card className="bg-white">
  <CardHeader>
    <CardTitle>Create New Item</CardTitle>
  </CardHeader>
  <CardContent>
    <form>
      {/* Form fields */}
    </form>
  </CardContent>
  <CardFooter className="flex gap-2 justify-end">
    <Button className="btn-on-light-ghost">Cancel</Button>
    <Button className="btn-on-light">Create</Button>
  </CardFooter>
</Card>
```

### Dark Mode Card
```tsx
<Card className="dark bg-card">
  <CardHeader>
    <CardTitle>Create New Item</CardTitle>
  </CardHeader>
  <CardContent>
    <form>
      {/* Form fields */}
    </form>
  </CardContent>
  <CardFooter className="flex gap-2 justify-end">
    <Button className="btn-on-dark-ghost">Cancel</Button>
    <Button className="btn-on-dark">Create</Button>
  </CardFooter>
</Card>
```

---

## Color Specifications

### Light Background Buttons
| State | Background | Text |
|-------|-----------|------|
| Normal | #0f172a (slate-900) | #ffffff (white) |
| Hover | #1e293b (slate-800) | #ffffff |
| Active | #334155 (slate-700) | #ffffff |
| Disabled | #a0a0a4 (slate-400) | #8d8d92 (slate-600) |

### Dark Background Buttons
| State | Background | Text |
|-------|-----------|------|
| Normal | #ffffff (white) | #0f172a (slate-900) |
| Hover | #f1f5f9 (slate-100) | #0f172a |
| Active | #e2e8f0 (slate-200) | #0f172a |
| Disabled | #cbd5e1 (slate-300) | #8d8d92 (slate-600) |

---

## Accessibility Notes
- All buttons maintain sufficient contrast ratios (WCAG AA+)
- Focus states use 2px outline with 2px offset
- Disabled states reduce opacity and change cursor to `not-allowed`
- Hover states provide clear visual feedback
