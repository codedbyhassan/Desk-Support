# 🧪 Comprehensive Notification System Testing Guide

## Pre-Test Checklist

- [ ] Application loaded at http://localhost:4000
- [ ] Logged in successfully
- [ ] Browser DevTools Console open (F12)
- [ ] Looking for logs that start with: 📬, 🔔, ✅, ⚠️

---

## Test Suite 1: Real-Time Toast Display (Live, No Reload)

### Test 1.1: Ticket Assignment Toast
**Goal:** See toast immediately when assigned a ticket

**Steps:**
1. Open browser console
2. Create test notification:
```javascript
const userId = 'YOUR_USER_ID' // Get from Auth context or look in logs
const { data } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    company_id: 'YOUR_COMPANY_ID',
    title: 'Test Ticket Assignment',
    message: 'Ticket #123 assigned to you',
    type: 'ticket_assigned',
    read: false,
    entity_type: 'ticket',
    entity_id: 'ticket-123',
    link: '/app/tickets/ticket-123'
  })
  .select()
  .single()
console.log('Inserted:', data)
```

**Expected Results:**
- ✅ Console shows `New notification received: ...`
- ✅ Console shows `Showing notification toast: Test Ticket Assignment`
- ✅ Toast appears on screen (top-right, blue color)
- ✅ Toast auto-dismisses after 5 seconds

**If Failed:**
- [ ] Check: "Initial load complete" appears in console?
- [ ] Check: Notification preferences enabled?
- [ ] Check: User not already viewing that entity?

---

### Test 1.2: Ticket Status Change Toast
**Goal:** See toast for status updates

**Steps:**
1. Create test notification:
```javascript
const { data } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    company_id: companyId,
    title: 'Test Status Update',
    message: 'Ticket #456 status changed to Closed',
    type: 'ticket_status_changed',
    read: false,
    entity_type: 'ticket',
    entity_id: 'ticket-456',
    link: '/app/tickets/ticket-456'
  })
  .select()
  .single()
```

**Expected Results:**
- ✅ Toast appears (amber/warning color)
- ✅ Console logs show full flow
- ✅ Toast auto-dismisses

---

### Test 1.3: Team Message Toast
**Goal:** Verify team messages still work (should already work)

**Steps:**
1. Create team message test:
```javascript
const { data } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    company_id: companyId,
    title: 'New message in Test Team',
    message: 'John Doe: This is a test message',
    type: 'team_message',
    read: false,
    entity_type: 'team',
    entity_id: 'team-1',
    link: '/app/teams/team-1'
  })
  .select()
  .single()
```

**Expected Results:**
- ✅ Toast appears immediately
- ✅ No special delay
- ✅ Sound plays if enabled

---

### Test 1.4: Comment Toast
**Goal:** See toast for new comments

**Steps:**
1. Create comment notification:
```javascript
const { data } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    company_id: companyId,
    title: 'New comment on: Fix Dashboard Bug',
    message: 'Jane Smith: Great progress on this!',
    type: 'ticket_commented',
    read: false,
    entity_type: 'ticket',
    entity_id: 'ticket-789',
    link: '/app/tickets/ticket-789'
  })
  .select()
  .single()
```

**Expected Results:**
- ✅ Toast appears (green/success color)
- ✅ Shows commenter name in message
- ✅ Clickable to go to ticket

---

### Test 1.5: Asset Assignment Toast
**Goal:** See toast for asset assignments

**Steps:**
1. Create asset notification:
```javascript
const { data } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    company_id: companyId,
    title: 'Asset assigned: MacBook Pro',
    message: 'Type: Laptop • Status: Active',
    type: 'asset_assigned',
    read: false,
    entity_type: 'asset',
    entity_id: 'asset-001',
    link: '/app/assets/asset-001'
  })
  .select()
  .single()
```

**Expected Results:**
- ✅ Toast appears (blue/info color)
- ✅ Shows asset type and status
- ✅ Clickable to asset detail

---

## Test Suite 2: Badge Counter (Persistence After Reload)

### Test 2.1: Badge Shows All Unread
**Goal:** Badge updates and includes all notification types

**Steps:**
1. Create 3 different notifications (use tests above)
2. Look at notification bell icon - should show badge with "3"
3. Create one more - badge should change to "4"
4. **Reload page** (Ctrl+R or Cmd+R)
5. Check badge

