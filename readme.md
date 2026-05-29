# LinkWeaver

LinkWeaver is an Obsidian plugin for moving through related notes and maintaining links across a vault.

## What It Does

- Detects note sequences such as `Chapter 1`, `Chapter 2`, `Chapter 10`.
- Detects date sequences such as `2026-05-27`, `2026-05-28`, `2026-05-29`.
- Opens the previous or next note in a detected sequence.
- Inserts previous/next navigation links into every note in a sequence.
- Validates links, reports unresolved links, finds orphan notes, and finds hub pages.
- Batch-replaces wiki links and Markdown links across a vault with undo support.
- Shows outgoing, incoming, and unresolved links with nearby context.
- Finds shortest paths between notes and similar notes based on shared outgoing links.

Similar-note scoring example:

```text
Note A links to: Testing, Obsidian, Automation
Note B links to: Testing, Obsidian, Plugins

intersection = Testing, Obsidian
union = Testing, Obsidian, Automation, Plugins
score = 2 / 4 = 0.5
```

The plugin returns candidates when the score is at or above the `similarityThreshold` setting.

## Current Commands

- `Navigate to next in sequence`
- `Navigate to previous in sequence`
- `Show sequence overview`
- `Insert sequence navigation links`
- `Update all sequence links`
- `Show link statistics`
- `Find orphaned notes`
- `Find hub pages`
- `Validate all links`
- `Validate links in current file`
- `Batch replace link`
- `Undo last batch operation`
- `Show outgoing links with preview`
- `Show incoming links with preview`
- `Show unresolved links with preview`
- `Find path between notes`
- `Find similar notes`
- `Export link statistics to CSV`
- `Export link statistics to JSON`

## Install For Development

```powershell
npm install
npm run build
```

Build output is `main.js`, which Obsidian loads with `manifest.json` and `styles.css`.

## Test

```powershell
npm test
npm run build
```

The automated suite validates core logic outside Obsidian. Manual Obsidian validation uses the sibling test vault at:

```text
C:\Users\toonc\Documents\linkweaver-test-vault
```

See `docs/TESTING_GUIDE.md` for the full manual and automated testing plan.

## Code Map

- `src/main.ts`: plugin startup, command registration, settings updates, and vault event handlers.
- `src/settings.ts`: settings schema and defaults.
- `src/navigation/sequence-detector.ts`: sequence detection for date, numeric, and custom patterns.
- `src/navigation/navigator.ts`: previous/next navigation behavior.
- `src/navigation/link-inserter.ts`: writes sequence navigation links into notes.
- `src/links/link-manager.ts`: link validation, stats, orphan notes, hub pages, and exports.
- `src/links/batch-operations.ts`: batch replacement and undo.
- `src/links/link-preview.ts`: link context previews.
- `src/discovery/path-finder.ts`: Phase 3 path finding and similar-note scoring.
- `src/ui/modals.ts`: Obsidian modal UI for reports, previews, batch actions, path finding, and similar notes.

## Documentation

- `docs/CODE_WALKTHROUGH.md`: plain-English explanation of the code with references.
- `docs/TESTING_GUIDE.md`: automated tests and Obsidian manual testing steps.
- `docs/PHASE_ROADMAP.md`: recovered phase roadmap and planning checklist.
- `DEVELOPMENT.md`: development workflow and test vault setup.
