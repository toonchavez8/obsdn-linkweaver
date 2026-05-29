# LinkWeaver Code Walkthrough

This walkthrough is written for a junior developer who wants to understand how the plugin is structured, how the core algorithms work, and where to make changes safely.

## Architecture Overview

LinkWeaver is an Obsidian plugin organized around service classes. `src/main.ts` owns plugin lifecycle and command wiring; the feature logic lives in smaller modules under `navigation`, `links`, and `discovery`.

```text
src/main.ts
  Plugin lifecycle, settings load/save, command registration, event handlers.

src/navigation/
  Sequence detection, next/previous navigation, sequence link insertion.

src/links/
  Link validation, link stats, previews, batch replacement, undo.

src/discovery/
  Phase 3 graph features: path finding and similar-note scoring.

src/ui/
  Obsidian settings tab and modal rendering.

src/utils/
  Small reusable helpers: parsing, natural sorting, cache.
```

The runtime flow usually looks like this:

```text
Obsidian command
  -> LinkWeaverPlugin command callback in src/main.ts
  -> service method such as PathFinder.findSimilarNotes(...)
  -> Obsidian vault or metadataCache read
  -> result object
  -> modal, Notice, console output, or file write
```

The important design choice is that the service classes do most of the business logic. UI classes should mostly collect input and render output. This keeps the logic testable with mocks.

## Startup And Dependency Wiring

File: `src/main.ts`

`LinkWeaverPlugin.onload()` is called by Obsidian when the plugin is enabled. It initializes settings, constructs services, registers commands, creates the status bar item, and subscribes to vault/workspace events.

Simplified shape:

```typescript
async onload() {
  await this.loadSettings();

  this.detector = new SequenceDetector(this.app.vault, this.settings.customPatterns);
  this.navigator = new Navigator(this.app, this.detector, this.settings);
  this.linkManager = new LinkManager(this.app, this.settings.validationRules);
  this.pathFinder = new PathFinder(this.app, this.settings);

  this.registerCommands();
  this.registerEventHandlers();
}
```

Key responsibilities:

- `loadSettings()` merges saved data with `DEFAULT_SETTINGS`.
- `saveSettings()` persists settings and updates services that cache settings.
- `registerCommands()` maps command palette actions to service calls.
- `registerEventHandlers()` invalidates caches, updates links on rename, and optionally validates links on save.

Example command flow:

```typescript
this.addCommand({
  id: 'find-similar-notes',
  name: 'Find similar notes',
  callback: () => {
    const activeFile = this.app.workspace.getActiveFile();
    const similarNotes = this.pathFinder.findSimilarNotes(activeFile);
    new SimilarNotesModal(this.app, activeFile, similarNotes).open();
  }
});
```

The command callback should stay thin. It gets user context, calls the service, then renders the result.

## Settings Model

File: `src/settings.ts`

`LinkWeaverSettings` defines the plugin configuration contract. `DEFAULT_SETTINGS` provides safe defaults for first install and for missing saved keys after upgrades.

Important settings:

```typescript
interface LinkWeaverSettings {
  enableSequentialNav: boolean;
  circularNavigation: boolean;
  customPatterns: PatternConfig[];

  autoUpdateLinks: boolean;
  validateLinksOnSave: boolean;
  linkPreviewLength: number;
  validationRules: ValidationRuleConfig[];

  maxPathDepth: number;
  similarityThreshold: number;
  excludeFolders: string[];
}
```

How settings affect behavior:

- `enableSequentialNav` gates navigation and sequence link insertion.
- `circularNavigation` lets next/previous wrap at sequence boundaries.
- `customPatterns` adds user regex patterns for sequence detection.
- `validationRules` adds custom link validation checks.
- `maxPathDepth` limits graph traversal depth.
- `similarityThreshold` filters weak similar-note matches.
- `excludeFolders` removes folders from discovery calculations.

Example:

```text
maxPathDepth = 3

Allowed path:
Topic A -> Topic B -> Topic C -> Topic D

Rejected path:
Topic A -> Topic B -> Topic C -> Topic D -> Topic E
```

The rejected path has four link hops, which exceeds depth `3`.

## Sequence Detection

File: `src/navigation/sequence-detector.ts`

`SequenceDetector` determines whether a file belongs to an ordered sequence.

Main API:

```typescript
detectSequence(file: TFile): SequenceInfo | null
```

Result shape:

```typescript
interface SequenceInfo {
  files: TFile[];
  currentIndex: number;
  pattern: string;
  type: 'numeric' | 'date' | 'custom';
}
```

Example result for `Chapter 2.md`:

```typescript
{
  files: [chapter1File, chapter2File, chapter10File],
  currentIndex: 1,
  pattern: "Chapter ",
  type: "numeric"
}
```