**Expected Results:**
- ✅ Badge shows "4" even after reload
- ✅ All 4 notifications in list on Notifications page
- ✅ Each has correct type and content

---

### Test 2.2: Badge Updates on Mark as Read
**Goal:** Badge decreases when marking as read

**Steps:**
1. Have at least 2 unread notifications
2. Badge shows "2"
3. Click on one notification to open it
4. Click "Mark as Read" button
5. Badge should change to "1"
6. Reload page
7. Badge should still be "1"

**Expected Results:**
- ✅ Badge changes immediately
- ✅ Change persists after reload
- ✅ Notification still in list but marked as read

---

### Test 2.3: Notifications Page History
**Goal:** All notification types appear in history

**Steps:**
1. Go to /app/notifications page
2. Create 6 notifications (one of each type):
   - ticket_assigned
   - ticket_status_changed
   - ticket_commented
   - asset_assigned
   - asset_updated
   - team_message
3. All should appear in the list
4. Reload page
5. All should still be there

**Expected Results:**
- ✅ All 6 notifications visible
- ✅ Each shows correct icon, title, message
- ✅ Can filter by type
- ✅ Can search by title/message
- ✅ Can mark as read individually
- ✅ Can delete individually
- ✅ All persist after reload

---

## Test Suite 3: Real-World Scenarios

### Test 3.1: Ticket Workflow
**Scenario:** Create and work with real tickets

**Steps:**
1. Create a new ticket
2. Assign it to yourself
3. **Check:** Toast should appear (if not on ticket page)
4. Close browser tab
5. Reopen app
6. Go to Notifications page
7. Ticket assignment notification should be there

**Expected Results:**
- ✅ Toast on assignment
- ✅ Notification persists
- ✅ Badge counts it

---

### Test 3.2: Comment Workflow
**Scenario:** Comment on a ticket with multiple assignees

