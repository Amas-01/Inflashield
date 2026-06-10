# Vercel Deployment Guide

## Database Setup Options

### Option 1: Vercel Postgres (Recommended)

**Easiest setup for Vercel deployment:**

1. **In Vercel Dashboard:**
   - Go to your project dashboard
   - Click "Storage" → "Create Database" → "Postgres"
   - Vercel automatically creates `DATABASE_URL` environment variable

2. **Environment Variables:**
   Vercel auto-populates these when you add Postgres:
   ```
   DATABASE_URL=postgresql://...
   POSTGRES_URL=postgresql://...
   POSTGRES_PRISMA_URL=postgresql://... (for migrations)
   ```

3. **Deploy:**
   - Push your code to GitHub
   - Vercel builds and connects to database automatically
   - No manual migration needed - tables created on first API call

### Option 2: Neon Database (Free Alternative)

**If you want a free hosted database:**

1. **Sign up at [neon.tech](https://neon.tech)**
2. **Create database and get connection string**
3. **Add to Vercel environment variables:**
   ```
   DATABASE_URL=postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/neondb
   ```

### Option 3: Render Database

**Another free hosted option:**

1. **Sign up at [render.com](https://render.com)**
2. **Create PostgreSQL database**
3. **Get internal connection string**
4. **Add to Vercel:**
   ```
   DATABASE_URL=postgresql://user:pass@hostname:5432/database
   ```

## Local Development Database Fix

### Problem
The error you saw: `PostgreSQL server is not running or not accessible` occurs because the build script tries to create a local database during Vercel build.

### Solution Applied
I've updated `scripts/setup-db.js` to:
- ✅ Skip database setup in Vercel/CI environments
- ✅ Skip setup for cloud databases (automatically detected)
- ✅ Only run local setup for development

### If You Want Local PostgreSQL

Install PostgreSQL locally:

**On macOS:**
```bash
brew install postgresql
brew services start postgresql
createdb inflashield
```

**On Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb inflashield
```

**On Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/)
- Or use Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`

## Quick Deploy to Vercel

### 1. Connect GitHub Repository
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Vercel auto-detects Next.js

### 2. Add Database (Pick One)
- **Option A**: In Vercel dashboard → Storage → Create Database → Postgres
- **Option B**: Create Neon database → Add `DATABASE_URL` to environment variables

### 3. Add Environment Variables
In Vercel project settings → Environment Variables:
```
SOSOVALUE_API_KEY=your-api-key
SODEX_API_KEY=your-api-key  
EXCHANGERATE_API_KEY=your-api-key
AI_PROVIDER=groq
AI_API_KEY=your-groq-key
AUTH_SECRET=your-secret (generate with: openssl rand -base64 32)
```

### 4. Deploy
- Push code to GitHub main branch
- Vercel automatically builds and deploys
- Database tables created automatically on first API call

## Troubleshooting

### Build Fails with Database Error
- ✅ Fixed: Updated setup script to skip in CI
- If still failing, check no `DATABASE_URL` in build environment

### Runtime Database Errors
- Check `DATABASE_URL` is set in Vercel environment variables
- Verify database is accessible from Vercel (most managed databases are)
- Check connection string format

### Local Development Issues
- Install PostgreSQL locally
- Or set `DATABASE_URL` to a cloud database for development too
- The app will work without database (core UI functionality)

## Environment Variables Reference

### Required for Core Function
```bash
# API Keys (required)
SOSOVALUE_API_KEY=SOSO-xxxxx
SODEX_API_KEY=your-key
EXCHANGERATE_API_KEY=xxxxx

# Environment
SODEX_ENV=testnet  # or mainnet
```

### Optional (Enhanced Features)
```bash
# AI-enhanced explanations  
AI_PROVIDER=groq
AI_API_KEY=gsk_xxxxx

# Authentication (for user features)
AUTH_SECRET=your-secret
DATABASE_URL=postgresql://...

# Telegram notifications
TELEGRAM_BOT_TOKEN=xxxxx
```

### Auto-Set by Vercel
```bash
VERCEL=1
VERCEL_URL=your-app.vercel.app
# Plus DATABASE_URL if using Vercel Postgres
```

---

## Summary

- ✅ **Database errors fixed** - setup script now skips in Vercel
- ✅ **TypeScript errors fixed** - audit records now have required fields  
- ✅ **Runtime configured** - using Node.js runtime instead of Edge
- 🚀 **Ready to deploy** - push to GitHub, add database, deploy!

The app will work without database for core functionality (hedge signal generation). Database is only needed for user accounts and audit logging.