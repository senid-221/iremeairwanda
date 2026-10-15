# IREME Backend — Production Setup Guide

## Architecture

```
Frontend (Vercel) → Backend API (Render) → Neon PostgreSQL
```

## Quick Start

### 1. Prerequisites

You need accounts and credentials for:
- **Neon** → https://neon.tech (PostgreSQL database)
- **Google Cloud Console** → https://console.cloud.google.com (OAuth credentials)
- **Render** → https://render.com (backend hosting)
- **Vercel** → https://vercel.com (frontend hosting)

### 2. Neon PostgreSQL Setup

1. Create account at https://neon.tech
2. Create a new project
3. Copy the **connection string** (looks like):
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. This is your `DATABASE_URL`

### 3. Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth Client ID**
5. Application type: **Web application**
6. Add authorized redirect URI:
   ```
   https://your-render-backend-url.onrender.com/api/auth/google/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 4. Render Backend Deployment

1. Push this code to GitHub
2. Go to https://render.com → **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root directory**: `server`
   - **Build command**: `npm install && npx prisma generate`
   - **Start command**: `npm start`
5. Add environment variables (see below)
6. Deploy

### 5. Environment Variables

Add these in Render dashboard → **Environment**:

```env
NODE_ENV=production
PORT=10000

DATABASE_URL=postgresql://user:pass@neon.tech/dbname
FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=https://your-render-app.onrender.com/api/auth/google/callback

SESSION_SECRET=generate-a-long-random-string-here
ADMIN_BOOTSTRAP_SECRET=generate-another-random-string
```

### 6. Database Migration

After first deployment, run migration once via Render shell:

```bash
npx prisma migrate deploy
```

Or add to build command: `npm install && npx prisma migrate deploy && npx prisma generate`

### 7. Create First Admin

After deployment, create the first admin via API:

```bash
curl -X POST https://your-render-app.onrender.com/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: YOUR_ADMIN_BOOTSTRAP_SECRET" \
  -d '{"email":"admin@ireme.rw","fullName":"Admin User"}'
```

This creates a SUPER_ADMIN account. The bootstrap endpoint is disabled after first use.

### 8. Vercel Frontend Deployment

1. Go to https://vercel.com → **New Project**
2. Connect your GitHub repo
3. Root directory: `AiTech`
4. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-render-app.onrender.com
   ```
5. Deploy

## API Endpoints

### Health
- `GET /api/health` — Check server and database status

### Authentication
- `GET /api/auth/google?role=STUDENT` — Start Google OAuth flow
- `GET /api/auth/google/callback` — OAuth callback (handled automatically)
- `GET /api/auth/me` — Get current authenticated user
- `GET /api/auth/status` — Check if user is authenticated
- `POST /api/auth/logout` — Logout and destroy session

### Admin (requires ADMIN/SUPER_ADMIN role)
- `POST /api/admin/bootstrap` — One-time admin creation (requires bootstrap secret)
- `POST /api/admin/users` — Create new user
- `GET /api/admin/users` — List users with pagination
- `PATCH /api/admin/users/:id/role` — Change user role
- `PATCH /api/admin/users/:id/status` — Change user status

### Game
- `POST /api/game/match` — Save completed match
- `GET /api/game/history` — Get match history
- `GET /api/game/stats` — Get player statistics

## Security Notes

- Never commit `.env` files or secrets to Git
- `SESSION_SECRET` must be at least 32 random characters
- `ADMIN_BOOTSTRAP_SECRET` is single-use — disable after first admin created
- All sessions use HTTP-only secure cookies
- CORS is restricted to approved frontend origins only
- Rate limiting on auth endpoints (20 requests per 15 minutes)
- Google OAuth tokens are stored server-side only

## Frontend Integration

Include `js/api-client.js` in your HTML pages:

```html
<script src="js/api-client.js"></script>
<script>
  // Configure API URL (set by Vercel environment variable)
  IremeAPI.configure('https://your-render-app.onrender.com');

  // Check auth status
  IremeAPI.getAuthStatus().then(function(status) {
    if (status.authenticated) {
      console.log('User:', status.user);
    }
  });

  // Google login button
  document.getElementById('google-login').href = IremeAPI.googleLoginUrl('STUDENT');
</script>
```

## Troubleshooting

### Database connection failed
- Verify `DATABASE_URL` is correct
- Check Neon project is active
- Ensure SSL is enabled in connection string

### Google OAuth redirect mismatch
- Verify `GOOGLE_CALLBACK_URL` matches exactly in Google Cloud Console
- Must include full path: `https://domain/api/auth/google/callback`

### CORS errors
- Verify `CORS_ORIGIN` matches your Vercel URL exactly
- Include protocol: `https://` not just domain

### Session not persisting
- Ensure `SESSION_SECRET` is set
- Check cookie settings match your domain configuration
- Verify frontend sends `credentials: 'include'` in requests