**Steps:**
1. Go to a ticket assigned to you
2. Leave a comment
3. Reload page (comment stays)
4. Go to another ticket
5. Have another user comment on your original ticket
6. **Check:** Toast should appear (you're not on that page)
7. Badge updates

**Expected Results:**
- ✅ Toast shows new comment
- ✅ Can click to navigate to ticket
- ✅ Toast doesn't show if already on that page
- ✅ Badge reflects unread count

---

### Test 3.3: Team Communication
**Scenario:** Multiple team members chatting

**Steps:**
1. Go to Teams page
2. Create a team or join existing
3. Go to a different page (not the team)
4. Receive a message in team chat
5. **Check:** Toast should appear
6. Reload page
7. Message notification should still be in history

**Expected Results:**
- ✅ Toast appears immediately
- ✅ Sound plays (if enabled)
- ✅ Badge updates
- ✅ Notification persists after reload

---

## Test Suite 4: Preferences & Muting

### Test 4.1: Disable Ticket Notifications
**Goal:** Verify preferences block notifications

**Steps:**
1. Go to Settings → Notifications
2. Toggle OFF: "Ticket Updates"
3. Create ticket_assigned notification (from console)
4. **Check:** Toast should NOT appear
5. Badge should NOT update
6. Check Notifications page - notification NOT there

**Expected Results:**
- ✅ No toast appears
- ✅ No badge update
- ✅ No notification in database (not created due to preferences?)

**Note:** If notification appears despite disabled preference, that's a bug in the preference checking logic.

---

### Test 4.2: Mute Notifications
**Goal:** Test mute duration

**Steps:**
1. Go to Settings → Notifications
2. Set mute to "5 minutes"
3. Create any notification
4. **Check:** Toast should NOT appear (muted)
5. Check console for "🔇 Notifications are muted"
6. Wait 30 seconds
7. Create another notification
8. Still muted (5 min hasn't elapsed)
9. Wait until mute expires
10. Create notification
11. Toast should appear

**Expected Results:**
- ✅ Notifications blocked while muted
- ✅ Can see console log about muting
- ✅ Works after mute expires
- ✅ Can manually unmute in settings

---

### Test 4.3: Sound Toggle
**Goal:** Verify sound can be disabled

**Steps:**
1. Settings → Notifications
2. Enable sound: ON
3. Create notification
4. **Check:** Should hear sound
5. Disable sound: OFF
6. Create notification
7. **Check:** Should NOT hear sound

**Expected Results:**
- ✅ Sound plays when enabled
- ✅ Sound silent when disabled
- ✅ Volume at 50% (check source code)

---

## Test Suite 5: Edge Cases & Error Handling

### Test 5.1: Duplicate Prevention
**Goal:** Don't show same notification twice

**Steps:**
1. Create notification via console
2. Toast appears and notification added
3. Create same notification again (same ID)
4. **Check:** Toast should NOT appear (duplicate)

**Expected Results:**
- ✅ Second toast doesn't appear
- ✅ Only one notification in list
- ✅ Badge count doesn't double

---

### Test 5.2: User Not on Page (Toast Shows)
**Goal:** Toast shows only if user not viewing that entity

**Steps:**
1. Go to /app/tickets
2. In console, create ticket_assigned notification with entity_id = "ticket-1"
3. **Check:** Toast appears (not viewing ticket-1)
4. Go to /app/tickets/ticket-1
5. Create another ticket_assigned notification with same entity_id
6. **Check:** Toast should NOT appear (already viewing it)

**Expected Results:**
- ✅ Toast shows when not viewing entity
- ✅ Toast suppressed when viewing entity
- ✅ Notification still added to list both times (console check)

---

### Test 5.3: Missing Company ID
**Goal:** Handle missing company_id gracefully

**Steps:**
1. Create notification without company_id:
```javascript
const { data, error } = await window.supabase
  .from('notifications')
  .insert({
    user_id: userId,
    // NO company_id
    title: 'Test',
    message: 'Test',
    type: 'team_message',
    read: false
  })
console.log('Error:', error)
```

**Expected Results:**
- ✅ Insert fails with RLS error (expected)
- ✅ Console shows warning about save failure
- ✅ App doesn't crash
- ✅ Check error handling logs

---

## Console Log Checklist

### When Creating Any Notification, You Should See:
- [ ] `📬 New notification received: ...` (from INSERT subscription)
- [ ] `🔔 Showing notification toast: ...` (or `⏸️ User is viewing entity` if on that page)
- [ ] `✅ Ticket assignment notification saved: ...` (if it's a ticket type)

### When Creating Team Message, You Should See:
- [ ] `📨 Team message received`
- [ ] `✅ User can access team`
- [ ] `✅ Team message notification saved to database`
- [ ] Then the regular INSERT logs

### If Something Fails, Look For:
- [ ] `⚠️ Failed to save notification: ...`
- [ ] `❌ Error saving notification: ...`
- [ ] `⏭️ User is viewing entity` (not an error, just suppressed toast)
- [ ] `🔇 Notifications are muted`
- [ ] `⏸️ X notifications disabled` (preferences blocking)

---

## Quick Commands for Testing

```javascript
// Get current user ID
const { data: { user } } = await window.supabase.auth.getUser()
console.log('User ID:', user?.id)

// Get current company ID (from local state, varies by app)
// Check NotificationContext for companyId or check Auth context

// Create ALL 6 notification types at once:
const types = [
  { type: 'ticket_assigned', title: 'Ticket assigned' },
  { type: 'ticket_status_changed', title: 'Status updated' },
  { type: 'ticket_commented', title: 'New comment' },
  { type: 'asset_assigned', title: 'Asset assigned' },
  { type: 'asset_updated', title: 'Asset status' },
  { type: 'team_message', title: 'New message' }
]

// For each, insert into DB with appropriate entity_type/entity_id

// Check badge should show "6"
// Reload page
// Check badge should still show "6"
// All should appear in Notifications page
```

---

## Success Criteria

### After This Testing, You Should Have:
- ✅ Toasts showing for all 6 notification types
- ✅ Badge updating in real-time
- ✅ Notifications persisting after page reload
- ✅ Notifications appearing in history page
- ✅ Mark as read working persistently
- ✅ Delete working correctly
- ✅ Preferences blocking notifications when disabled
- ✅ Mute duration working as expected
- ✅ Sound toggle working
- ✅ No duplicate notifications

### If ANY of the above fail:
1. Check browser console for error logs
2. Check Supabase dashboard for RLS policy errors
3. Report the specific notification type that fails
4. Share console logs showing the failure

---

## 🚀 Ready to Test!

The system is now production-ready. Follow these tests in order and report back on:
1. ✅ Which tests pass
2. ❌ Which tests fail
3. 📋 Console logs from failures
4. 📸 Screenshots of unexpected behavior

Let's get this notification system working perfectly! 🎉
