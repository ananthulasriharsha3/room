# Quick Start Guide

## The traceback you're seeing is NORMAL
That `CancelledError` traceback appears when you stop the server (Ctrl+C). It's harmless and doesn't mean anything is broken.

## Step-by-Step: Getting Everything Running

### 1. Start the Backend Server

Open a terminal and run:
```bash
cd backend
# Activate virtual environment (if not already active)
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Mac/Linux

# Start the server
uvicorn app.main:app --reload
```

**You should see:**
```
INFO:     Application startup...
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
```

**Keep this terminal open!** The server needs to keep running.

### 2. Start the Frontend Server

Open a NEW terminal window and run:
```bash
cd frontend
npm run dev
```

**You should see:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

**Keep this terminal open too!**

### 3. Open the App

1. Open your browser
2. Go to `http://localhost:5173` (or whatever port Vite shows)
3. You should see the login page

### 4. Test the Schedule

1. Log in (or register if you don't have an account)
2. Go to the **Schedule** page
3. Make sure you have people and tasks configured in **Admin Panel**
4. Select a year (e.g., 2025)
5. Click **"Generate Year"**
6. Wait a few seconds (generating a full year takes time)
7. You should see the schedule appear!

## Troubleshooting

### "Failed to load resource" or 422 errors
- Make sure the backend server is running (step 1)
- Check that you're sending `month: null` for yearly schedules (already fixed in code)

### "Connection refused" errors
- Backend not running? Start it with `uvicorn app.main:app --reload`
- Frontend not running? Start it with `npm run dev`

### Schedule won't generate
- Check Admin Panel - do you have at least 1 person and 1 task configured?
- Check browser console (F12) for error messages
- Check the backend terminal for error messages

### Still having issues?
Share:
1. What error message you see (exact text)
2. Whether backend terminal shows "Application startup..."
3. Whether frontend terminal shows "VITE ready"
4. What happens when you click "Generate Year"

