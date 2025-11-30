# 🔥 Live Notification Toast System - Debug Checklist

## 📌 Current System Status

Your notification system has **6 notification types** triggered by:
1. ✅ **team_message** - saved to DB (persists)
2. ❌ **ticket_assigned** - temp only (lost on reload)
3. ❌ **ticket_status_changed** - temp only (lost on reload)
4. ❌ **ticket_commented** - temp only (lost on reload)
5. ❌ **asset_assigned** - temp only (lost on reload)
6. ❌ **asset_updated** - temp only (lost on reload)

**Your Problem:** Toasts aren't showing even though subscriptions should be running.

---

## 🔧 Step-by-Step Debug Process

### **STEP 1: Check Browser Console for Subscription Status**

Open DevTools (F12) → Console tab and look for these logs:

```
✅ Auth state changed { hasUser: true, userId: 'xxx', hasCompany: true, companyId: 'yyy' }
✅ Fetched notifications: X
✅ Initial load complete, subscriptions ready
📡 Notifications channel subscription status: SUBSCRIBED
✅ Successfully subscribed to notifications channel
📡 Team messages channel subscription status: SUBSCRIBED
✅ Successfully subscribed to team messages channel
📡 Ticket assignment channel status: SUBSCRIBED
📡 Ticket comment channel status: SUBSCRIBED
📡 Asset assignment channel status: SUBSCRIBED
```

**If you see these ✅ = Subscriptions are connected properly**

**If you DON'T see "Initial load complete" = Problem is in initial fetch**

---

### **STEP 2: Manually Check App State in Browser Console**

```javascript
// Check current user and notifications
const ctx = document.querySelector('[data-testid="notification-context"]')
console.log('Notifications Context:', ctx)

// Or access via React DevTools - find NotificationContext in component tree
// and expand it to see:
// - notifications array
// - unreadCount
// - toasts array
// - currentPath
// - preferences (should have all enabled)
```

**What to look for:**
- `unreadCount` should be > 0 if you have unread notifications
- `toasts` array should be populated when toast should show
- `preferences` should have `enablePushNotifications: true`, `enableTicketUpdates: true`, etc.

---

### **STEP 3: Check if Preferences Are Blocking Notifications**

```javascript
// Run in browser console
const prefs = JSON.parse(localStorage.getItem('notification_preferences') || '{}')
console.log('Stored Preferences:', prefs)

// Expected output should have:
{
  "enableEmailNotifications": false,
  "enablePushNotifications": true,
  "enableTicketUpdates": true,
  "enableComments": true,
  "enableSoundNotifications": true,
  "notificationMuteDuration": "never"
}

// If ANY of the enable* are false, notifications won't show for that type
```

**If preferences look wrong:**
```javascript
// Reset to defaults
localStorage.removeItem('notification_preferences')
// Then refresh page
location.reload()
```

---

### **STEP 4: Check if Notifications Are Muted**

```javascript
// In browser console, when you receive a notification:
// Look for log: "🔇 Notifications are muted, skipping toast"

// If you see this, notifications are muted. Check how long:
// The notification context stores mute duration in a ref

// To un-mute immediately:
localStorage.removeItem('notification_preferences')
location.reload()
```

---

### **STEP 5: Verify ToastContainer is Mounted**

```javascript
// In React DevTools:
// 1. Open Components tab
// 2. Search for "ToastContainer"
// 3. If not found = Component not rendering

// OR check in console:
document.querySelector('[class*="toast"]')
// Should return the toast container element if mounted
```

---

### **STEP 6: Create a Manual Test Notification**

Open browser console and run:

```javascript
// Get current user ID (check in Auth context or from logged-in state)
const userId = 'YOUR_USER_ID_HERE'  // Replace with actual ID

// Create test notification in database
const { data, error } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    title: '🧪 Test Toast',
    message: 'This is a test notification to verify toast system',
    type: 'team_message',  // Use team_message since it always shows
    read: false,
    entity_type: 'team',
    entity_id: 'test-id'
  })

console.log('Insert result:', data, error)
```

