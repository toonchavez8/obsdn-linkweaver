# LinkWeaver Testing Guide

Use this guide to validate LinkWeaver both outside Obsidian and inside Obsidian.

## Automated Validation

Run:

```powershell
npm test
npm run build
```

Expected result:

- All Vitest tests pass.
- TypeScript type-checking passes.
- esbuild creates `main.js`.

Current automated suite:

- `test/parser.test.ts`: filename parsing and strict date parsing.
- `test/sorter-cache-patterns.test.ts`: natural sort, cache expiry, and pattern helpers.
- `test/sequence-detector.test.ts`: numeric, date, and custom sequence detection.
- `test/path-finder.test.ts`: Phase 3 shortest path, all paths, and similar notes.
- `test/batch-operations.test.ts`: batch replacement, preview, and undo.

## Manual Test Vault

The manual test vault is:

```text
C:\Users\toonc\Documents\linkweaver-test-vault
```

It contains:

- `Sequences/Chapter 1.md`, `Chapter 2.md`, `Chapter 3.md`
- `Daily/2026-05-27.md`, `2026-05-28.md`, `2026-05-29.md`
- `Research/Topic A.md`, `Topic B.md`, `Topic C.md`, `Topic D.md`
- `Research/Shared Concept.md`
- `Research/Orphan Note.md`

## Link Plugin Into Vault

Run from an elevated Windows terminal:

```powershell
New-Item -ItemType Directory -Force "C:\Users\toonc\Documents\linkweaver-test-vault\.obsidian\plugins"
cmd /c mklink /D "C:\Users\toonc\Documents\linkweaver-test-vault\.obsidian\plugins\linkweaver" "C:\Users\toonc\Documents\obsdn-linkweaver"
```

Then:

1. Open `C:\Users\toonc\Documents\linkweaver-test-vault` in Obsidian.
2. Go to Settings -> Community plugins.
3. Enable LinkWeaver.
4. Open the command palette and run the test commands below.

## Manual Test Checklist

### Numeric Sequence

Open `Sequences/Chapter 2.md`.

Expected:

- `Navigate to next in sequence` opens `Chapter 3.md`.
- `Navigate to previous in sequence` opens `Chapter 1.md`.
- `Show sequence overview` logs the ordered sequence as `Chapter 1`, `Chapter 2`, `Chapter 3`.

### Date Sequence

Open `Daily/2026-05-28.md`.

Expected:

- Previous opens `2026-05-27.md`.
- Next opens `2026-05-29.md`.
- Date sequence wins over generic numeric parsing.

### Sequence Link Insertion

Open `Sequences/Chapter 2.md` and run `Insert sequence navigation links`.

Expected appended block:

```markdown
---

<- [[Chapter 1]] | [[Chapter 3]] ->
```

Run `Update all sequence links`.

Expected:

- All three chapter notes receive correct previous/next links.
- Re-running the command updates the existing block instead of duplicating it.

### Link Validation

Open `Research/Topic A.md` and run `Validate links in current file`.

Expected:

- It reports one unresolved link: `Missing Note`.

Run `Validate all links`.

Expected:

- The validation modal includes unresolved links.
- Resolved links such as `Topic B` are not reported as unresolved.

### Link Statistics

Open `Research/Topic A.md` and run `Show link statistics`.

Expected:

- Outgoing count includes links to `Topic B`, `Shared Concept`, and `Missing Note`.
- Unresolved count includes `Missing Note`.

### Orphan Notes

Run `Find orphaned notes`.

Expected:

- `Research/Orphan Note.md` appears because it has no incoming or outgoing links.

### Phase 3 Path Finding

Run `Find path between notes`.

Use:

- Source: `Research/Topic A.md`
- Target: `Research/Topic D.md`

Expected shortest path:

```text
Topic A -> Topic B -> Topic C -> Topic D
```

### Phase 3 Similar Notes

Open `Research/Topic B.md` and run `Find similar notes`.

Expected:

- Notes that share `Shared Concept` appear above the configured similarity threshold.

The similarity score is based on overlap between resolved outgoing links:

```text
Topic B links to:
Topic C
Shared Concept

Topic C links to:
Topic D
Shared Concept
```

Both notes link to `Shared Concept`, so the intersection contains one resolved target.

The implementation uses Jaccard similarity:

```text
score = intersection size / union size
```

For `Topic B` and `Topic C`:

```text
intersection:
Shared Concept

union:
Topic C
Topic D
Shared Concept

score:
1 / 3 = 0.33
```

If your `similarityThreshold` setting is `0.5`, that pair will not show. If you lower the threshold to `0.3`, it should show.

To make an obvious manual test, edit `Research/Topic D.md` so it shares both targets with `Topic B`:

```markdown
Links: [[Topic C]] and [[Shared Concept]].
```

Then open `Research/Topic B.md` and run `Find similar notes`.

This creates identical outgoing target sets:

```text
Topic B links to:
Topic C
Shared Concept

Topic D links to:
Topic C
Shared Concept
```

Both notes have the same resolved outgoing links, so the score is:

```text
2 / 2 = 1.0
```

That means `Topic D` should show as `100%` similar to `Topic B`.

### Batch Replacement

Use `Batch replace link`.

Try:

- Old link: `Shared Concept`
- New link: `Shared Idea`
- First run preview.

Expected:

- Preview lists affected files.
- Confirming applies changes.
- `Undo last batch operation` restores the original links.

## Troubleshooting

- If Obsidian does not show the plugin, verify the symlink target points to this repo.
- If changes do not appear, run `npm run build` and reload Obsidian.
- If tests fail because a helper cannot spawn, run the command from a normal terminal or approve the command in Codex.
