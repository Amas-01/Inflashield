# AI Integration (Optional)

InflaShield's core hedge engine is fully rule-based. **You do not need an AI API key to run the application.**

This document explains what AI adds, which providers are supported, and how to enable it.

---

## What AI adds

Without AI, the signal card shows:
- Scored index rankings (numbers)
- Allocation weights (percentages)
- A template sentence: *"This allocation prioritises capital preservation with moderate crypto exposure."*

With AI, the signal card adds:
- A 2–3 sentence personalised explanation of why this specific allocation makes sense for the user's currency situation
- A plain-language risk acknowledgement
- Optional: translation into the user's browser language

The numbers and weights are never changed by AI. It is a presentation layer only.

---

## Supported providers

| Provider | Free tier | Signup | Notes |
|---|---|---|---|
| **Groq** | Yes (recommended) | [console.groq.com](https://console.groq.com) | No credit card; fast; Llama 3 model |
| **Google Gemini** | Yes | [aistudio.google.com](https://aistudio.google.com) | Gemini 1.5 Flash; generous quota |
| **Ollama** | Free (local only) | [ollama.com](https://ollama.com) | No API cost; requires local install |
| **Anthropic Claude** | No | [console.anthropic.com](https://console.anthropic.com) | Highest quality; paid only |

---

## Configuration

Set these two variables in `.env.local`:

```env
AI_PROVIDER=groq          # groq | gemini | ollama | anthropic
AI_API_KEY=your_key_here  # not needed for ollama
```

For Ollama (local):

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## How the AI call works

The engine produces a `HedgeSignal` object. If AI is configured, it is passed to `src/lib/ai/explainer.ts`, which:

1. Serialises the signal to JSON
2. Sends it to the configured provider with a fixed system prompt
3. Appends the response as `signal.rationale`
4. Falls back to the template string if the AI call fails or times out (3s timeout)

The fallback ensures AI errors never break the user experience.

---

## Disabling AI

Leave `AI_PROVIDER` and `AI_API_KEY` unset. The app detects this and skips the AI call entirely. No errors, no warnings — just the template rationale.
