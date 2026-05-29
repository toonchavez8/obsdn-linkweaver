# LinkWeaver Code Walkthrough

This document explains LinkWeaver at a high-school reading level. The goal is to make it clear what each part of the code does, why it exists, and how data moves through the plugin.

## Big Picture

LinkWeaver is an Obsidian plugin. Obsidian gives the plugin access to notes, links, metadata, the command palette, and the UI.

The plugin is split into small service classes:

```text
main.ts
  creates and connects the services

navigation/
  finds note sequences and moves between notes

links/
  validates links, counts links, previews links, and edits links

discovery/
  finds paths between notes and similar notes

ui/
  shows Obsidian modals and settings screens

utils/
  small helper functions used by the services
```

The main idea is:

```text
User runs a command in Obsidian
  -> main.ts receives that command
  -> main.ts calls the correct service
  -> the service reads vault data or metadata
  -> the service returns a result
  -> a modal or notice shows the result to the user
```

## Startup

File: `src/main.ts`

`src/main.ts` is the front door of the plugin. Obsidian loads this file first.

When Obsidian starts the plugin, `onload()` runs.

```typescript
async onload() {
  await this.loadSettings();

  this.detector = new SequenceDetector(...);
  this.navigator = new Navigator(...);
  this.linkManager = new LinkManager(...);
  this.pathFinder = new PathFinder(...);

  this.registerCommands();
  this.registerEventHandlers();
}
```

In plain English:

1. Load saved user settings.
2. Create the helper services.
3. Register commands like `Find similar notes`.
4. Watch for vault events like file rename, create, delete, and modify.

Why this matters:

- `main.ts` does not try to do all the logic itself.
- It delegates work to focused classes.
- That makes the logic easier to test without launching Obsidian.

## Settings

File: `src/settings.ts`

Settings are the plugin's memory. They tell the plugin what behavior is turned on and how strict it should be.

Example:

```typescript
export const DEFAULT_SETTINGS: LinkWeaverSettings = {
  enableSequentialNav: true,
  circularNavigation: false,
  maxPathDepth: 5,
  similarityThreshold: 0.5,
  excludeFolders: []
};
```

Important settings:

- `enableSequentialNav`: turns sequence navigation on or off.
- `circularNavigation`: if true, the last note can go back to the first note.
- `maxPathDepth`: how many link steps path finding is allowed to search.
- `similarityThreshold`: how similar two notes must be before they are shown.
- `excludeFolders`: folders ignored by discovery features.

Example:

```text
maxPathDepth = 3

Allowed:
Topic A -> Topic B -> Topic C -> Topic D

Not allowed:
Topic A -> B -> C -> D -> E
because that is 4 link steps
```

## Sequence Detection

File: `src/navigation/sequence-detector.ts`

This class answers one question:

```text
Does this note belong to an ordered group of notes?
```

Examples of ordered groups:

```text
Chapter 1.md
Chapter 2.md
Chapter 10.md
```

```text
2026-05-27.md
2026-05-28.md
2026-05-29.md
```

The main method is:

```typescript
detectSequence(file: TFile): SequenceInfo | null
```

It returns either:

```typescript
{
  files: [Chapter 1, Chapter 2, Chapter 10],
  currentIndex: 1,
  pattern: "Chapter ",
  type: "numeric"
}
```

or `null` if no sequence is found.

### How Detection Works

The code checks patterns in this order:

```text
1. Date sequence
2. Numeric sequence
3. Custom sequence
```

Date runs first on purpose. A filename like `2026-05-28.md` has numbers in it, but it should be treated as a date, not as a generic number.

Pseudocode:

```typescript
const sequence =
  detectDateSequence(file)
  ?? detectNumericSequence(file)
  ?? detectCustomSequence(file);
```

### Numeric Example

Files in the same folder:

```text
Chapter 10.md
Chapter 1.md
Chapter 2.md
Random.md
```

The detector:

1. Looks at `Chapter 1.md`.
2. Sees the pattern `Chapter ` plus number `1`.
3. Finds other files in the same folder with the same pattern.
4. Sorts them naturally.

Result:

```text
Chapter 1.md
Chapter 2.md
Chapter 10.md
```