**Expected behavior:**
- 📬 See console log: "New notification received"
- 🔔 See console log: "Showing notification toast"
- 👀 **Toast appears on screen in 1-2 seconds**

**If toast DOESN'T appear:**
- Console should still show the logs above
- Check if `initialLoadCompleteRef.current` is true
- Check if toast is in `toasts` array in React DevTools

---

## 🎯 Root Cause Analysis Tree

```
Toasts Not Showing?
│
├─ YES: See console logs "Initial load complete" and "New notification received"
│  │
│  └─ YES: See "Showing notification toast: X" in console
│     │
│     └─ Check React DevTools:
│        ├─ Is `toasts` array populated in NotificationContext?
│        │  ├─ YES: CSS Issue
│        │  │  └─ Check: .fixed .top-4 .right-2 .z-[100] visible?
│        │  │
│        │  └─ NO: setToasts() not called or failing
│        │     └─ Check: Any errors in console?
│        │
│        └─ Check: Is ToastContainer visible in DOM?
│           ├─ NO: Component not rendering
│           │  └─ Check: App.tsx line has <ToastWrapper> inside HashRouter
│           │
│           └─ YES: Check toast styles/z-index might be hidden
│
├─ NO: See "New notification received" BUT NOT "Showing notification toast"
│  │
│  └─ One of these conditions failed:
│     ├─ initialLoadCompleteRef.current === false
│     ├─ shouldShowNotification() returned false
│     ├─ Notifications are muted
│     ├─ Preferences blocked the type
│     └─ Check console for specific log message
│
└─ NO: Don't see "New notification received" in console
   │
   └─ Subscriptions not working:
      ├─ Check: "Successfully subscribed" log appears?
      │  ├─ NO: Subscriptions failed to connect
      │  │  └─ Check: Network tab in DevTools
      │  │  └─ Check: Supabase RLS policies allow READ
      │  │
      │  └─ YES: Subscriptions connected but no events firing
      │     └─ Database inserts aren't happening
      │     └─ Create test notification manually (STEP 6)
      │
      └─ Check: Is user/company ID set?
         └─ Look for "No userId or companyId" log
```

---

## 🧪 Testing Each Notification Type

### **1. Test: Team Message (Should Always Work)**
```javascript
// First, get user and company ID
// Then create a team_message record

const { data, error } = await window.supabase
  .from('notifications')
  .insert({
    user_id: 'USER_ID',
    title: '🧪 Team Message Test',
    message: 'Testing team message toast',
    type: 'team_message',
    read: false,
    entity_type: 'team',
    entity_id: 'test-team-id'
  })
```

### **2. Test: Ticket Assignment**
```javascript
// Assign a real ticket to yourself
// Go to ticket detail page
// Click "Assign to Me"
// Should see toast (unless you're already on that page)
```

### **3. Test: Ticket Comment**
```javascript
// Get assigned to a ticket
// Go to ANY OTHER PAGE (not that ticket)
// Have someone else comment on your ticket
// Should see toast
```

### **4. Test: Asset Assignment**
```javascript
// Get assigned to an asset
// Navigate away from that asset
// Have admin change asset status
// Should see toast
```

---

## 📊 Comprehensive Preference System

**Preferences Stored In:** `localStorage.notification_preferences`

**Each Type Checks:**

| Notification Type | Preference Checked | Line in Code |
|---|---|---|
| team_message | enablePushNotifications | 351-365 in INSERT handler |
| ticket_assigned | enableTicketUpdates | 188-193 in showToast() |
| ticket_status_changed | enableTicketUpdates | 188-193 in showToast() |
| ticket_commented | enableComments | 194-197 in showToast() |
| asset_assigned | enablePushNotifications | 200-203 in showToast() |
| asset_updated | enablePushNotifications | 200-203 in showToast() |

**ALL TYPES also check:**
- ✅ shouldShowNotification() - user not on that page
- ✅ muteUntilRef.current - notifications not muted
- ✅ enableSoundNotifications - for sound playback
- ✅ initialLoadCompleteRef.current - initial load finished

