# LinkWeaver Code Walkthrough

This document explains the code in simple terms and points to the files that own each behavior.

## Startup

`src/main.ts` owns the plugin lifecycle.

- `LinkWeaverPlugin.onload()` loads saved settings, creates service classes, registers commands, and registers vault events.
- `LinkWeaverPlugin.saveSettings()` saves settings and pushes the new settings into services that cache or depend on those settings.
- `LinkWeaverPlugin.registerEventHandlers()` keeps caches fresh when files change and optionally validates links on save.

The plugin is intentionally split into services so the logic can be tested outside Obsidian.

## Settings

`src/settings.ts` defines the settings object and defaults.

- Sequential navigation settings control sequence detection, circular navigation, status bar display, and visual notices.
- Link management settings control rename updates, save-time validation, preview length, and validation rules.
- Discovery settings control path search depth, similarity threshold, and excluded folders.

## Sequence Detection

`src/navigation/sequence-detector.ts` detects whether the active file belongs to a sequence.

Flow:

1. Check the one-minute cache for the current file path.
2. Try date detection first so daily notes such as `2026-05-28.md` are not mistaken for generic numeric notes.
3. Try numeric detection for names such as `Chapter 1.md`.
4. Try enabled custom regex patterns from settings.
5. Sort matching files and return the current position.

Key helpers:

- `src/utils/parser.ts` parses numbers and strict dates from filenames.
- `src/utils/sorter.ts` natural-sorts names so `Note 10` comes after `Note 2`.
- `src/utils/cache.ts` stores sequence results briefly to avoid repeated vault scans.

## Sequence Navigation

`src/navigation/navigator.ts` opens previous or next files.

- `navigateNext()` gets the active file, asks `SequenceDetector` for the sequence, finds the next index, and opens that file.
- `navigatePrevious()` does the same in reverse.
- Circular navigation is handled inside `getNextIndex()` and `getPreviousIndex()`.
- If sequential navigation is disabled, navigation exits early and shows a notice.

## Sequence Link Insertion

`src/navigation/link-inserter.ts` writes navigation links into notes.

- `insertSequenceLinks(file)` updates one file.
- `updateAllSequenceLinks()` updates every file in the active sequence.
- Existing LinkWeaver navigation sections are removed before new links are written, which prevents duplicate navigation blocks.

Generated links use ASCII arrows:

```markdown
<- [[Chapter 1]] | [[Chapter 3]] ->
```

## Link Management

`src/links/link-manager.ts` reads Obsidian metadata cache data.

It can:

- Validate all links in the vault.
- Validate links in one file.
- Count outgoing, incoming, and unresolved links.
- Find orphan notes with no incoming or outgoing links.
- Find hub pages with many total links.
- Apply configured validation rules.
- Export link statistics to CSV or JSON.

Important detail: this service relies on Obsidian's resolved-link cache through `metadataCache.getFirstLinkpathDest()`.

## Batch Link Operations

`src/links/batch-operations.ts` updates links across the vault.

- `batchReplaceLink(oldLink, newLink)` replaces wiki links and Markdown links.
- `previewChanges(oldLink, newLink)` runs the same replacement logic without writing files.
- `undoLastOperation()` restores the previous content for the last applied batch.

The undo stack keeps the last 10 applied batches.

## Link Previews

`src/links/link-preview.ts` builds contextual snippets around links.

- Outgoing previews come from links in the active file.
- Incoming previews scan other notes for links that resolve to the active file.
- Unresolved previews show links that Obsidian cannot resolve.

The preview modal is rendered from `src/ui/modals.ts`.

## Phase 3 Discovery

`src/discovery/path-finder.ts` implements Phase 3 discovery logic.

It provides:

- `findShortestPath(sourceFile, targetFile)`: breadth-first search through resolved outgoing links.
- `findAllPaths(sourceFile, targetFile)`: depth-limited search for all acyclic paths.
- `findSimilarNotes(sourceFile)`: Jaccard similarity based on shared outgoing link targets.
- `getOutgoingTargets(file)`: helper that converts Obsidian link cache entries into resolved `TFile` targets.

Settings used:

- `maxPathDepth` limits path search depth.
- `similarityThreshold` filters weak matches.
- `excludeFolders` removes files from discovery results.

## UI Layer

`src/ui/modals.ts` contains Obsidian modal views.

The modal layer is intentionally thin:

- It collects input.
- It calls a service such as `PathFinder` or `LinkManager`.
- It renders the result.

This keeps business logic testable without launching Obsidian.

## Test Layer

`test/mocks/obsidian.ts` provides lightweight classes for Obsidian APIs used in tests.

The tests validate the core behavior without needing a real vault:

- `test/parser.test.ts`
- `test/sorter-cache-patterns.test.ts`
- `test/sequence-detector.test.ts`
- `test/path-finder.test.ts`
- `test/batch-operations.test.ts`