Natural sort matters because normal text sorting would often put `Chapter 10` before `Chapter 2`.

### Date Example

Files:

```text
2026-05-29.md
2026-05-27.md
2026-05-28.md
```

The detector parses each date and sorts by real calendar time.

Result:

```text
2026-05-27.md
2026-05-28.md
2026-05-29.md
```

### Cache

File: `src/utils/cache.ts`

Sequence detection scans files in the vault. That can be repeated often, so results are cached for one minute.

```text
First call:
scan files -> compute sequence -> save in cache

Second call soon after:
read sequence from cache
```

When files are created, renamed, or deleted, `main.ts` clears or updates the cache.

## Sequence Navigation

File: `src/navigation/navigator.ts`

This class opens the previous or next file in a sequence.

Example:

```text
Chapter 1.md
Chapter 2.md
Chapter 3.md
```

If the active file is `Chapter 2.md`:

```text
Navigate next     -> Chapter 3.md
Navigate previous -> Chapter 1.md
```

Simplified logic:

```typescript
const activeFile = app.workspace.getActiveFile();
const sequence = detector.detectSequence(activeFile);
const nextFile = sequence.files[sequence.currentIndex + 1];
await app.workspace.getLeaf(false).openFile(nextFile);
```

If circular navigation is enabled:

```text
Chapter 3 next -> Chapter 1
Chapter 1 previous -> Chapter 3
```

If circular navigation is disabled:

```text
Chapter 3 next -> show "Already at the end"
Chapter 1 previous -> show "Already at the beginning"
```

## Sequence Link Insertion

File: `src/navigation/link-inserter.ts`

This class writes previous and next links inside note text.

For `Chapter 2.md`, it can add:

```markdown
---

<- [[Chapter 1]] | [[Chapter 3]] ->
```

The method `insertSequenceLinks(file)` works like this:

```text
1. Detect the sequence for this file.
2. Find the previous note and next note.
3. Read the current note text.
4. Remove an old LinkWeaver navigation block if one exists.
5. Add the new navigation block at the bottom.
6. Save the note.
```

Why remove the old block first?

If the plugin did not remove it, every update would add another copy:

```markdown
---
<- [[Chapter 1]] | [[Chapter 3]] ->

---
<- [[Chapter 1]] | [[Chapter 3]] ->
```

The code avoids that by checking for a horizontal rule and a navigation-looking block.

## Link Management

File: `src/links/link-manager.ts`

This class reads Obsidian's metadata cache. The metadata cache is Obsidian's index of links it already found in notes.

Important idea:

```text
The plugin does not manually parse every markdown link from scratch.
It asks Obsidian: "What links did you find in this file?"
```

Example metadata link:

```typescript
{
  link: "Topic B",
  displayText: "read this next",
  position: { start: { line: 4 } }
}
```

The plugin then asks Obsidian:

```typescript
metadataCache.getFirstLinkpathDest("Topic B", sourceFile.path)
```

That returns the target file if Obsidian can resolve the link.

### Link Validation

Validation checks whether links resolve.

Example:

```markdown
[[Topic B]]
[[Missing Note]]
```

If `Topic B.md` exists but `Missing Note.md` does not:

```text
Topic B      -> resolved
Missing Note -> unresolved
```

### Link Stats

For one note, the plugin can count:

```text
outgoing links   = links from this note to other notes
incoming links   = links from other notes to this note
unresolved links = links from this note that do not resolve
```

Example:

```text
Topic A links to Topic B and Missing Note.
Topic C links to Topic A.

Topic A stats:
outgoing = 2
incoming = 1
unresolved = 1
```

### Orphan Notes

An orphan note has:

```text
0 outgoing links
0 incoming links
```

That means it is disconnected from the vault graph.

## Batch Link Operations

File: `src/links/batch-operations.ts`

This class changes links across many files.

Example request:

```text
Replace every link to "Old Note" with "New Note"
```

It handles both Obsidian wiki links:

```markdown
[[Old Note]]
[[Old Note|custom text]]
```

and Markdown links:

```markdown
[custom text](Old Note)
```

After replacement:

```markdown
[[New Note]]
[[New Note|custom text]]
[custom text](New Note)
```

### Dry Run Preview