---

## 🎬 Most Likely Issues (In Order of Probability)

### **Issue #1: `initialLoadCompleteRef.current` Still FALSE** (40% likely)
**Why:** fetchNotifications() taking too long or having RLS permission error

**Check:**
```javascript
// In console after app loads, wait 3 seconds
console.log('initialLoadCompleteRef:', window.initialLoadCompleteRef?.current)
// Should be: true
```

**Fix:** 
- Check for RLS errors in console
- Increase timeout from 10 seconds to 30 seconds
- Verify user_id is set before fetch

### **Issue #2: Preferences All Disabled** (30% likely)
**Why:** localStorage has old corrupted values

**Check:**
```javascript
JSON.parse(localStorage.getItem('notification_preferences'))
```

**Fix:**
```javascript
localStorage.removeItem('notification_preferences')
location.reload()
```

### **Issue #3: ToastContainer Not Rendering** (20% likely)
**Why:** App.tsx structure wrong or ToastWrapper not called

**Check:**
- App.tsx line 250-280: Verify `<ToastWrapper />` inside `<HashRouter>`
- Verify NotificationProvider wraps QRCodeProvider
- Check React DevTools for ToastContainer component

### **Issue #4: Subscriptions Not Connected** (10% likely)
**Why:** Network error or Supabase RLS blocking channels

**Check:**
```javascript
window.supabase.getChannels()
// Should show multiple channels with status 'SUBSCRIBED'
```

---

## 🚀 Quick Debug Command (Copy & Paste Into Console)

```javascript
// Comprehensive notification system diagnostic
(async () => {
  console.log('=== NOTIFICATION SYSTEM DIAGNOSTIC ===')
  
  // 1. Check preferences
  const prefs = JSON.parse(localStorage.getItem('notification_preferences') || '{}')
  console.log('📋 Preferences:', prefs)
  
  // 2. Check localStorage for any errors
  const allStorage = Object.keys(localStorage).filter(k => k.includes('notif'))
  console.log('💾 Storage Keys:', allStorage)
  
  // 3. Check subscriptions
  console.log('📡 Active Channels:', window.supabase.getChannels?.())
  
  // 4. Try manual notification insert
  const userId = 'GET_FROM_AUTH' // You need to set this
  if (userId && userId !== 'GET_FROM_AUTH') {
    const { data, error } = await window.supabase.from('notifications').insert({
      user_id: userId,
      title: '🔧 Diagnostic Test',
      message: 'If you see this toast, system works!',
      type: 'team_message',
      read: false,
      entity_type: 'team',
      entity_id: 'test'
    })
    console.log('🧪 Insert Test:', { data, error })
  } else {
    console.log('⚠️ Could not get userId - set it manually in console')
  }
  
  console.log('=== Check console logs for: Initial load complete, New notification received, Showing notification toast ===')
})()
```

---

## 📝 Summary: Why Toasts Aren't Showing

The notification system has **3 layers** that must all work:

1. **Database Layer** ✅ (notifications table exists)
2. **Subscription Layer** ⚠️ (must be SUBSCRIBED status)
3. **UI Layer** ⚠️ (ToastContainer must render toasts from state)

**Your toasts likely fail because:**
- One of the conditions above is failing
- Most likely: `initialLoadCompleteRef.current` is still false OR preferences are blocking
- Second most likely: ToastContainer not rendering (provider structure issue)
- Least likely: Subscriptions failed (would see errors in console)

**The fix is to:**
1. Run manual test (STEP 6) to isolate which layer fails
2. Add console.log statements to trace execution
3. Verify each condition is met before toast display

Once you identify which step fails, we can fix it immediately.

---

## 🎯 Action Plan

1. **Do STEP 1-3** in browser console RIGHT NOW
2. **Share the console output** - tell me:
   - Do you see "Initial load complete"?
   - What are your preferences showing?
   - Do you see any errors?
3. **I'll tell you EXACTLY where the problem is** and how to fix it

The system is actually well-built - it just has one broken condition that's preventing toasts from showing. Let's find and fix it! 🚀