Detection priority:

```typescript
const sequence =
  this.detectDateSequence(file)
  ?? this.detectNumericSequence(file)
  ?? this.detectCustomSequence(file);
```

Date detection runs first because ISO date names contain numbers. Without this priority, `2026-05-28.md` could be incorrectly treated as a generic numeric sequence.

### Numeric Detection

Numeric detection handles names like:

```text
Chapter 1.md
Chapter 2.md
Chapter 10.md
```

The detector:

1. Parses the active file basename with `parseNumericPattern`.
2. Scans markdown files in the same folder.
3. Keeps files with matching prefix/suffix.
4. Natural-sorts the matching filenames.
5. Returns the sorted files and current index.

Natural sort is required because plain string sorting can produce this:

```text
Chapter 1
Chapter 10
Chapter 2
```

Natural sort produces the expected order:

```text
Chapter 1
Chapter 2
Chapter 10
```

### Date Detection

Date detection handles:

```text
2026-05-27.md
2026-05-28.md
2026-05-29.md
```

`parseDatePattern` validates real calendar dates. This matters because JavaScript can normalize invalid dates if you are not careful.

Example:

```typescript
parseDatePattern('2026-02-28'); // valid
parseDatePattern('2026-02-31'); // null
```

### Custom Detection

Custom detection uses enabled regex patterns from settings.

Example custom config:

```typescript
{
  name: "Episode",
  regex: "^Episode [A-Z]$",
  enabled: true
}
```

Files:

```text
Episode A.md
Episode B.md
Episode C.md
```

If the active file matches the regex and at least two files in the same folder match, the detector returns a custom sequence.

### Cache Behavior

File: `src/utils/cache.ts`

Sequence detection can scan many files. `SequenceDetector` caches results by file path for one minute:

```text
cache key   = file.path
cache value = SequenceInfo
max age     = 60 seconds
```

`main.ts` clears or invalidates cache entries when files are created, renamed, or deleted.

## Sequence Navigation

File: `src/navigation/navigator.ts`

`Navigator` opens adjacent files in a detected sequence.

Main methods:

```typescript
navigateNext(): Promise<boolean>
navigatePrevious(): Promise<boolean>
navigateToIndex(index: number): Promise<boolean>
getSequenceInfo(): SequenceInfo | null
```

Core flow:

```typescript
const activeFile = this.app.workspace.getActiveFile();
const sequence = this.detector.detectSequence(activeFile);
const nextIndex = this.getNextIndex(sequence);
await this.openFile(sequence.files[nextIndex]);
```

Boundary behavior:

```text
circularNavigation = false
  first previous -> fail with Notice
  last next      -> fail with Notice

circularNavigation = true
  first previous -> last file
  last next      -> first file
```

This class does not decide how sequences are detected. It depends on `SequenceDetector` for that.

## Sequence Link Insertion

File: `src/navigation/link-inserter.ts`

`LinkInserter` writes previous/next links into note content.

Generated block for a middle file:

```markdown
---

<- [[Chapter 1]] | [[Chapter 3]] ->
```

Update flow:

```text
detect sequence
  -> compute previous and next TFile
  -> read note content
  -> remove existing LinkWeaver navigation block
  -> append new navigation block
  -> vault.modify(file, newContent)
```

The cleanup step prevents duplicate navigation blocks. It scans from the bottom of the file for a horizontal rule followed by content that looks like previous/next navigation.

Relevant methods:

```typescript
insertSequenceLinks(file: TFile): Promise<boolean>
updateAllSequenceLinks(): Promise<boolean>
removeExistingLinks(content: string): string
generateNavigationLinks(previousFile, nextFile): string
```

## Link Management

File: `src/links/link-manager.ts`

`LinkManager` uses Obsidian's `metadataCache` instead of reparsing markdown manually. Obsidian already indexes links, embeds, positions, and resolved destinations.

Typical metadata entry:

```typescript
{
  link: "Topic B",
  displayText: "read this next",
  position: {
    start: { line: 4 }
  }
}
```

Resolving a link:

```typescript
const targetFile = this.app.metadataCache.getFirstLinkpathDest(
  link.link,
  sourceFile.path
);
```

If `targetFile` is `null`, the link is unresolved.

### Validation

Validation transforms metadata links into `LinkInfo` objects.

```typescript
interface LinkInfo {
  sourceFile: TFile;
  linkText: string;
  displayText: string;
  line: number;
  isResolved: boolean;
  targetFile: TFile | null;
}
```

Example:

```markdown
[[Topic B]]
[[Missing Note]]
```

Result:

```text
Topic B      -> isResolved: true
Missing Note -> isResolved: false
```