`previewChanges(oldLink, newLink)` uses the same replacement logic but does not save files.

That lets the user see:

```text
File A.md: 3 changes
File B.md: 1 change
```

before applying the update.

### Undo

Before writing changes, the code saves the old content in memory.

Simplified:

```typescript
undoStack.push({
  file,
  oldContent,
  newContent
});
```

If the user runs undo, the plugin writes `oldContent` back to each file.

The undo stack keeps the last 10 batches.

## Link Previews

File: `src/links/link-preview.ts`

This class shows nearby text around a link so the user can understand the link without opening the note.

Example note:

```markdown
This project connects to [[Topic B]] because both notes discuss testing.
The next paragraph explains the details.
```

Preview context might be:

```text
This project connects to [[Topic B]] because both notes discuss testing.
The next paragraph explains the details.
```

The plugin supports three preview types:

- `outgoing`: links from the active note to other notes.
- `incoming`: links from other notes to the active note.
- `unresolved`: links that do not resolve to an existing note.

## Phase 3 Discovery

File: `src/discovery/path-finder.ts`

Discovery features answer graph questions.

A graph is just notes and links:

```text
Topic A -> Topic B -> Topic C -> Topic D
```

Each note is a node. Each link is an edge.

## Path Finding

`findShortestPath(sourceFile, targetFile)` finds the shortest chain of links between two notes.

Example vault:

```text
Topic A links to Topic B
Topic B links to Topic C
Topic C links to Topic D
```

If the user asks:

```text
Source: Topic A
Target: Topic D
```

The result is:

```text
Topic A -> Topic B -> Topic C -> Topic D
```

### How Shortest Path Works

The code uses breadth-first search. That means it checks all close paths before trying longer paths.

Think of it like this:

```text
Start at Topic A

Distance 1:
Topic B
Topic X

Distance 2:
Topic C
Topic Y

Distance 3:
Topic D
```

The first time it finds the target, that path is the shortest.

Simplified code idea:

```typescript
const visitedPaths = new Set([sourceFile.path]);
const searchQueue = [[sourceFile]];

while (searchQueue.length > 0) {
  const currentPath = searchQueue.shift();
  const currentFile = currentPath[currentPath.length - 1];

  for (const linkedFile of getOutgoingTargets(currentFile)) {
    const nextPath = [...currentPath, linkedFile];

    if (linkedFile.path === targetFile.path) {
      return nextPath;
    }

    searchQueue.push(nextPath);
  }
}
```

Why `visitedPaths` exists:

```text
Topic A -> Topic B -> Topic A -> Topic B -> ...
```

Without a visited set, the search could loop forever.

## All Paths

`findAllPaths(sourceFile, targetFile)` finds every path up to the configured depth.

Example:

```text
Topic A -> Topic B -> Topic D
Topic A -> Topic C -> Topic D
```

Both paths are valid:

```text
Topic A -> Topic B -> Topic D
Topic A -> Topic C -> Topic D
```

This is useful when there is more than one way ideas connect.

The code avoids cycles by tracking which notes are already in the current path.

## Similar Notes

`findSimilarNotes(sourceFile)` finds notes that point to many of the same notes as the active note.

This feature does not compare full note text. It compares outgoing links.

Example:

```markdown
# Topic A

Links:
[[Testing]]
[[Obsidian]]
[[Automation]]
```

```markdown
# Topic B

Links:
[[Testing]]
[[Obsidian]]
[[Plugins]]
```

`Topic A` and `Topic B` are similar because they both link to:

```text
Testing
Obsidian
```

They do not both link to:

```text
Automation
Plugins
```

### How Similarity Is Scored

The code uses Jaccard similarity.

In simple words:

```text
similarity score = shared links / all unique links
```

For the example above:

```text
Topic A links:
Testing, Obsidian, Automation

Topic B links:
Testing, Obsidian, Plugins

Shared links:
Testing, Obsidian

All unique links:
Testing, Obsidian, Automation, Plugins

Score:
2 shared / 4 total = 0.5
```

So the score is:

```text
0.5 = 50% similar
```

### Why This Is Useful

If two notes link to many of the same ideas, they are probably related.

Example:

