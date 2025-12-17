# 🔔 How to Know Push Notifications Are Working

## Quick Test (Easiest Way)

1. **Start your app:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Log in** to your app

3. **Open Browser Console** (F12 → Console tab)

4. **Look for these messages:**
   ```
   ✅ Service Worker registered: http://localhost:5173/
   ✅ FCM Token: [long-token]  OR  ✅ Browser notification permission granted
   ```

5. **Click "🧪 Test Notification" button** on the Dashboard
   - If notifications are enabled, you'll see a test notification popup
   - If not enabled, click "🔔 Enable Notifications" first

6. **You should see a notification** appear in the top-right corner!

## Detailed Verification Steps

### Step 1: Check Console Logs

Open browser console (F12) and look for:

**✅ Good Signs:**
- `✅ Service Worker registered`
- `✅ FCM Token: [token]` (Firebase working)
- OR `✅ Browser notification permission granted` (Browser notifications working)
- `✅ Notification sent: ⚡ Today's Schedule`

**❌ Problems:**
- `Service Worker registration failed` → Check you're on localhost or https
- `VAPID key not configured` → Check your `.env` file
- `❌ Notification permission not granted` → Click "Allow" when browser asks

### Step 2: Check Browser Permission

1. Look at browser address bar for notification icon
2. Click it → Should say "Allowed"
3. Or go to: Browser Settings → Site Settings → Notifications → Should be "Allow"

### Step 3: Check Database (If FCM Worked)

1. Go to Supabase Dashboard
2. Open **Table Editor** → `user_fcm_tokens`
3. You should see:
   - Your `user_id`
   - A long `fcm_token` string
   - `updated_at` timestamp

**If table is empty:** That's okay! Browser notifications are still working.

### Step 4: Test Notification Button

1. Go to **Dashboard** page
2. If notifications are enabled, you'll see **"🧪 Test Notification"** button
3. Click it → Notification should appear immediately!

### Step 5: Test Automatic Notifications

1. Make sure you have a schedule with duties for **today** or **tomorrow**
2. Log in and wait a few seconds
3. You should automatically see a notification with the full schedule

## What Success Looks Like

### ✅ Console Output:
```
✅ Service Worker registered: http://localhost:5173/
✅ FCM Token: dGhpcyBpcyBhIHRlc3QgdG9rZW4...  (or browser notifications)
✅ Notification sent: ⚡ Today's Schedule (Wed)
```

### ✅ Browser Notification:
- Popup appears (top-right or system tray)
- Title: "⚡ Today's Schedule (Wed)"
- Body shows all assignments:
  ```
  Wed 17 Dec
  
  Cooking: dinesh
  Cutting & Rice: srinivas
  Dishes Washing: harsha
  ```

### ✅ Database (Optional):
- `user_fcm_tokens` table has your token (if FCM worked)

## Troubleshooting

### No notifications appearing?

1. **Check console for errors** - Look for red error messages
2. **Verify permission** - Browser Settings → Notifications → Should be "Allow"
3. **Check schedule** - Make sure you have duties for today/tomorrow
4. **Try test button** - Click "🧪 Test Notification" on Dashboard

### FCM not working?

**That's totally fine!** Browser notifications work great. FCM is just a bonus for when the browser is closed. You'll still get notifications when the browser is open.

### "Service Worker registration failed"?

- Make sure you're on `localhost` or `https://`
- Some browsers block service workers on `http://` (except localhost)
- Check console for specific error message

### "VAPID key not configured"?

- Check `frontend/.env` file exists
- Make sure `VITE_FIREBASE_VAPID_KEY` is set
- Restart dev server after adding `.env` file

## Quick Checklist

- [ ] Console shows "✅ Service Worker registered"
- [ ] Console shows "✅ FCM Token" OR "✅ Browser notification permission granted"
- [ ] Browser notification permission is "Allowed"
- [ ] "🧪 Test Notification" button works
- [ ] Notification popup appears when you click test button
- [ ] Notification shows full schedule (all assignments)

## That's It! 🎉

If you see notifications appearing when you click the test button, **everything is working!**

The app will automatically send notifications:
- **Today's schedule** - When you log in (if there are duties today)
- **Tomorrow's schedule** - When you log in (if there are duties tomorrow)
- **Periodic reminders** - Every few hours to remind you

Enjoy your push notifications! 🔔