`validateAllLinks()` scans all markdown files. `validateFileLinks(file)` scans one file.

### Link Statistics

`getLinkStats(file)` returns:

```typescript
{
  outgoing: number;
  incoming: number;
  unresolved: number;
}
```

Definitions:

- Outgoing: links from this file to another file.
- Incoming: links from other files to this file.
- Unresolved: outgoing links that do not resolve.

Incoming link counts require scanning other files and resolving their links back to the target file.

### Orphan Notes And Hub Pages

An orphan note has no outgoing links and no incoming links.

```typescript
getOrphanedNotes(): TFile[]
```

A hub page is a note with many total connections:

```typescript
getHubPages(threshold = 10): Array<{ file: TFile; linkCount: number }>
```

The hub score is:

```text
incoming links + outgoing links
```

## Batch Link Operations

File: `src/links/batch-operations.ts`

`BatchOperations` performs controlled text replacement across vault files.

It supports wiki links:

```markdown
[[Old Note]]
[[Old Note|alias]]
```

and Markdown links:

```markdown
[alias](Old Note)
```

After replacement:

```markdown
[[New Note]]
[[New Note|alias]]
[alias](New Note)
```

Main methods:

```typescript
batchReplaceLink(oldLink, newLink, dryRun): Promise<BatchResult>
previewChanges(oldLink, newLink): Promise<Array<{ file: TFile; changes: number }>>
undoLastOperation(): Promise<boolean>
```

`dryRun` controls whether files are written:

```text
dryRun = true
  calculate changes only

dryRun = false
  write changes and store undo data
```

Undo is in-memory only. It restores file content from the last applied batch while the plugin session is still active.

## Link Previews

File: `src/links/link-preview.ts`

`LinkPreviewManager` builds contextual snippets around links.

Preview types:

- `outgoing`: resolved links from the active file.
- `incoming`: links from other files to the active file.
- `unresolved`: links from the active file that do not resolve.

Context generation:

```text
read file
  -> split into lines
  -> start at link line
  -> add lines before and after until linkPreviewLength is reached
  -> truncate if needed
```

This gives the modal enough surrounding text to make the link useful without opening every note.

## Phase 3 Discovery

File: `src/discovery/path-finder.ts`

The discovery module treats the vault as a directed graph:

```text
note = node
resolved link = directed edge
```

Example:

```text
Topic A -> Topic B -> Topic C -> Topic D
```

`Topic A` has an outgoing edge to `Topic B`. `Topic B` has an outgoing edge to `Topic C`.

## Path Finding

`findShortestPath(sourceFile, targetFile)` finds the shortest directed path from one note to another.

Example:

```text
Topic A links to Topic B
Topic B links to Topic C
Topic C links to Topic D
```

Query:

```text
source = Topic A
target = Topic D
```

Result:

```text
Topic A -> Topic B -> Topic C -> Topic D
```

### Breadth-First Search

Shortest path uses breadth-first search. BFS explores all paths of length `1`, then length `2`, then length `3`, and so on. The first time BFS reaches the target, that route is guaranteed to be shortest in an unweighted graph.

Simplified version:

```typescript
const visitedPaths = new Set<string>([sourceFile.path]);
const searchQueue: TFile[][] = [[sourceFile]];

while (searchQueue.length > 0) {
  const currentPath = searchQueue.shift();
  const currentFile = currentPath[currentPath.length - 1];

  for (const linkedFile of getOutgoingTargets(currentFile)) {
    if (visitedPaths.has(linkedFile.path)) {
      continue;
    }

    const nextPath = [...currentPath, linkedFile];

    if (linkedFile.path === targetFile.path) {
      return nextPath;
    }

    visitedPaths.add(linkedFile.path);
    searchQueue.push(nextPath);
  }
}
```

Why the visited set matters:

```text
Topic A -> Topic B -> Topic A
```

Without `visitedPaths`, cycles can cause repeated work or infinite traversal.

## All Paths

`findAllPaths(sourceFile, targetFile)` returns every acyclic path up to `maxPathDepth`.

Example graph:

```text
Topic A -> Topic B -> Topic D
Topic A -> Topic C -> Topic D
```

Results:

```text
Topic A -> Topic B -> Topic D
Topic A -> Topic C -> Topic D
```

This uses depth-limited recursive traversal. The method tracks the current path so the same note is not revisited within a single route.

## Similar Notes

`findSimilarNotes(sourceFile)` ranks notes by overlap in resolved outgoing links. It does not compare note body text. It compares the notes each candidate links to.

This is useful because link overlap often indicates related concepts. Two notes that both link to `Testing`, `Obsidian`, and `Automation` are probably related even if their titles are different.

### Input Model

Assume:

