# 🔗 Notification Routing Setup Guide

## Overview

Notifications now support complete routing functionality. Clicking a notification in the bell dropdown or toast will navigate users to the relevant page (Teams Chat, Ticket Detail, Asset Detail, etc.).

---

## How Routing Works

### 1. **Notification Data Structure**

Each notification must contain these fields for routing to work:

```typescript
interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
  link?: string              // Optional direct link override
  entity_type?: string       // 'ticket' | 'team' | 'asset' | 'department'
  entity_id?: string         // The ID of the entity
}
```

### 2. **Link Generation Logic**

The system uses the `generateNotificationLink()` helper function to create links:

```typescript
const generateNotificationLink = (entityType?: string, entityId?: string): string | undefined => {
  if (!entityType || !entityId) return undefined
  
  switch (entityType) {
    case 'ticket':
      return `/app/tickets/${entityId}`
    case 'team':
      return `/app/teams/${entityId}`
    case 'asset':
      return `/app/assets/${entityId}`
    case 'department':
      return `/app/departments/${entityId}`
    default:
      return undefined
  }
}
```

### 3. **Navigation Flow**

```
User clicks notification (Toast or Bell dropdown)
    ↓
handleNotificationClick(notification)
    ↓
Mark as read (if not already)
    ↓
Generate link from:
  - notification.link (if exists) OR
  - generateNotificationLink(entity_type, entity_id)
    ↓
Navigate using React Router: navigate(link)
    ↓
Close dropdown/dismiss toast
```

---

## Notification Types & Routing

### Team Message Notifications
**Type:** `team_message`
**Entity Type:** `team`
**Navigation:** `/app/teams/{team_id}`

```tsx
const notification: Notification = {
  id: 'temp-msg-123',
  title: `New message in Engineering Team`,
  message: `John: Check out the new design...`,
  type: 'team_message',
  read: false,
  created_at: new Date().toISOString(),
  entity_type: 'team',         // ✅ Required
  entity_id: team_id,          // ✅ Required
  link: `/app/teams/${team_id}` // ✅ Auto-generated if missing
}
```

### Ticket Assigned Notification
**Type:** `ticket_assigned`
**Entity Type:** `ticket`
**Navigation:** `/app/tickets/{ticket_id}`

```tsx
const notification: Notification = {
  id: 'temp-ticket-assigned',
  title: `New Ticket Assigned`,
  message: `You've been assigned "Fix Login Bug"`,
  type: 'ticket_assigned',
  read: false,
  created_at: new Date().toISOString(),
  entity_type: 'ticket',       // ✅ Required
  entity_id: ticket_id,        // ✅ Required
}
```

### Ticket Status Changed Notification
**Type:** `ticket_status_changed`
**Entity Type:** `ticket`
**Navigation:** `/app/tickets/{ticket_id}`

### Ticket Commented Notification
**Type:** `ticket_commented`
**Entity Type:** `ticket`
**Navigation:** `/app/tickets/{ticket_id}`

### Asset Assigned Notification
**Type:** `asset_assigned`
**Entity Type:** `asset`
**Navigation:** `/app/assets/{asset_id}`

### Asset Updated Notification
**Type:** `asset_updated`
**Entity Type:** `asset`
**Navigation:** `/app/assets/{asset_id}`

---

## Implementation Checklist

### ✅ What's Already Done

- [x] Helper function `generateNotificationLink()` added to both `NotificationContext.tsx` and `NotificationBell.tsx`
- [x] `NotificationBell.tsx` updated to use React Router `navigate()` instead of `window.location.href`
- [x] Toast notifications support `onClick` handlers that trigger navigation
- [x] Proper logging for debugging navigation attempts
- [x] Warning messages when notification lacks routing data

### ⏳ What Needs to Ensure

1. **Database Schema** - Verify `notifications` table has these columns:
   - `link` (text, nullable)
   - `entity_type` (text, nullable)
   - `entity_id` (text, nullable)
   
   ✅ Confirmed in `/src/types/database.ts`

2. **Notification Creation Points** - All places where notifications are created must populate these fields:
   - Ticket handlers (assign, status change, comment)
   - Asset handlers (assign, update)
   - Team message handler ✅ Already doing this
   - Department handlers

3. **Subscription Handlers** - Real-time notification creation must include routing data

---

## Testing Routing

### Test 1: Team Message Navigation
1. Send a message in a team chat
2. Click the toast notification
3. **Expected:** Navigate to `/app/teams/{team_id}` and open team chat

### Test 2: Notification Bell Dropdown
1. Open notification bell dropdown
2. Click any notification
3. **Expected:** Navigate to relevant page and dismiss dropdown

### Test 3: No Routing Data Fallback
1. Look for console warnings if notification lacks entity data
2. **Expected:** Warning logged: "No link available for notification..."
3. Notification still marks as read, but doesn't navigate

### Test 4: Multiple Entity Types
1. Create notifications of different types
2. Click each one
3. **Expected:** Each navigates to correct entity type (team, ticket, asset, department)

---

## Debugging

### Enable Routing Logs

Check browser console for these logs:

**Successful navigation:**
```
🔗 Navigating to: /app/teams/abc123 from notification: New message in Teams
```

**Missing routing data:**
```
⚠️ No link available for notification: {
  id: "notif-123",
  type: "ticket_assigned",
  entity_type: undefined,
  entity_id: undefined
}
```

**Error marking as read:**
```
Error marking notification as read: RLS policy error...
```

---

## Database Query Example

To verify notifications have routing data:

```sql
SELECT 
  id,
  title,
  type,
  entity_type,
  entity_id,
  link,
  created_at
FROM notifications
WHERE user_id = 'current-user-id'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Key Files Modified

1. **`src/context/NotificationContext.tsx`**
   - Added `generateNotificationLink()` helper function
   - Updated `createToast()` to use the helper
   - Toast now includes `onClick` for navigation

2. **`src/components/NotificationBell.tsx`**
   - Added `generateNotificationLink()` helper function
   - Updated `handleNotificationClick()` to use React Router
   - Added error logging for missing routing data
   - Marks notification as read before navigation

3. **`src/components/ToastNotification.tsx`**
   - Already supports `onClick` handlers
   - No changes needed
