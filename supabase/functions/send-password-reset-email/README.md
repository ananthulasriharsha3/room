# Send Password Reset Email - Supabase Edge Function

This Edge Function sends password reset emails using Gmail SMTP.

## Setup Instructions

### Option 1: Using EmailJS (Recommended for Edge Functions)

Since Supabase Edge Functions have limitations with direct SMTP, we recommend using EmailJS which supports SMTP relay.

1. **Sign up for EmailJS**:
   - Go to https://www.emailjs.com/
   - Create a free account
   - Create an email service (choose Gmail)
   - Add your Gmail SMTP credentials:
     - SMTP Server: `smtp.gmail.com`
     - SMTP Port: `587`
     - Username: `ananthulasriharsha3@gmail.com`
     - Password: `xnki emje kawx veah` (your Gmail app password)
     - Enable TLS

2. **Create an Email Template**:
   - In EmailJS dashboard, create a template
   - Use variables: `{{to_email}}`, `{{to_name}}`, `{{reset_url}}`, `{{message_html}}`
   - Save the template ID

3. **Set Environment Variables in Supabase**:
   ```bash
   supabase secrets set EMAILJS_SERVICE_ID=your_service_id
   supabase secrets set EMAILJS_TEMPLATE_ID=your_template_id
   supabase secrets set EMAILJS_USER_ID=your_user_id
   ```

4. **Deploy the Function**:
   ```bash
   supabase functions deploy send-password-reset-email
   ```

### Option 2: Using Gmail SMTP Directly (Requires Backend)

For direct Gmail SMTP, you'll need a backend service (Node.js/Python) because:
- Edge Functions have limitations with raw SMTP/TLS
- Gmail requires OAuth2 or App Passwords
- TLS/SSL handling is complex in Deno Edge Functions

**Recommended**: Create a simple Node.js backend service that uses `nodemailer`:

```javascript
// backend/email-service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ananthulasriharsha3@gmail.com',
    pass: 'xnki emje kawx veah'
  }
});

async function sendPasswordResetEmail(to, resetUrl, displayName) {
  const mailOptions = {
    from: 'ananthulasriharsha3@gmail.com',
    to: to,
    subject: 'Reset Your Password - Room Duty Scheduler',
    html: `...` // Your email HTML
  };
  
  return await transporter.sendMail(mailOptions);
}
```

Then call this backend service from your Edge Function.

### Option 3: Use Gmail API (OAuth2)

For production, consider using Gmail API with OAuth2, but this is more complex to set up.

## Quick Setup with EmailJS

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login and link project:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```

3. Set EmailJS secrets:
   ```bash
   supabase secrets set EMAILJS_SERVICE_ID=service_xxxxx
   supabase secrets set EMAILJS_TEMPLATE_ID=template_xxxxx
   supabase secrets set EMAILJS_USER_ID=user_xxxxx
   ```

4. Deploy:
   ```bash
   supabase functions deploy send-password-reset-email
   ```

## Testing

Test the function:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-password-reset-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "resetUrl": "https://yourapp.com/reset-password?token=test123",
    "displayName": "Test User"
  }'
```

## Gmail App Password

Make sure you're using a Gmail App Password, not your regular password:
1. Go to Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password
4. Use that password in your SMTP configuration