```markdown
# Topic A

[[Testing]]
[[Obsidian]]
[[Automation]]
```

```markdown
# Topic B

[[Testing]]
[[Obsidian]]
[[Plugins]]
```

The outgoing target sets are:

```text
Topic A targets = { Testing, Obsidian, Automation }
Topic B targets = { Testing, Obsidian, Plugins }
```

### Scoring Model

The implementation uses Jaccard similarity:

```text
score = intersection size / union size
```

For `Topic A` and `Topic B`:

```text
intersection = { Testing, Obsidian }
union        = { Testing, Obsidian, Automation, Plugins }

score = 2 / 4 = 0.5
```

Interpretation:

```text
0.0 = no shared outgoing targets
0.5 = half overlap by union size
1.0 = identical outgoing target sets
```

### Filtering

`similarityThreshold` controls which candidates are returned.

```text
similarityThreshold = 0.5

score 0.75 -> included
score 0.50 -> included
score 0.49 -> excluded
```

Unresolved links do not count because `getOutgoingTargets()` only includes links Obsidian resolves to real files.

### Implementation Flow

Simplified implementation:

```typescript
const sourceTargets = this.getOutgoingTargetPaths(sourceFile);

return this.app.vault.getMarkdownFiles()
  .filter(candidateFile => candidateFile.path !== sourceFile.path)
  .filter(candidateFile => !this.isExcluded(candidateFile))
  .map(candidateFile => this.scoreSimilarity(candidateFile, sourceTargets))
  .filter(candidate => candidate !== null && candidate.score >= threshold)
  .sort((firstNote, secondNote) => secondNote.score - firstNote.score);
```

`scoreSimilarity()` does the set math:

```typescript
const candidateTargets = this.getOutgoingTargetPaths(candidateFile);
const sharedLinks = [...sourceTargets]
  .filter(targetPath => candidateTargets.has(targetPath));
const combinedTargets = new Set([...sourceTargets, ...candidateTargets]);
const score = sharedLinks.length / combinedTargets.size;
```

Return shape:

```typescript
interface SimilarNote {
  file: TFile;
  score: number;
  sharedLinks: string[];
}
```

### Concrete Example

Settings:

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
intersection = Testing, Obsidian
union        = Testing, Obsidian, Automation, Plugins
score        = 2 / 4 = 0.5
result       = included
```

Compare `Topic A` to `Topic C`:

```text
intersection = none
union        = Testing, Obsidian, Automation, Cooking, Travel
score        = 0 / 5 = 0
result       = excluded
```

## Outgoing Target Resolution

`getOutgoingTargets(file)` is shared by path finding and similar-note scoring.

It converts raw Obsidian link strings into resolved `TFile` objects:

```markdown
[[Topic B]]
[[Missing Note]]
```

Resolution result:

```text
Topic B      -> included as TFile
Missing Note -> skipped because it resolves to null
```

This keeps graph logic based on actual files, not unresolved text labels.

## UI Layer

File: `src/ui/modals.ts`

Modal classes render results and collect input. They should not contain heavy business logic.

Examples:

```text
PathFinderModal
  collects source and target input
  resolves those inputs to TFile objects
  calls PathFinder.findShortestPath(...)
  renders the returned path
```

```text
SimilarNotesModal
  receives SimilarNote[]
  renders file path, percentage score, and shared-link count
```

The modal layer depends on service outputs. Services should not depend on modal classes.

## Test Layer

Folder: `test/`

Tests use `test/mocks/obsidian.ts` as a lightweight replacement for the Obsidian API. This allows service logic to run in Vitest without opening Obsidian.

Example fake file:

```typescript
const topicA = new TFile('Research/Topic A.md');
```

Example fake metadata:

```typescript
getFileCache: () => ({
  links: [
    { link: 'Topic B', position: { start: { line: 0 } } }
  ]
})
```

Current test coverage focuses on:

- Parsing filenames and dates.
- Natural sorting and cache expiry.
- Sequence detection.
- Batch replacement and undo.
- Path finding and similar-note scoring.

## Recommended Reading Order

If you are onboarding to this codebase, read these files in order:

1. `src/main.ts`: lifecycle, dependency wiring, command registration.
2. `src/settings.ts`: configuration contract.
3. `src/navigation/sequence-detector.ts`: sequence detection.
4. `src/navigation/navigator.ts`: sequence movement.
5. `src/discovery/path-finder.ts`: graph traversal and similarity scoring.
6. `src/links/link-manager.ts`: metadata-based link validation and stats.
7. `src/ui/modals.ts`: how results are displayed in Obsidian.

The most important boundary:

```text
main.ts wires services together.
services own behavior.
modals render behavior.
tests exercise services with mocked Obsidian APIs.
```
