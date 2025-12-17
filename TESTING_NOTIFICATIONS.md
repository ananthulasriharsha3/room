# 🔔 How to Test Push Notifications

## Step 1: Check Prerequisites

### ✅ Database Migration
Make sure you've run the SQL migration in Supabase:
```sql
create table if not exists public.user_fcm_tokens (
  user_id uuid primary key references public.users(id) on delete cascade,
  fcm_token text not null unique,
  updated_at timestamptz not null default now()
);
```

### ✅ Environment Variables
Check that `frontend/.env` has all Firebase config values.

## Step 2: Start Your Dev Server

```bash
cd frontend
npm run dev
```

## Step 3: Open Browser Console

1. Open your app in the browser
2. Press `F12` or `Ctrl+Shift+I` to open Developer Tools
3. Go to the **Console** tab
4. Keep it open to see all logs

## Step 4: Log In

1. Log in to your app
2. Watch the console for these messages:

### ✅ Success Messages (What You Should See):

**If FCM is working:**
```
✅ Service Worker registered: http://localhost:5173/
✅ FCM Token: [long-token-string]
✅ FCM initialized successfully
```

**If FCM falls back to browser notifications:**
```
✅ Service Worker registered: http://localhost:5173/
FCM not available, falling back to browser notifications
✅ Browser notification permission granted
✅ Notification sent: ⚡ Today's Schedule (Wed)
```

### ❌ Error Messages (What to Fix):

**Missing VAPID Key:**
```
VAPID key not configured. Get it from Firebase Console → Project Settings → Cloud Messaging
```
→ Check your `.env` file has `VITE_FIREBASE_VAPID_KEY`

**Service Worker Error:**
```
Service Worker registration failed: [error]
```
→ Make sure you're on `localhost` or `https` (not `http` on some browsers)

**No Permission:**
```
❌ Notification permission not granted
```
→ Click "Allow" when browser asks for notification permission

## Step 5: Check Notification Permission

1. Look at the browser address bar
2. You should see a notification icon (🔔) or lock icon
3. Click it and make sure notifications are **Allowed**

Or check in browser settings:
- **Chrome**: Settings → Privacy and security → Site settings → Notifications
- **Firefox**: Settings → Privacy & Security → Permissions → Notifications

## Step 6: Verify FCM Token in Database

1. Go to Supabase Dashboard
2. Open **Table Editor**
3. Check the `user_fcm_tokens` table
4. You should see your user ID and a long FCM token

**If the table is empty:**
- FCM might not be working
- Check console for errors
- The app will fall back to browser notifications (which is fine!)

## Step 7: Test Notifications

### Option A: Wait for Automatic Notifications
- If you have a schedule set up for today or tomorrow
- Notifications should appear automatically
- Check console for: `✅ Notification sent: ⚡ Today's Schedule`

### Option B: Test Manually (See below)

## Step 8: Test Background Notifications

1. **Minimize the browser** (don't close it)
2. Wait a few minutes
3. You should still receive notifications even when the tab is in the background

**Note:** FCM works even when the browser is closed, but browser notifications only work when the browser is open.

## Quick Test Checklist

- [ ] Console shows "✅ Service Worker registered"
- [ ] Console shows either "✅ FCM Token" OR "✅ Browser notification permission granted"
- [ ] Browser notification permission is "Allowed"
- [ ] `user_fcm_tokens` table has your token (if FCM worked)
- [ ] You see a notification popup
- [ ] Notification shows the full schedule (all assignments, not just yours)

## Troubleshooting

### No notifications appearing?
1. Check browser console for errors
2. Verify notification permission is granted
3. Make sure you have a schedule with duties for today/tomorrow
4. Check that `NotificationManager` is loaded (it's in `App.jsx`)

### FCM not working?
- That's okay! Browser notifications will work instead
- FCM requires a backend server to send push notifications
- Browser notifications work great for reminders

### Notifications show but wrong content?
- Check that `formatAssignments` is working
- Verify your schedule has assignments for today/tomorrow
- Check console logs for the notification content

## What Success Looks Like

When everything is working, you'll see:

1. **Console logs:**
   ```
   ✅ Service Worker registered
   ✅ FCM Token: [token] (or browser notifications)
   ✅ Notification sent: ⚡ Today's Schedule (Wed)
   ```

2. **Browser notification:**
   - Popup appears in top-right corner (or system notification area)
   - Shows: "⚡ Today's Schedule (Wed)"
   - Body shows: "Wed 17 Dec\n\nCooking: dinesh\nCutting & Rice: srinivas\nDishes Washing: harsha"

3. **Database:**
   - `user_fcm_tokens` table has your user_id and token

That's it! 🎉

