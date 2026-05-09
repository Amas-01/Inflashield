# Setup Guide

Step-by-step instructions for running InflaShield locally and deploying to Vercel.

---

## Prerequisites

- **Node.js 18 or later** — [Download](https://nodejs.org)
- **npm** (comes with Node) or **yarn** (`npm install -g yarn`)
- A **SoSoValue account** — [Register](https://sosovalue.com)
- A **SoDEX account** — [Register](https://sodex.com)
- *(Optional)* A **Groq account** for free AI features — [Register](https://console.groq.com)

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/inflashield.git
cd inflashield
npm install
```

---

## Step 2 — Get your API keys

### SoSoValue API key

1. Register at [https://sosovalue.com](https://sosovalue.com)
2. Go to your profile → Developer → API Access
3. Follow the steps in the [SoSoValue API docs](https://sosovalue-1.gitbook.io/sosovalue-api-doc) to register your key
4. **For the buildathon:** Apply for higher rate limits at [https://forms.gle/2nuJT2qNbUQsyyZy8](https://forms.gle/2nuJT2qNbUQsyyZy8)

### SoDEX Testnet API key

1. Register at [https://sodex.com](https://sodex.com)
2. Testnet access does **not** require a separate application — you can start using it immediately
3. Generate your testnet API key from the SoDEX developer dashboard
4. **For mainnet access:** Apply via the buildathon form above

### ExchangeRate-API key

1. Register for a free account at [https://www.exchangerate-api.com](https://www.exchangerate-api.com)
2. Your API key is shown immediately on the dashboard — no approval needed
3. Free tier: 1,500 requests/month (sufficient for development and demo)

### Groq API key (optional — for AI features)

1. Register at [https://console.groq.com](https://console.groq.com)
2. Go to API Keys → Create API Key
3. Free tier is generous with no credit card required

---

## Step 3 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Required
SOSOVALUE_API_KEY=your_sosovalue_key_here
SODEX_API_KEY=your_sodex_key_here
EXCHANGERATE_API_KEY=your_exchangerate_key_here

# Optional — AI-enhanced explanations
AI_PROVIDER=groq
AI_API_KEY=your_groq_key_here

# Environment — leave as testnet until mainnet access is granted
SODEX_ENV=testnet
```

> **Never commit `.env.local` to Git.** It is already listed in `.gitignore`.

---

## Step 4 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You should see the InflaShield interface. Try entering any currency (e.g. `TRY`, `ARS`, `NGN`, `EUR`) and a savings amount to test the full flow.

---

## Step 5 — Verify the integration

Run the built-in connectivity check:

```bash
npm run check:apis
```

This script calls each configured API and reports whether the connection is working:

```
✓ SoSoValue API — connected (24 indices available)
✓ SoDEX Testnet — connected
✓ ExchangeRate-API — connected (USD → NGN: 1550.00)
✓ Groq AI — connected (llama3-8b-8192)
```

---

## Step 6 — Deploy to Vercel (for demo)

1. Push your code to a public GitHub repository
2. Go to [https://vercel.com](https://vercel.com) and import the repository
3. In the Vercel project settings, add each environment variable from your `.env.local`
4. Deploy — Vercel will build and host your app for free

Your demo URL will be `https://YOUR_PROJECT_NAME.vercel.app`.

---

## Troubleshooting

### `Error: SOSOVALUE_API_KEY is not set`

The app validates all required environment variables at startup. Make sure `.env.local` exists and contains the key.

### SoSoValue returns 401

Your API key is invalid or expired. Re-check the key in the SoSoValue developer dashboard.

### SoDEX returns 403

You are trying to use mainnet with a testnet key (or vice versa). Check that `SODEX_ENV` matches the key type you generated.

### ExchangeRate-API returns 429

You have exceeded the free tier limit (1,500 req/month). Either wait for the monthly reset or switch to the `frankfurter.app` fallback (see [docs/API.md](API.md)).

### AI features are not working

Check that `AI_PROVIDER` and `AI_API_KEY` are both set. Run `npm run check:apis` to see the specific error. If you don't want AI features, leave both variables unset — the app will use template-based explanations instead.
