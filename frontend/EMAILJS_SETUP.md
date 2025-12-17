# EmailJS Setup - Frontend Only Email Sending

EmailJS allows you to send emails directly from the frontend using Gmail SMTP - no backend needed!

## Quick Setup (5 minutes)

### Step 1: Sign up for EmailJS (Free)

1. Go to https://www.emailjs.com/
2. Click "Sign Up" (free account available)
3. Verify your email

### Step 2: Add Gmail Service

1. Go to **Email Services** → **Add New Service**
2. Choose **Gmail**
3. Enter your Gmail credentials:
   - **Email**: `ananthulasriharsha3@gmail.com`
   - **Password**: `xnki emje kawx veah` (your Gmail App Password)
4. Click **Create Service**
5. **Copy your Service ID** (looks like `service_xxxxx`)

### Step 3: Create Email Template

1. Go to **Email Templates** → **Create New Template**
2. Template name: `Password Reset`
3. **Subject**: `Reset Your Password - Room Duty Scheduler`
4. **Content** (HTML):
   ```html
   <h2>Password Reset Request</h2>
   <p>Hello {{to_name}},</p>
   <p>We received a request to reset your password. Click the button below to create a new password:</p>
   <div style="text-align: center; margin: 30px 0;">
     <a href="{{reset_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
   </div>
   <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
   <p style="color: #667eea; font-size: 12px; word-break: break-all;">{{reset_url}}</p>
   <p style="color: #666; font-size: 14px; margin-top: 30px;">
     This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
   </p>
   ```
5. Click **Save**
6. **Copy your Template ID** (looks like `template_xxxxx`)

### Step 4: Get Your User ID (Public Key)

1. Go to **Account** → **General**
2. Find **Public Key** (User ID)
3. **Copy your User ID** (looks like `user_xxxxx`)

### Step 5: Add Environment Variables

Create or edit `frontend/.env` file:

```env
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_USER_ID=user_xxxxx
```

Replace `xxxxx` with your actual IDs from EmailJS.

### Step 6: Install Dependencies

```bash
cd frontend
npm install
```

### Step 7: Restart Your Dev Server

Stop your dev server (Ctrl+C) and restart:

```bash
npm run dev
```

## That's It! 🎉

Now when users request a password reset, emails will be sent directly from the frontend via Gmail SMTP!

## Testing

1. Go to `/forgot-password`
2. Enter your email
3. Click "Send Reset Link"
4. Check your email inbox! 📧

## Troubleshooting

### "EmailJS not configured"
- Make sure you created the `.env` file in the `frontend` folder
- Check that all three environment variables are set
- Restart your dev server after adding environment variables

### "Email not received"
- Check spam folder
- Verify your Gmail App Password is correct
- Check EmailJS dashboard for error logs

### Gmail App Password
If you need to create a new Gmail App Password:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a new app password
5. Update it in EmailJS service settings

## No Backend Needed! ✅

Everything works from the frontend - no backend service required!

