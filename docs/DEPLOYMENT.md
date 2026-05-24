# InflaShield Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [GitHub Setup](#github-setup)
3. [Database Configuration](#database-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [Environment Variables](#environment-variables)
6. [Local Development Setup](#local-development-setup)
7. [Database Initialization](#database-initialization)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before pushing to GitHub and deploying to Vercel, ensure:

- [ ] All TypeScript errors resolved (run `npx tsc --noEmit`)
- [ ] All tests passing (if applicable)
- [ ] Environment variables documented
- [ ] Database schema ready
- [ ] `.env.local` created and configured
- [ ] Node.js 18+ installed locally
- [ ] PostgreSQL configured (local or remote)
- [ ] Git repository initialized

---

## GitHub Setup

### 1. Initialize and Push Repository

```bash
# If not already done
cd ~/Documents/BUILDs/inflashield
git init
git add .
git commit -m "Initial commit: InflaShield Phase 2 complete"

# Create repo on GitHub and add remote
git remote add origin https://github.com/yourusername/inflashield.git
git branch -M main
git push -u origin main
```

### 2. Configure GitHub Secrets (for Vercel Integration)

Go to **GitHub Settings → Secrets and variables → Actions** and add:

- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID  
- `VERCEL_PROJECT_ID`: Your Vercel project ID

These are needed for CI/CD deployments. Find them in Vercel dashboard.

---

## Database Configuration

### ⚠️ CRITICAL: Vercel Does NOT Run Databases

**Important:** Vercel ONLY runs your Next.js application. It does NOT automatically manage or run PostgreSQL database servers.

You have three options:

### Option A: Vercel Postgres (Recommended for beginners)

**Pros:**
- Managed by Vercel
- Auto-scaling
- No separate setup
- Included in Vercel pricing

**Setup:**
1. Go to Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Connect to your InflaShield project
4. Vercel auto-creates `DATABASE_URL` in environment

### Option B: Self-Hosted PostgreSQL on AWS/Digital Ocean

**Pros:**
- Full control
- Cost-effective at scale
- Separate from Vercel

**Setup:**
1. Create PostgreSQL instance on AWS RDS, DigitalOcean, or Linode
2. Record the connection string
3. Add to Vercel as environment variable:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/inflashield
   ```

### Option C: Local PostgreSQL with SSH Tunnel

**Pros:**
- Development-friendly
- Direct control
- Testing in production-like environment

**Setup:**
1. Keep PostgreSQL running on your machine
2. Use ngrok or similar to expose it
3. Connect via tunnel URL

---

## Vercel Deployment

### 1. Connect Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select **Import Project**
3. Connect your GitHub repository
4. Select **inflashield** repository
5. Click **Import**

### 2. Configure Project Settings

**Root Directory:**
```
./
```

**Build Settings:**
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 3. Add Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
NODE_ENV=production
DATABASE_URL=<from Vercel Postgres or your setup>
NEXTAUTH_SECRET=<random 32+ char string>
NEXTAUTH_URL=https://yourdomain.vercel.app
NEXT_PUBLIC_SODEX_API_KEY=<your SODEX API key>
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=<your Telegram bot token>
NEXT_PUBLIC_WAGMI_PROJECT_ID=<your WalletConnect project ID>
TELEGRAM_CHAT_ID=<your chat ID for notifications>
```

**How to generate NEXTAUTH_SECRET:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### 4. Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Test at `https://yourdomain.vercel.app`

---

## Environment Variables

### Development (.env.local)

```env
# Next.js
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/inflashield

# Authentication
NEXTAUTH_SECRET=your-secret-here-min-32-chars

# External APIs
NEXT_PUBLIC_SODEX_API_KEY=your_sodex_key
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_telegram_token
NEXT_PUBLIC_WAGMI_PROJECT_ID=your_walletconnect_id

# Notifications
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### Production (Vercel)

All same variables above, but set in Vercel Dashboard with production values.

**Never commit `.env.local` to version control!**

---

## Local Development Setup

### 1. Prerequisites

```bash
# Check versions
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
psql --version  # Should be 12 or higher

# Install PostgreSQL if needed
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql postgresql-contrib

# Windows: https://www.postgresql.org/download/windows/
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/yourusername/inflashield.git
cd inflashield

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

### 3. Database Setup

```bash
# Start PostgreSQL service
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql

# Windows: Use pgAdmin or Services app

# Create database
createdb inflashield

# Run migrations
npm run db:push  # Using Drizzle

# Or with Drizzle Studio (visual)
npm run db:studio
```

### 4. Start Development Server

```bash
npm run dev

# Visit http://localhost:3000
```

---

## Database Initialization

### 1. Create Schemas

The application uses two PostgreSQL schemas:

- **app schema**: Regular application tables (users, signals, orders, wallets)
- **audit schema**: Append-only audit log (read-only role)

### 2. Run Drizzle Migrations

```bash
# Generate migrations from schema definitions
npm run db:generate

# Apply migrations to database
npm run db:push

# Or in production (careful!)
npm run db:migrate:prod
```

### 3. Drizzle Studio (GUI for database management)

```bash
# Visual database browser/editor
npm run db:studio

# Opens at http://local.drizzle.studio
```

---

## Post-Deployment Verification

### 1. Check Application Health

```bash
curl https://yourdomain.vercel.app/api/health
# Should return 200 OK
```

### 2. Test Authentication

1. Visit `https://yourdomain.vercel.app/register`
2. Create test account with valid email
3. Login with credentials
4. Verify session cookie set

### 3. Test Database Connectivity

Create a hedge signal via API:

```bash
curl -X POST https://yourdomain.vercel.app/api/signals \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "amount": 1000,
    "riskLevel": "balanced"
  }'
```

### 4. Verify Audit Logging

Check audit trail is being recorded:

```bash
# From database
SELECT COUNT(*) FROM audit.audit_log;
```

---

## Build Optimization

### 1. Build Locally Before Pushing

```bash
# Full build test
npm run build

# Test production server locally
npm run start
```

### 2. Check Build Size

```bash
# See bundle analysis
npm run analyze
```

### 3. Optimize Images

All images in `/public` are automatically optimized by Next.js.

---

## Monitoring & Debugging

### 1. Vercel Logs

```bash
# Stream logs from Vercel CLI
vercel logs inflashield

# Or via Dashboard: Settings → Logs
```

### 2. Database Logs

```bash
# View PostgreSQL logs
# PostgreSQL data directory
tail -f /var/log/postgresql/postgresql.log

# Or using psql
SELECT * FROM pg_stat_activity;
```

### 3. Application Monitoring

Enable Vercel Analytics:
1. Vercel Dashboard → Project Settings → Analytics
2. Enable "Web Analytics"
3. View at https://vercel.com/dashboard

---

## Troubleshooting

### Issue: "Cannot find module..." errors at build time

**Solution:**
```bash
# Clear build cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Issue: DATABASE_URL not recognized

**Solution:**
1. Verify environment variable is set in Vercel
2. Check format: `postgresql://user:password@host:port/database`
3. Redeploy after updating

### Issue: Authentication not working

**Solution:**
- Verify `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches deployment domain
- Clear browser cookies
- Check `/api/auth/signin` endpoint

### Issue: Migrations fail at deploy time

**Solution:**
```bash
# Run migrations locally first
npm run db:push

# Then deploy
git add . && git commit -m "db migrations" && git push
```

### Issue: Timeout errors on first request

**Solution:**
- This is normal on Vercel's free tier (cold start)
- Upgrade to Pro tier for faster cold starts
- Or use background jobs for long operations

### Issue: Images not loading

**Solution:**
- Verify images are in `/public` directory
- Check file paths use forward slashes (`/images/logo.png`)
- Images should be optimized automatically

---

## Performance Best Practices

### 1. Database Connection Pooling

Already configured via `@vercel/postgres` with automatic pooling.

### 2. API Route Caching

```typescript
// Cache API responses
export const revalidate = 60; // 60 seconds
```

### 3. Static Generation

Pre-render pages at build time when possible:

```typescript
export const revalidate = 3600; // Regenerate every hour
```

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is cryptographically secure
- [ ] Database credentials never in source code
- [ ] Environment variables not logged
- [ ] CORS properly configured
- [ ] HTTPS enforced (Vercel default)
- [ ] Audit logging enabled
- [ ] Admin functions protected behind auth
- [ ] API rate limiting considered

---

## Rollback Procedure

If deployment fails:

```bash
# Vercel automatically keeps previous deployments
# Go to Vercel Dashboard → Deployments → Click previous working version

# Or via CLI
vercel rollback
```

---

## Support Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs
- **NextAuth.js:** https://next-auth.js.org
- **Drizzle ORM:** https://orm.drizzle.team
- **PostgreSQL:** https://www.postgresql.org/docs
- **GitHub:** https://github.com/yourusername/inflashield

---

## Summary: What Gets Deployed Where

| Component | Where | Who Manages |
|-----------|-------|-------------|
| Next.js App | Vercel | Vercel (auto) |
| Static Files | Vercel CDN | Vercel (auto) |
| API Routes | Vercel Serverless | Vercel (auto) |
| React Components | Browser (client-side) | Browser |
| **PostgreSQL Database** | **Vercel Postgres OR Remote Server** | **YOU** (must configure) |
| Environment Variables | Vercel Dashboard | YOU (must add) |

**KEY POINT:** You must explicitly configure your database. Vercel will NOT automatically create or run a database for you. Choose option A, B, or C from the Database Configuration section above.

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Status:** Production Ready ✅