```text
Note A links to:
JavaScript, Testing, Obsidian

Note B links to:
JavaScript, Testing, Obsidian

These notes are probably close in meaning.
```

But:

```text
Note C links to:
Cooking, Travel, Mexico

Note C is probably not similar to Note A.
```

### What `findSimilarNotes` Does Step By Step

Source note:

```text
Topic A
```

The code:

```text
1. Get every resolved outgoing link from Topic A.
2. Look at every other markdown file in the vault.
3. Skip files in excluded folders.
4. Get that file's resolved outgoing links.
5. Count shared links.
6. Count all unique links.
7. Compute shared / unique.
8. Keep only notes above similarityThreshold.
9. Sort best matches first.
```

Simplified code idea:

```typescript
const sourceTargets = getOutgoingTargetPaths(sourceFile);

for (const candidateFile of allMarkdownFiles) {
  const candidateTargets = getOutgoingTargetPaths(candidateFile);
  const sharedLinks = linksThatAppearInBothSets(sourceTargets, candidateTargets);
  const combinedLinks = linksThatAppearInEitherSet(sourceTargets, candidateTargets);
  const score = sharedLinks.length / combinedLinks.size;

  if (score >= similarityThreshold) {
    results.push({ file: candidateFile, score, sharedLinks });
  }
}
```

### Concrete Similarity Example

Assume the setting is:

```text
similarityThreshold = 0.5
```

Vault:

```text
Topic A links to: Testing, Obsidian, Automation
Topic B links to: Testing, Obsidian, Plugins
Topic C links to: Cooking, Travel
```

Compare `Topic A` to `Topic B`:

```text
shared = Testing, Obsidian
unique = Testing, Obsidian, Automation, Plugins
score = 2 / 4 = 0.5
```

Result:

```text
Topic B is shown because 0.5 is equal to the threshold.
```

Compare `Topic A` to `Topic C`:

```text
shared = none
unique = Testing, Obsidian, Automation, Cooking, Travel
score = 0 / 5 = 0
```

Result:

```text
Topic C is hidden because 0 is below the threshold.
```

## Outgoing Targets

`getOutgoingTargets(file)` is a helper used by both path finding and similar-note scoring.

It turns Obsidian link text into real files.

Example:

```markdown
[[Topic B]]
[[Missing Note]]
```

The helper asks Obsidian to resolve each link.

Result:

```text
Topic B      -> real TFile
Missing Note -> ignored because it does not resolve
```

This is why discovery features work with real vault links instead of raw text only.

## UI Layer

File: `src/ui/modals.ts`

The UI layer shows results but does not own the main logic.

Example for path finding:

```text
PathFinderModal
  asks user for source note and target note
  calls PathFinder.findShortestPath(...)
  displays the path
```

Example for similar notes:

```text
SimilarNotesModal
  receives already-scored similar notes
  shows file path, percent score, and shared-link count
```

This split is useful because:

- Logic can be tested without UI.
- UI can stay simple.
- Bugs are easier to locate.

## Test Layer

Folder: `test/`

The tests use a fake Obsidian module in `test/mocks/obsidian.ts`.

That means tests can create fake files like:

```typescript
const topicA = new TFile('Research/Topic A.md');
```

and fake link metadata like:

```typescript
getFileCache: () => ({
  links: [
    { link: 'Topic B', position: { start: { line: 0 } } }
  ]
})
```

The tests then check real plugin behavior without opening Obsidian.

Current test files:

- `test/parser.test.ts`
- `test/sorter-cache-patterns.test.ts`
- `test/sequence-detector.test.ts`
- `test/path-finder.test.ts`
- `test/batch-operations.test.ts`

## How To Read The Code

If you are new to this repo, read in this order:

1. `src/main.ts`: see which services exist and which commands call them.
2. `src/settings.ts`: understand the settings that control behavior.
3. `src/navigation/sequence-detector.ts`: understand sequence detection.
4. `src/discovery/path-finder.ts`: understand Phase 3 discovery.
5. `src/links/link-manager.ts`: understand link validation and stats.
6. `src/ui/modals.ts`: see how results are shown in Obsidian.

The key pattern to remember:

```text
main.ts wires things together.
service classes do the logic.
modals show results.
tests fake Obsidian so the logic can be checked here.
```
