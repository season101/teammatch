# Typography

Three families, all from Google Fonts, loaded with `next/font` in `frontend/src/app/layout.tsx`.

| Family | Role | Tailwind | Weights |
|---|---|---|---|
| **Fraunces** (variable, with italics) | Display: hero, screen titles, role titles, celebrations | `font-display` | 800–900, high optical size |
| **Geist** | Everything else: body, labels, buttons, key caps | `font-sans` (default) | 400, 500, 600, 700 |
| **Geist Mono** | Data: match %, counts, profile strength figure | `font-mono` | 500 |

## Type roles

| Role | Font | Size / weight | Tailwind | Where |
|---|---|---|---|---|
| Hero | Fraunces | clamp(44px, 8vw, 96px) / 900 | `font-display text-hero font-black` | Landing only |
| Title | Fraunces | 32–44px / 800 | `font-display text-3xl` to `text-4xl font-extrabold` | Screen titles, "It's a Team!" |
| Role title | Fraunces | 28px phone, 32px desktop / 800 | `font-display text-[28px] md:text-3xl font-extrabold` | On the role card cover |
| Heading | Geist | 20–24px / 600 | `text-xl` to `text-2xl font-semibold` | Section headings, modal titles |
| Body | Geist | 16px / 400 | `text-base` | Default |
| Small | Geist | 14px / 400–500 | `text-sm` | Helper text, list metadata, chips |
| Label | Geist | 12px / 600, uppercase, +0.06em | `text-xs font-semibold uppercase tracking-wide` | Section labels ("Optional", "Why you fit") |
| Data | Geist Mono | 12–16px / 500 | `font-mono` | "86% match", "3 of 5", "40%" |

Scale steps: 12 · 14 · 16 · 18 · 20 · 24 · 32 · 44 · 64. Don't add sizes between them. Line height is 1.1 for display and 1.5 for body.

## Rules
- **Italic marks one word.** A headline can set one word in Fraunces italic for emphasis ("Find your *team*."). Never more than one per headline.
- **Sentence case** for everything except names.
- **Numbers that get compared use mono**, with `tabular-nums` in tables and lists.
- **Key caps use Geist, not Geist Mono.** Geist Mono has no arrow glyphs, so ← → ↑ ↓ fall back to a tiny system font.
- **Phone onboarding titles** are first-person sentence starts: "My major is", "I'm good at".
- **Line length**: keep running text under about 65 characters (`max-w-prose`).
- **Headings balance**: use `text-balance` on multi-line titles.
