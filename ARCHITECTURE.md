# Architecture

This document describes the technical design of InflaShield — decisions made, patterns used, and the reasoning behind them.

---

## System Overview

InflaShield is a **signal-to-execution pipeline**. It is stateless by design for the Phase 1 MVP: no database, no user accounts, no persistent sessions. Every request is self-contained.

### Architecture Diagram

![InflaShield Architecture Overview](../public/inflashield-architecture.svg)

### Text Flow (Legacy)

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
│                                                             │
│   ┌───────────┐     ┌────────────┐     ┌────────────────┐  │
│   │ HedgeForm │────▶│ SignalCard │────▶│ ExecutionPanel │  │
│   └───────────┘     └────────────┘     └────────────────┘  │
└───────────────┬──────────────────────────────┬──────────────┘
                │ API Routes (Next.js)          │
     ┌──────────▼──────────┐        ┌──────────▼──────────┐
     │   /api/hedge        │        │   /api/execute      │
     │   (scoring engine)  │        │   (SoDEX submit)    │
     └──────────┬──────────┘        └──────────┬──────────┘
                │                              │
     ┌──────────▼──────────────────────────────▼──────────┐
     │                  External APIs                      │
     │                                                     │
     │  SoSoValue SSI    ExchangeRate-API    SoDEX Testnet │
     │  (index data)     (FX rates)         (order exec)  │
     └────────────────────────────────────────────────────┘
                              │ (optional)
                    ┌─────────▼──────────┐
                    │   AI Provider       │
                    │  Groq / Anthropic  │
                    │  Gemini / Ollama   │
                    └────────────────────┘
```

---

## Layer Breakdown

### 1. Presentation Layer (`src/app`, `src/components`)

Standard Next.js App Router structure. Pages are server components by default; interactive components are explicitly marked `"use client"`.

Components are kept intentionally thin — they receive props and emit events. All business logic lives in `src/lib`.

**Key components:**

| Component | Responsibility |
|---|---|
| `HedgeForm` | Collects currency, amount, risk level |
| `SignalCard` | Displays the ranked hedge recommendation |
| `IndexTable` | Shows the scored index breakdown |
| `ExecutionPanel` | Confirms and submits the SoDEX order |

### 2. API Routes (`src/app/api`)

Next.js API routes act as a thin server-side proxy. They exist for one reason: **API keys never leave the server**. The browser never sees `SOSOVALUE_API_KEY` or `SODEX_API_KEY`.

| Route | Method | Purpose |
|---|---|---|
| `/api/hedge` | `POST` | Runs full scoring pipeline, returns signal |
| `/api/execute` | `POST` | Submits allocation to SoDEX testnet |
| `/api/rates` | `GET` | Proxies ExchangeRate-API (can be called client-side safely) |

### 3. Hedge Engine (`src/lib/engine`)

The core of the application. **Intentionally AI-free** — scoring is deterministic and rule-based so the app works for anyone regardless of AI access.

#### Scoring algorithm

Each SSI index is scored 0–100 across three dimensions:

```
score = (inflationCorrelation × 0.45)
      + (riskAdjustedReturn × 0.35)
      + (liquidityScore × 0.20)
```

**Inflation correlation** is computed as the Pearson correlation between the index's 30-day USD return and the inverse of the user's currency/USD rate over the same window. A high positive correlation means the index tends to rise when the local currency weakens — the definition of a good inflation hedge.

**Risk-adjusted return** is the 30-day return divided by the standard deviation of daily returns (a simplified Sharpe ratio without the risk-free rate, acceptable for MVP).

**Liquidity score** is normalised from the index's trading volume. Lower liquidity = higher execution risk = lower score.

#### Allocation logic

Once indices are ranked, the engine applies the user's risk profile:

| Risk Level | Max single index | Index count |
|---|---|---|
| Conservative | 40% | 3 |
| Balanced | 60% | 2 |
| Aggressive | 100% | 1 |

Allocation weights within the selected set are proportional to score.

### 4. API Clients (`src/lib/api`)

Each external API has its own typed client module. No raw `fetch` calls anywhere else in the codebase.

```
src/lib/api/
├── sosovalue.ts    ← SSI index list, index detail, performance history
├── sodex.ts        ← order placement, portfolio read
└── exchangeRate.ts ← spot rates, historical rates
```

Each client:
- Exports typed functions (no `any`)
- Handles HTTP errors and maps them to application-level errors
- Is independently testable with a mock fetch

### 5. AI Layer (`src/lib/ai`) — Optional

The AI layer is a **progressive enhancement**. If `AI_API_KEY` is not set, the hedge engine returns a template-based text explanation. If it is set, the AI layer receives the scoring output and generates a personalized, context-aware explanation.

The prompt is designed so the AI output is **additive** — it never changes the numbers, only explains them.

Supported providers (configured via `AI_PROVIDER` env var):

| Provider | Free tier | Key required | Notes |
|---|---|---|---|
| Groq | Yes — generous | Yes | Fastest free option; Llama 3 |
| Google Gemini | Yes | Yes | Via Google AI Studio |
| Anthropic Claude | No free tier | Yes | Highest quality reasoning |
| Ollama | Free (local) | No | Run locally; no API cost |

See [docs/AI.md](AI.md) for integration details.

---

## Data Flow — Full Request

```
1. User submits HedgeForm
   └── { currency: "TRY", amount: 50000, risk: "balanced" }

