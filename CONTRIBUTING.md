# Contributing

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Firefox contributors also need a local `WXT_FIREFOX_ADDON_ID` in `.env` because `storage.sync` requires a stable add-on ID in Firefox MV3 development.

## Required checks before a PR

Run all of these before opening a pull request:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:chrome`
- `npm run build:firefox`

## Architecture overview

- `src/entrypoints/background.ts`: service worker entrypoint for translation requests, badge state, context menu state, and content-script registration
- `src/entrypoints/selection.content`: in-page orchestration, popup bridge, and DOM integration for selection-based translation
- `src/core`: WordReference lookup strategy, auto-detect candidates, and parser logic
- `src/shared`: storage, permissions, build metadata, constants, i18n access, message contracts, and reusable HTML normalization helpers
- `src/ui/popup`: popup shell and popup-specific React state
- `src/ui/options`: options screen split into section components

## Contribution guidelines

- Preserve popup and in-page translation behavior unless a user-facing change is intentional.
- Prefer plain TypeScript modules in shared/runtime code. Keep React scoped to popup and options UI.
- Keep network access limited to WordReference and explicit user navigation.
- Do not reintroduce login, payment, premium gating, remote database logic, or remotely hosted runtime code.
- Keep env-backed metadata generic in committed files. Real local values belong in `.env`, not in source.
- Avoid browser-specific forks unless a real platform difference requires one.

## Formatting and linting

- ESLint is the primary code-quality gate: `npm run lint`
- Prettier is kept for formatting consistency
- Keep comments short and only where they improve readability

## Tests and fixtures

- Add focused fixtures for parser changes instead of growing one large captured page fixture.
- Prefer unit tests for shared helpers and strategy code when a full browser integration test is unnecessary.
