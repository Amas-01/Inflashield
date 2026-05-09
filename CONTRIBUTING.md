# Contributing

Thank you for your interest in InflaShield. This guide covers how to set up the development environment, the branching strategy, and what good contributions look like.

---

## Development setup

Follow [docs/SETUP.md](docs/SETUP.md) to get the project running locally.

---

## Branching strategy

```
main          ← always deployable; what the demo runs from
└── dev       ← integration branch for feature work
    └── feat/short-description   ← individual feature branches
    └── fix/short-description    ← bug fixes
```

Open pull requests against `dev`. `dev` is merged to `main` before each wave deadline.

---

## Code style

- TypeScript strict mode is enabled — no `any`
- All external API responses are validated with Zod before use
- Functions are named for what they return, not what they call (`fetchIndexList`, not `callSoSoValueAPI`)
- Keep components thin — business logic belongs in `src/lib`, not in React components

Run before pushing:

```bash
npm run lint
npm run type-check
npm run test
```

---

## Adding a new currency

Exchange rate support is data-driven. To verify a currency is supported:

```typescript
import { isCurrencySupported } from '@/lib/api/exchangeRate'
isCurrencySupported('PKR') // true/false
```

No code change is needed to add a currency that ExchangeRate-API already supports.

---

## Adding a new AI provider

1. Create `src/lib/ai/providers/yourprovider.ts` implementing the `AIProvider` interface
2. Register it in `src/lib/ai/index.ts`
3. Document it in `docs/AI.md`