2. POST /api/hedge
   ├── Fetch spot rate: TRY/USD from ExchangeRate-API
   ├── Compute USD equivalent: 50000 / rate
   ├── Fetch SSI indices from SoSoValue (top 10 by TVL)
   ├── For each index:
   │   ├── Fetch 30-day performance history
   │   ├── Score: inflation correlation + risk-adjusted return + liquidity
   │   └── Rank
   ├── Apply risk profile → select indices + weights
   ├── (Optional) Send to AI → enrich with plain-English rationale
   └── Return HedgeSignal

3. Client renders SignalCard
   └── Shows: ranked indices, weights, rationale, total USD exposure

4. User clicks Execute
   └── POST /api/execute
       ├── Build SoDEX order payload from signal
       ├── Submit to SoDEX Testnet API
       └── Return order confirmation
```

---

## Error Handling Strategy

All errors are surfaced as typed `AppError` objects:

```typescript
type AppError = {
  code: 'RATE_UNAVAILABLE' | 'INDEX_FETCH_FAILED' | 'EXECUTION_FAILED' | 'AI_UNAVAILABLE'
  message: string
  retryable: boolean
}
```

- `RATE_UNAVAILABLE` — FX API down; fallback to cached rate (stored in memory for 1 hour)
- `INDEX_FETCH_FAILED` — SoSoValue API error; surface clearly to user with retry option
- `EXECUTION_FAILED` — SoDEX order rejected; show rejection reason from API
- `AI_UNAVAILABLE` — AI provider down or key missing; fall back to template explanation silently

The application never shows a raw stack trace or API error to the user.

---

## Environment Variables

See `.env.example` for the full list. Variables are validated at startup using a Zod schema in `src/config/env.ts` — the app will refuse to start with a clear error message if a required variable is missing, rather than crashing later at runtime.

---

## Key Design Decisions

### Why Next.js and not a plain HTML/JS app?

API key security. SoSoValue and SoDEX keys must not be exposed in client-side JavaScript. Next.js API routes give us a simple server boundary without running a separate backend service.

### Why no database?

Phase 1 scope. A database would require a hosting decision, a migration strategy, and auth. None of those are needed to demonstrate the core value proposition. Phase 2 adds persistence.

### Why is AI optional?

The judging criteria list AI as a *bonus*, not a requirement. More importantly, making AI mandatory would exclude contributors and users who cannot afford a paid API key. The rule-based scoring engine is the defensible core of the product; AI is a UX enhancement.

### Why ExchangeRate-API and not an on-chain oracle?

Speed and simplicity for Phase 1. On-chain oracles (Chainlink, Band) add a web3 dependency that complicates the demo. ExchangeRate-API supports 170+ currencies, has a free tier, and is reliable. The architecture is designed so the exchange rate client can be swapped for an oracle in Phase 2 without touching the engine.

### Why TypeScript?

Type safety across the API boundary (client → API route → external API) is non-trivial. TypeScript catches shape mismatches at compile time rather than at demo time. Every external API response is validated with Zod before it enters the engine.

---

## Security Considerations

- All API keys are server-side only (enforced by Next.js environment variable prefix convention)
- User input (currency, amount, risk) is validated and sanitised before use
- SoDEX orders are submitted to testnet in Phase 1 — no real funds at risk
- No user data is stored or logged

---

## Testing

Unit tests cover the hedge engine (`src/lib/engine`) and API clients (`src/lib/api`). No end-to-end tests in Phase 1.

```bash
npm run test        # unit tests (Jest)
npm run type-check  # TypeScript compiler check
npm run lint        # ESLint
```
