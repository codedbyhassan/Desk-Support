# 📋 NEXT SESSION: Remaining Fixes Quick Reference

## What's Completed ✅
- [x] Error handling with RLS-specific detection
- [x] Early notification buffering (race condition fix)
- [x] fetchError exported to context
- [x] Supabase Promise chain fixed

---

## What Remains ⏳

### Fix #1: Display Error UI
**File:** `src/components/NotificationBell.tsx` or create `NotificationErrorBanner.tsx`
**What to do:** Display `fetchError` when it exists
**Code sketch:**
```tsx
const { fetchError, refreshNotifications } = useNotifications()

if (fetchError) {
  return (
    <div className="bg-red-50 border border-red-200 p-3 rounded flex justify-between items-center">
      <span className="text-red-800">{fetchError}</span>
      <button 
        onClick={refreshNotifications}
        className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  )
}
```

---

### Fix #2: Fix shouldShowNotification Substring Bug
**File:** `src/context/NotificationContext.tsx` line ~75
**Current bug:** Uses `.startsWith()` which gives false positives
```tsx
// CURRENT (BROKEN):
pathname.startsWith(`/tickets/${entityId}`)  // entity "123" matches "/tickets/1234..."
```

**Fix: Use exact path component matching**
```tsx
// NEW (FIXED):
const pathSegments = pathname.split('/').filter(Boolean)
const matchesExactEntity = pathSegments[1] === entityType && pathSegments[2] === entityId
// More robust: check path structure exactly
```

**More precise fix:**
```tsx
const shouldShowNotification = useCallback((notification: Notification): boolean => {
  const hashPath = window.location.hash.replace('#', '') || window.location.pathname
  const pathname = hashPath || currentPath
  const entityType = notification.entity_type
  const entityId = notification.entity_id

  if (!entityType || !entityId) return true // No entity = always show

  // Extract path segments and check exact match
  const pathParts = pathname.split('/').filter(Boolean)
  
  // Check if currently viewing this exact entity
  const viewingEntity = 
    (entityType === 'ticket' && pathParts[0] === 'tickets' && pathParts[1] === entityId) ||
    (entityType === 'asset' && pathParts[0] === 'assets' && pathParts[1] === entityId) ||
    (entityType === 'team' && pathParts[0] === 'teams' && pathParts[1] === entityId)
  
  return !viewingEntity // Show unless viewing exact entity
}, [currentPath])
```

---

### Fix #3: Centralize Preference Checking
**File:** `src/context/NotificationContext.tsx`
**What to do:** Create helper function for preference logic
**Current problem:** Preferences checked twice (redundant)

**New helper:**
```tsx
const checkNotificationPreference = (notificationType: string): boolean => {
  // Check mute first
  if (Date.now() < muteUntilRef.current) {
    console.log('🔇 Notifications muted')
    return false
  }

  // Can add type-specific checks here if preferences added
  // For now, just mute check is implemented
  
  return true
}
```

**Update subscription handler to use it:**
```tsx
// OLD:
if (shouldShow) {
  // show notification
  if (/* preference checks */) {
    // show toast
  }
}

// NEW:
if (shouldShow && checkNotificationPreference(newNotification.type)) {
  setNotifications(prev => [newNotification, ...prev])
  if (initialLoadCompleteRef.current) {
    showToastRef.current(newNotification)
  }
}
```

---

### Fix #4: Add Retry Function
**File:** `src/context/NotificationContext.tsx`
**What to do:** Export retry function to context
**Code:**
```tsx
const retryFetch = async () => {
  console.log('🔄 Retrying notification fetch...')
  setFetchError(null)
  setLoading(true)
  await fetchNotifications()
}

// In provider value:
export const contextValue = {
  // ... existing
  retryFetch,  // NEW
}
```

---

## ✨ Quick Implementation Order

1. **First:** Add error UI display (high impact, visible immediately)
2. **Second:** Fix substring bug (prevents false suppression)
3. **Third:** Add retry function (pairs with error UI)
4. **Fourth:** Centralize preferences (code cleanup, low urgency)

---

## 🧪 Verification Checklist

After each fix:
- [ ] No new TypeScript errors
- [ ] Error shows in UI when RLS fails
- [ ] Retry button works
- [ ] Fast reload doesn't lose notifications
- [ ] "123" doesn't suppress "1234" entity notifications
- [ ] All 6 notification types still work

---

## 📞 Key Console Logs to Watch For

✅ Working properly:
```
📬 New notification received: ticket-123
✅ User can access team, creating notification
⏸️ Buffering early notification (initial load not complete)
📦 Processing buffered early notifications: 3
✅ Fetched notifications: 15
```

❌ Problems to debug:
```
⏭️ Skipping duplicate notification
⏭️ User cannot access this team
❌ Error fetching notifications
⏸️ Notifications are muted
```

---

## 🚀 Session Goal

Complete these 4 remaining fixes to have a fully robust notification system:
- Full error visibility ✅ coming
- No data loss ✅ coming  
- Proper preference logic ✅ coming
- No false suppressions ✅ coming
