# LinkWeaver Development Guide

## Requirements

- Node.js 22.13.0 or newer is recommended.
- npm 11 or newer.
- Obsidian for manual testing.

This workspace currently uses Node `22.12.0`. Latest lint-related dependencies may warn that they prefer Node `22.13.0` or newer, but the current build and test suite pass on `22.12.0`.

## Setup

```powershell
npm install
npm run build
npm test
```

## Development Build

```powershell
npm run dev
```

This starts esbuild in watch mode and writes `main.js`.

## Production Build

```powershell
npm run build
```

The build runs TypeScript type-checking first, then bundles `src/main.ts`.

## Manual Obsidian Test Vault

A sibling test vault was created at:

```text
C:\Users\toonc\Documents\linkweaver-test-vault
```

Link this plugin into the test vault from an elevated Windows terminal:

```powershell
New-Item -ItemType Directory -Force "C:\Users\toonc\Documents\linkweaver-test-vault\.obsidian\plugins"
cmd /c mklink /D "C:\Users\toonc\Documents\linkweaver-test-vault\.obsidian\plugins\linkweaver" "C:\Users\toonc\Documents\obsdn-linkweaver"
```

Then open `C:\Users\toonc\Documents\linkweaver-test-vault` in Obsidian and enable the LinkWeaver community plugin.

## Automated Tests

```powershell
npm test
npm run test:coverage
```

Current coverage focuses on:

- Parser utilities.
- Natural sorting.
- Cache expiry.
- Pattern helpers.
- Sequence detection.
- Batch link replacement and undo.
- Phase 3 path finding and similar-note scoring.

## Project Structure

```text
src/
  discovery/
    path-finder.ts
  links/
    batch-operations.ts
    link-manager.ts
    link-preview.ts
  navigation/
    link-inserter.ts
    navigator.ts
    patterns.ts
    sequence-detector.ts
  ui/
    modals.ts
    settings-tab.ts
  utils/
    cache.ts
    parser.ts
    sorter.ts
  main.ts
  settings.ts
test/
  mocks/
    obsidian.ts
```

## Release Notes For This Development Pass

- Packages were updated to latest npm registry versions.
- Vitest was added for automated tests.
- Phase 3 discovery logic was implemented through `PathFinder`.
- Documentation was rewritten to match the current code instead of planned-only features.
- Mojibake display text was replaced with ASCII text.
