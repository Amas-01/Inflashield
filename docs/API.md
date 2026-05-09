# API Reference

This document covers every external API used in InflaShield — what it does, which endpoints we call, what the request and response shapes look like, and where to get access.

---

## Table of Contents

1. [SoSoValue SSI API](#1-sosovalue-ssi-api)
2. [SoDEX API](#2-sodex-api)
3. [ExchangeRate-API](#3-exchangerate-api)
4. [AI Providers (Optional)](#4-ai-providers-optional)

---

## 1. SoSoValue SSI API

**Purpose:** Fetch on-chain index data — composition, performance history, and metadata for SSI indices.

**Docs:** https://sosovalue-1.gitbook.io/sosovalue-api-doc

**Registration:**
1. Create an account at https://sosovalue.com
2. Navigate to API Documentation and register for API access
3. For higher rate limits during the buildathon, apply at: https://forms.gle/2nuJT2qNbUQsyyZy8

**Base URL:** `https://api.sosovalue.com` *(verify in official docs — may be versioned)*

**Authentication:** Bearer token via `Authorization: Bearer YOUR_API_KEY` header

---

### Endpoints Used

#### GET `/v1/indexes` — List all SSI indices

Fetches the full list of available on-chain indices with summary data.

**Request:**

```http
GET /v1/indexes
Authorization: Bearer YOUR_SOSOVALUE_API_KEY
```

**Response (example shape):**

```json
{
  "data": [
    {
      "id": "ssi-defi-top10",
      "name": "DeFi Top 10 Index",
      "symbol": "SDEFI10",
      "tvl": 12450000,
      "components": ["ETH", "UNI", "AAVE", "LINK"],
      "return_30d": 0.082,
      "return_7d": 0.031,
      "inception_date": "2023-01-15"
    }
  ],
  "total": 24,
  "page": 1
}
```

**Used in:** `src/lib/api/sosovalue.ts` → `fetchIndexList()`

---

#### GET `/v1/indexes/:id/performance` — Index performance history

Returns daily return data for a specific index over a given window.

**Request:**

```http
GET /v1/indexes/ssi-defi-top10/performance?window=30d
Authorization: Bearer YOUR_SOSOVALUE_API_KEY
```

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `window` | string | `30d` | Time window: `7d`, `30d`, `90d` |
| `currency` | string | `USD` | Return denomination |

**Response:**

```json
{
  "id": "ssi-defi-top10",
  "window": "30d",
  "data_points": [
    { "date": "2025-04-01", "return": 0.021, "nav": 102.10 },
    { "date": "2025-04-02", "return": -0.008, "nav": 101.29 }
  ]
}
```

**Used in:** `src/lib/api/sosovalue.ts` → `fetchIndexPerformance(id, window)`

---

#### GET `/v1/indexes/:id` — Single index detail

Full metadata for one index including component weights and risk metrics.

**Request:**

```http
GET /v1/indexes/ssi-defi-top10
Authorization: Bearer YOUR_SOSOVALUE_API_KEY
```

**Response:**

```json
{
  "id": "ssi-defi-top10",
  "name": "DeFi Top 10 Index",
  "description": "Equal-weighted index of the top 10 DeFi protocols by TVL",
  "tvl": 12450000,
  "components": [
    { "symbol": "ETH", "weight": 0.30 },
    { "symbol": "UNI", "weight": 0.15 }
  ],
  "risk_metrics": {
    "volatility_30d": 0.042,
    "max_drawdown_90d": -0.18,
    "sharpe_30d": 1.24
  }
}
```

**Used in:** `src/lib/api/sosovalue.ts` → `fetchIndexDetail(id)`

---

### Rate Limits

| Tier | Requests / minute | Requests / day |
|---|---|---|
| Free | 10 | 500 |
| Buildathon (apply via form) | 60 | 10,000 |

Implement exponential back-off on `429` responses. See `src/lib/api/sosovalue.ts` for the retry wrapper.

---

## 2. SoDEX API

**Purpose:** Submit index buy orders and read portfolio state on SoDEX's on-chain orderbook.

**Docs:** https://sodex.com/documentation/api/api

**Registration:**
1. Register at https://sodex.com
2. For testnet: no additional steps — testnet API is open access
3. For mainnet: requires Silver rank in SoPoints OR Buildathon whitelist (apply at https://forms.gle/2nuJT2qNbUQsyyZy8)

**Note on mainnet API keys:** Generating a mainnet key requires depositing a supported token. Check supported chains and minimum deposit amounts in the SoDEX documentation before applying.

**Testnet base URL:** `https://testnet-api.sodex.com` *(verify in official docs)*

**Mainnet base URL:** `https://api.sodex.com`

**Authentication:** `X-API-Key: YOUR_SODEX_API_KEY` header

---

### Endpoints Used

#### POST `/v1/orders` — Place an index order

Submits a buy order for a given SSI index.

**Request:**

```http
POST /v1/orders
X-API-Key: YOUR_SODEX_API_KEY
Content-Type: application/json
```

```json
{
  "index_id": "ssi-defi-top10",
  "side": "buy",
  "amount_usd": 500.00,
  "order_type": "market",
  "slippage_tolerance": 0.01
}
```

**Request fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `index_id` | string | Yes | SSI index identifier |
| `side` | `buy` \| `sell` | Yes | Order direction |
| `amount_usd` | number | Yes | Order size in USD |
| `order_type` | `market` \| `limit` | Yes | Execution type |
| `slippage_tolerance` | number | No | Max slippage (default 0.005 = 0.5%) |
| `limit_price` | number | Only for limit | Limit price in USD |

**Response:**

```json
{
  "order_id": "ord_7f3a2b1c",
  "status": "submitted",
  "index_id": "ssi-defi-top10",
  "amount_usd": 500.00,
  "estimated_fill_price": 102.14,
  "created_at": "2025-05-09T14:23:01Z",
  "tx_hash": "0xabc123..."
}
```

**Used in:** `src/lib/api/sodex.ts` → `submitOrder(payload)`

---

#### GET `/v1/orders/:id` — Order status

Polls an order for fill confirmation.

**Request:**

```http
GET /v1/orders/ord_7f3a2b1c
X-API-Key: YOUR_SODEX_API_KEY
```

**Response:**

```json
{
  "order_id": "ord_7f3a2b1c",
  "status": "filled",
  "filled_at": "2025-05-09T14:23:08Z",
  "fill_price": 102.11,
  "fill_amount_usd": 500.00,
  "fee_usd": 0.75
}
```

**Status values:** `submitted` → `pending` → `filled` | `rejected` | `cancelled`

**Used in:** `src/lib/api/sodex.ts` → `pollOrderStatus(orderId)`

---

#### GET `/v1/portfolio` — Read current portfolio

Returns the caller's current on-chain index positions.

**Request:**

```http
GET /v1/portfolio
X-API-Key: YOUR_SODEX_API_KEY
```

**Response:**

```json
{
  "total_value_usd": 1540.22,
  "positions": [
    {
      "index_id": "ssi-defi-top10",
      "units": 15.04,
      "value_usd": 1540.22,
      "pnl_usd": 40.22,
      "pnl_pct": 0.027
    }
  ]
}
```

**Used in:** `src/lib/api/sodex.ts` → `fetchPortfolio()` *(Phase 2)*

---

### Error Codes

| Code | Meaning | Handling |
|---|---|---|
| `400` | Malformed request | Log and surface to user |
| `401` | Invalid API key | Fail startup validation |
| `403` | Mainnet access denied | Redirect to testnet or show upgrade prompt |
| `429` | Rate limited | Retry with exponential back-off |
| `503` | SoDEX unavailable | Surface error; do not retry automatically |

---

## 3. ExchangeRate-API

**Purpose:** Live and historical foreign exchange rates for 170+ currencies.

**Docs:** https://www.exchangerate-api.com/docs/overview

**Registration:** https://www.exchangerate-api.com — free account gives 1,500 requests/month. No credit card required.

**Base URL:** `https://v6.exchangerate-api.com/v6/YOUR_API_KEY`

**Authentication:** API key embedded in URL path (not a header).

> **Note:** The free tier supports spot rates only. Historical rates require a paid plan. In Phase 1, InflaShield uses spot rates only. For historical correlation analysis in Phase 2, a free alternative is `frankfurter.app` which serves ECB historical data for EUR-pairs, or the free tier of `fixer.io`.

---

### Endpoints Used

#### GET `/latest/:base` — Latest exchange rates

Returns current rates for all currencies relative to a base.

**Request:**

```http
GET https://v6.exchangerate-api.com/v6/YOUR_KEY/latest/USD
```

**Response:**

```json
{
  "result": "success",
  "base_code": "USD",
  "conversion_rates": {
    "USD": 1.0,
    "EUR": 0.921,
    "GBP": 0.788,
    "NGN": 1550.0,
    "TRY": 32.41,
    "ARS": 890.0,
    "BRL": 5.08
  }
}
```

**Used in:** `src/lib/api/exchangeRate.ts` → `fetchSpotRate(currency)`

---

#### GET `/pair/:from/:to` — Specific pair

Faster than fetching all rates when you only need one pair.

**Request:**

```http
GET https://v6.exchangerate-api.com/v6/YOUR_KEY/pair/NGN/USD
```

**Response:**

```json
{
  "result": "success",
  "base_code": "NGN",
  "target_code": "USD",
  "conversion_rate": 0.000645
}
```

**Used in:** `src/lib/api/exchangeRate.ts` → `fetchPairRate(from, to)`

---

### Alternative free FX APIs

If ExchangeRate-API is unavailable or the free tier is exhausted:

| API | Free tier | Historical | Notes |
|---|---|---|---|
| `frankfurter.app` | Unlimited | Yes (ECB data) | EUR-based pairs only |
| Open Exchange Rates | 1,000 req/month | No (paid) | USD base only on free tier |
| Currency Beacon | 5,000 req/month | Limited | More generous free tier |

---

## 4. AI Providers (Optional)

The AI layer enriches the hedge signal with a plain-English explanation. **It is not required.** If no AI is configured, InflaShield uses a template-based fallback that produces a shorter but still useful rationale.

Configure via environment variables:

```env
AI_API_KEY=your_key
AI_PROVIDER=groq   # groq | anthropic | gemini | ollama
```

---

### Groq (Recommended free option)

**Docs:** https://console.groq.com/docs

**Free tier:** Yes — generous rate limits, no credit card required for basic use

**Registration:** https://console.groq.com

**Base URL:** `https://api.groq.com/openai/v1`

**Authentication:** `Authorization: Bearer YOUR_GROQ_API_KEY`

**Model used:** `llama3-8b-8192` (fast, free)

**Example request:**

```typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: HEDGE_EXPLAINER_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(hedgeSignal) }
    ],
    max_tokens: 300,
    temperature: 0.3,
  }),
})
```

---

### Google Gemini

**Docs:** https://ai.google.dev/gemini-api/docs

**Free tier:** Yes — via Google AI Studio

**Registration:** https://aistudio.google.com

**Model used:** `gemini-1.5-flash` (free, fast)

---

### Anthropic Claude

**Docs:** https://docs.anthropic.com

**Free tier:** No — requires a paid API subscription

**Model used:** `claude-haiku-4-5-20251001` (cheapest per-token if using paid tier)

---

### Ollama (Local — no API cost)

**Docs:** https://ollama.com/docs

**Cost:** Free — runs entirely on your machine

**Setup:**

```bash
# Install Ollama (Mac/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Ollama runs a local server at http://localhost:11434
# InflaShield's AI client will detect OLLAMA_BASE_URL and use it
```

**Environment config:**

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

### The AI Prompt

InflaShield sends the AI provider the scored signal object and asks for a user-facing explanation. The prompt is defined in `src/lib/ai/prompt.ts`:

```typescript
export const HEDGE_EXPLAINER_SYSTEM_PROMPT = `
You are a financial assistant helping everyday people protect their savings from inflation.
You will be given a structured JSON object describing a recommended on-chain index allocation.
Your job is to write a 2-3 sentence plain-English explanation that:
1. Explains WHY this allocation protects against the user's specific currency weakening
2. Describes the RISK level honestly
3. Uses NO financial jargon

Do not invent numbers. Only reference values present in the JSON you receive.
Respond in the user's language if 'locale' is provided; otherwise respond in English.
`
```

The AI output is appended to the signal card as `rationale`. The numbers and allocation weights are always computed by the rule-based engine — AI never overrides them.
