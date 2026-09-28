# ADR 0006: PWA first, native mobile later

- Status: Accepted
- Date: 2026-09-27

## Context

Swiping feels best on a phone, but we have three sprints and nobody on the team has shipped a native app. Students use both laptops and phones. App store review and device builds would eat sprint time.

## Decision

- Build one responsive Next.js app and make it an installable PWA (Serwist: manifest, service worker, offline shell).
- Design the API so a native client can use it without changes: allauth `app` client with session tokens, no browser-only assumptions in REST, WS schema documented, shared generated client in `packages/api-client`.
- An Expo (React Native) app is the top item in the future backlog, not in the three sprints.

## Consequences

- One UI codebase for desktop and phone. Every member works in the same frontend.
- Installable on Android and iOS home screens, works offline for the shell.
- Web push is limited on iOS, so live events rely on the open WS connection for now.
- Swipe gestures need care on mobile browsers (touch events, no accidental page scroll).
- When we do Expo, auth, API and types are ready; only the UI is new.

## Alternatives considered

- **Expo from day one alongside web:** two UIs to build and test, too much for three sprints.
- **React Native Web for both:** one codebase, but weaker web tooling, SSR and SEO, and a steeper learning curve.
- **Capacitor wrapper:** possible later if we want store listings without rewriting; no need now.
