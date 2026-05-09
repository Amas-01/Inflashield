# Roadmap

InflaShield is being built in three phases, each corresponding to a buildathon wave. This document defines scope, success criteria, and known limitations for each phase.

---

## Phase 1 — Core Agent + Demo
**Status: In progress | Target: Wave 1 deadline**

### Goal
Demonstrate the complete signal-to-execution flow end-to-end. A judge should be able to:
1. Enter any currency and savings amount
2. Receive a scored, ranked hedge recommendation
3. Execute it on SoDEX testnet
4. See a confirmation receipt

All within a single browser session, no wallet connection required.

### Deliverables

- [x] Project scaffold, README, architecture documentation
- [ ] `HedgeForm` — currency selector (170+ currencies), amount input, risk level picker
- [ ] ExchangeRate-API client — live FX rate fetch
- [ ] SoSoValue SSI client — index list, performance history
- [ ] Hedge engine — correlation scoring, risk-adjusted ranking, allocation logic
- [ ] `SignalCard` — visual output of recommendation
- [ ] SoDEX testnet client — order submission, confirmation
- [ ] `ExecutionPanel` — user-facing execution flow
- [ ] Deployed demo (Vercel)
- [ ] Demo video

### Success criteria

- Given any supported fiat currency, the engine returns a ranked list of hedge indices
- The top recommendation changes meaningfully between a conservative and aggressive risk profile
- A simulated order is accepted by SoDEX testnet and a confirmation is shown
- The application works without an AI key configured

### Known limitations in Phase 1

- Testnet only — no real funds are moved
- Scoring uses 30-day performance window; longer windows would improve accuracy
- No persistent portfolio tracking
- Exchange rate data is polled, not streamed
- AI explanation is optional; template fallback is less personalised

---

## Phase 2 — Automation + Intelligence
**Status: Planned | Target: Wave 2**

### Goal
Move from a one-shot tool to a persistent agent. Users can subscribe to weekly rebalance alerts and track their portfolio over time.

### Planned features

- **Weekly rebalance agent** — cron job re-scores indices every Monday, sends alert if recommended allocation has shifted by more than 10%
- **Telegram / email notifications** — alert delivery via Telegram Bot API or Resend
- **Portfolio tracking** — connect a wallet address to track current on-chain allocation versus recommended
- **Backtesting view** — show how the recommended allocation would have performed over the past 90 days against holding local currency
- **SoSoValue Terminal integration** — pull macro news headlines and include in AI context for richer signals
- **Improved AI scoring** — multi-factor prompt with news sentiment, on-chain flow data, and macro indicators
- **Persistent user preferences** — save risk profile and currency; no account required (browser storage)

### Dependencies

- SoDEX mainnet access (requires Buildathon whitelist or Silver rank)
- A notification delivery service (Telegram Bot API is free)
- A simple key-value store for portfolio snapshots (Redis or Upstash free tier)

---

## Phase 3 — Scale + Mainnet
**Status: Planned | Target: Wave 3 / Post-buildathon**

### Goal
A production-grade, multi-user platform with real fund execution and a mobile-first experience.

### Planned features

- **Mainnet SoDEX execution** — real order submission with on-chain confirmation
- **Wallet connect** — WalletConnect / RainbowKit integration for signing
- **Multi-chain support** — wherever SoDEX expands, InflaShield follows
- **Strategy marketplace** — community-published hedge strategies; browse, fork, and execute
- **Mobile-first UI** — Progressive Web App (PWA) for low-bandwidth markets
- **Advanced analytics** — Sharpe ratio, max drawdown, inflation-adjusted returns dashboard
- **Multi-language support** — UI localisation for top inflation-affected markets (Spanish, Portuguese, Turkish, Arabic, Yoruba)

### Long-term vision

InflaShield's end state is a **one-person treasury desk for the unbanked**. A user in any country, on a phone, with no bank account, no broker, and no financial education, should be able to protect their savings from inflation using on-chain indices — in three taps.

---

## What Will Not Be Built

To keep scope honest, these are explicitly out of scope for all three phases:

- Leveraged or short positions (this is a hedge tool, not a trading terminal)
- Yield farming or liquidity provision strategies (different risk profile)
- Tax reporting features (jurisdiction-specific; out of scope)
- Fiat on/off-ramp (handled by third-party services)
- CEX integrations (on-chain only, by design)
