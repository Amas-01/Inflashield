# Quick Start: Deploy InflaShield to Vercel in 5 Minutes

## Only 5 Essential Steps

### Step 1: Push to GitHub (2 minutes)

```bash
cd ~/Documents/BUILDs/inflashield
git add .
git commit -m "Production ready - TypeScript errors fixed"
git push origin main
```

### Step 2: Create Vercel Account & Connect Repo

1. Go to https://vercel.com/signup
2. Connect GitHub account
3. Import `inflashield` repository
4. Click **Deploy**

Vercel will automatically detect Next.js and build.

### Step 3: Set Database (Choose ONE)

**Easiest Option: Vercel Postgres**

In Vercel Dashboard:
1. Click **Storage** → **Create Database** → **Postgres**
2. Vercel auto-creates `DATABASE_URL` environment variable
3. **DONE** - your database is live

### Step 4: Generate Secret and Set Required Env Vars

Get in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

In Vercel Dashboard → Environment Variables, add:
- `NEXTAUTH_SECRET` = (paste generated secret)
- `NEXTAUTH_URL` = https://your-vercel-url.vercel.app
- `NEXT_PUBLIC_SODEX_API_KEY` = your SODEX key
- `NEXT_PUBLIC_WAGMI_PROJECT_ID` = your WalletConnect project ID
- `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` = your Telegram bot token

### Step 5: Trigger Re-deployment

Vercel Dashboard → Deployments → **Redeploy**

---

## Done! 🚀

Your app is now live at `https://your-project.vercel.app`

---

## First-Time Testing Checklist

- [ ] App loads without errors at deployment URL
- [ ] Register page works
- [ ] Create new account
- [ ] Login works
- [ ] Audit logs are recording
- [ ] API endpoints respond

---

## What If Something Goes Wrong?

### Build fails with "Cannot find module"
→ Run `npm install` locally, commit, push

### Database connection errors
→ Check DATABASE_URL is set in Vercel Environment Variables

### Login doesn't work
→ Verify NEXTAUTH_URL matches your Vercel domain (no trailing slash)

### Cold Start Delay (Normal)
→ First request takes ~2 seconds on free tier (upgrade to Pro for <500ms)

---

## Next Steps After Deployment

1. **Set up custom domain** → Vercel Project Settings → Domains
2. **Enable Analytics** → Vercel Project Settings → Analytics
3. **Configure CI/CD** → Auto-deploy on push via GitHub Actions
4. **Monitor** → Check Vercel logs and database health regularly

---

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive documentation.
