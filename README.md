# WordReference Translate

WordReference Translate is a Manifest V3 browser extension for Edge, Chrome, and Firefox that let the user access [WordReference.com](https://wordreference.com) dictionaries conveniently from the extension popup window.

## Features

- Popup search UI with theme support, audio playback, source links, and interactive re-translation.
- In-page translation by context menu, `Alt` + selection, floating icon, or custom keyboard shortcut.
- Auto-detect source language and inverted-language fallback when the direct lookup has no result.
- Local-only settings and UI state, including changelog visibility and optional page-integration permissions.
- Localized UI for `en`, `es`, `fr`, and `it`.
- Fully local popup search suggestions for `en`, `es`, `fr`, and `it`.

## Tech stack

- WXT
- TypeScript
- React for popup and options
- Plain TypeScript for background, parsing, messaging, and content-script logic
- Vitest for automated tests

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment variables

All local-only metadata lives in `.env`. Keep `.env` untracked and commit only `.env.example`.

- `WXT_FIREFOX_ADDON_ID`: required for Firefox MV3 development and builds
- `WXT_FIREFOX_STRICT_MIN_VERSION`: optional Firefox minimum version, defaults to `115.0`
- `WRT_EXTENSION_AUTHOR_NAME`: shown in the options credits area when present
- `WRT_EXTENSION_AUTHOR_EMAIL`: used for the contact section and Firefox manifest `author`
- `WRT_EXTENSION_AUTHOR_WEBSITE`: shown in credits when present
- `WRT_EXTENSION_REPO_URL`: shown in the options contact section when present
- `WRT_CHANGELOG_ITEMS`: `||`-separated changelog lines. If empty, the popup changelog and action badge stay hidden

## Scripts

- `npm run dev`: Edge development build
- `npm run dev:chrome`: Chrome development build
- `npm run dev:firefox`: Firefox MV3 development build
- `npm run build`: Edge production build
- `npm run build:chrome`: Chrome production build
- `npm run build:firefox`: Firefox MV3 production build
- `npm run zip`: Edge zip package
- `npm run zip:chrome`: Chrome zip package
- `npm run zip:firefox`: Firefox MV3 zip package
- `npm run build:suggestions`: regenerate the bundled local popup suggestion datasets from `wordfreq`
- `npm run lint`: run ESLint
- `npm run lint:fix`: apply safe ESLint fixes
- `npm run typecheck`: run TypeScript checks
- `npm run test`: run Vitest with coverage

## Build outputs

- Edge: `.output/edge-mv3`
- Chrome: `.output/chrome-mv3`
- Firefox: `.output/firefox-mv3`

## Sideloading

### Edge

1. Run `npm run build`.
2. Open `edge://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select `.output/edge-mv3`.

### Chrome

1. Run `npm run build:chrome`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select `.output/chrome-mv3`.

### Firefox

1. Make sure `.env` contains `WXT_FIREFOX_ADDON_ID`.
2. Run `npm run build:firefox`.
3. Open `about:debugging#/runtime/this-firefox`.
4. Choose Load Temporary Add-on.
5. Select `manifest.json` inside `.output/firefox-mv3`.

## Architecture

- `src/entrypoints`: WXT entrypoints for popup, options, background, and content scripts
- `src/core`: translation fetch flow, auto-detect strategy, and HTML parsing
- `src/shared`: settings, permissions, build metadata, messaging, and HTML normalization helpers
- `src/ui`: popup and options UI sections plus shared styles
- `public/_locales`: localization files
- `tests`: parser, translation, storage, changelog, and helper tests

## Permissions and privacy

Required permissions:

- `storage`
- `contextMenus`
- `scripting`
- `https://www.wordreference.com/*`

Optional host permissions:

- `http://*/*`
- `https://*/*`

Runtime network access is limited to:

- `https://www.wordreference.com/*` for lookups and media
- explicit user-clicked links opened from extension UI

The extension does not include:

- login or authentication
- payments or gated features
- remote database calls
- remotely executed code

## Data attribution

Popup word suggestions are bundled static datasets generated offline from [`wordfreq`](https://github.com/rspeer/wordfreq). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) before regenerating or redistributing those files.

## Contributing

See `CONTRIBUTING.md` for setup, architecture notes, and PR expectations.

## License

MIT
