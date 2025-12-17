# Mobile Push Notifications Setup Guide

## ✅ What's Been Fixed

1. **Service Worker** - Properly handles background messages for system notifications
2. **Manifest.json** - Created for PWA support
3. **System Notifications** - All notifications now use Service Worker (appears in Android notification panel)
4. **Removed alert()** - All alert() calls replaced with console logs
5. **FCM Integration** - Properly configured for background push notifications

## How It Works Now

### System Notifications (Mobile)
- Notifications are sent via Service Worker using `self.registration.showNotification()`
- These appear in the **Android notification panel**, not as website alerts
- Works even when the app is closed or browser is minimized

### Service Worker Flow
1. Main app sends notification request to Service Worker via `postMessage()`
2. Service Worker receives message and calls `self.registration.showNotification()`
3. System shows notification in Android notification panel
4. User taps notification → App opens

## Testing on Mobile

### Step 1: Deploy to HTTPS
- Mobile notifications require HTTPS (or localhost)
- Your Vercel deployment (`steve-rouge.vercel.app`) is already HTTPS ✅

### Step 2: Open on Mobile
1. Open Chrome on Android
2. Navigate to `https://steve-rouge.vercel.app`
3. Grant notification permission when prompted

### Step 3: Test Notification
1. Click "🧪 Test Notification" button
2. **Check Android notification panel** (swipe down from top)
3. Notification should appear there, NOT as a website alert

### Step 4: Test Background
1. Grant permission
2. Close the browser or minimize it
3. Wait for scheduled notification (every 3 hours)
4. Notification should appear in notification panel even when browser is closed

## Important Notes

### FCM Push Notifications (Future Enhancement)
Currently, notifications are sent via Service Worker from the frontend. For true push notifications that work when the app is completely closed, you need:

1. **Backend Server** with Firebase Admin SDK
2. **Send FCM messages** with this payload structure:
```json
{
  "notification": {
    "title": "⚡ Today's Schedule",
    "body": "Your schedule for today",
    "icon": "/favicon.svg"
  },
  "data": {
    "url": "/schedule",
    "tag": "duty-today-2024-01-17"
  }
}
```

3. **Service Worker** will automatically receive these via `onBackgroundMessage()` and show them in the notification panel

### Current Implementation
- ✅ System notifications via Service Worker (works on mobile)
- ✅ Appears in Android notification panel
- ✅ Works when browser is minimized
- ⚠️ Requires browser to be open for scheduled notifications (every 3 hours)
- ⚠️ For notifications when browser is completely closed, you need FCM push from backend

## Verification Checklist

- [ ] Service Worker registered successfully (check console)
- [ ] FCM token generated (check console)
- [ ] Notification permission granted
- [ ] Test notification appears in Android notification panel
- [ ] Notification opens app when tapped
- [ ] Manifest.json is loaded (check Network tab)

## Troubleshooting

### "Failed to create notification"
- Check Service Worker is registered
- Check notification permission is granted
- Check console for errors

### Notifications not appearing on mobile
- Ensure you're on HTTPS (not HTTP)
- Check Android notification settings for Chrome
- Check Chrome site settings → Notifications → Allow
- Clear browser cache and reload

### Service Worker not registering
- Check you're on HTTPS or localhost
- Check browser console for errors
- Try unregistering old service workers:
  ```javascript
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister())
  })
  ```

## Next Steps (Optional - For True Push When Closed)

To enable notifications when browser is completely closed, set up:

1. **Backend API** (Node.js/Express with Firebase Admin SDK)
2. **Endpoint** to send FCM messages: `POST /api/send-notification`
3. **Update frontend** to call this endpoint instead of Service Worker directly

This requires backend infrastructure, but current implementation works great for notifications when browser is open/minimized!

