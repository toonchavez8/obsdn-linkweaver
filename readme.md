# LinkWeaver

**An Obsidian plugin for intelligent link management and sequential navigation**

LinkWeaver enhances your Obsidian experience by providing smart link utilities, sequential note navigation, and advanced search capabilities within your vault's link structure.

---

## 📋 Plugin Brief

### Vision

Create a powerful link management system that transforms how users navigate and interact with their interconnected notes in Obsidian, making it effortless to traverse note sequences, find related content, and manage complex link structures.

### Core Features

#### 1. **Sequential Navigation**

Navigate through related notes in a logical sequence based on intelligent ordering:

- **Natural Sorting**: Automatically detect and navigate sequences like "Note 1", "Note 2", "Note 10" (handles numeric patterns correctly)
- **Date-based Navigation**: Jump through daily notes or dated content chronologically
- **Custom Patterns**: Define your own sequential patterns (e.g., chapters, episodes, parts)
- **Keyboard Shortcuts**: Quick navigation commands (Next/Previous in sequence)
- **Visual Indicators**: See your position in a sequence and preview next/previous notes

#### 2. **Smart Link Utilities**

Advanced tools for working with links:

- **Batch Link Operations**: Update, rename, or transform multiple links at once
- **Link Validation**: Find and fix broken links across your vault
- **Link Statistics**: View incoming/outgoing link counts, orphaned notes, and hub pages
- **Link Preview**: Enhanced hover previews with context
- **Template Linking**: Create link patterns that auto-populate based on context

#### 3. **Link Search & Discovery**

Find connections you didn't know existed:

- **Path Finder**: Discover connection paths between any two notes
- **Similar Notes**: Find notes with related link patterns
- **Link Clustering**: Identify groups of highly interconnected notes
- **Backlink Context**: See rich context around backlinks
- **Graph Query**: Search your vault using graph-based queries

#### 4. **Link Weaving Tools**

Create and maintain link structures:

- **Auto-linking**: Suggest relevant links as you type
- **Link Templates**: Reusable link structure patterns
- **Sequence Builder**: Tools to create and maintain note sequences
- **Link Verification**: Ensure your link structure remains consistent
- **Bulk Operations**: Apply changes across multiple notes

---

## 🎯 Functional Requirements

### Sequential Navigation Requirements

**Must Have:**

- Detect and parse common numeric patterns in note titles (e.g., "1", "01", "Part 1")
- Navigate forward/backward through detected sequences
- Support date-based sequences (YYYY-MM-DD format)
- Command palette integration
- Keyboard shortcuts for next/prev navigation

**Should Have:**

- Custom pattern definition in settings
- Circular navigation option (loop back to start)
- Visual sequence indicator in status bar
- Quick switcher integration showing position in sequence
- Handle multiple sequences per note (e.g., multiple series)

**Could Have:**

- Auto-generate index pages for sequences
- Sequence gap detection and reporting
- Support for alphabetic sequences (A, B, C...)
- Roman numeral support (I, II, III...)
- Configurable sequence separators

### Link Management Requirements

**Must Have:**

- Update links when notes are renamed
- Detect broken links
- Display link statistics per note
- Command to find orphaned notes
- Batch link replacement

**Should Have:**

- Link validation rules (custom)
- Export link structure to formats (CSV, JSON)
- Undo functionality for batch operations
- Link preview with custom context length
- Filter links by type (outgoing, incoming, unresolved)

**Could Have:**

- Link relationship tagging
- Link strength metrics
- Automated link suggestions based on content
- Link history tracking
- Import link structures from external sources

### Discovery Requirements

**Must Have:**

- Find shortest path between two notes
- List all paths between two notes (within depth limit)
- Find notes with similar outgoing links
- Show backlink context

**Should Have:**

- Customizable similarity threshold
- Path visualization
- Filter by link density
- Search by link pattern
- Exclude certain notes/folders from discovery

**Could Have:**

- Machine learning-based similarity
- Temporal link analysis (when were links created)
- Community detection in graph
- Suggest new links based on content

---

## 🔧 Technical Considerations

### Architecture

**Plugin Structure:**

```
linkweaver/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── settings.ts             # Settings management
│   ├── navigation/
│   │   ├── sequence-detector.ts
│   │   ├── navigator.ts
│   │   └── patterns.ts
│   ├── links/
│   │   ├── link-manager.ts
│   │   ├── link-validator.ts
│   │   └── batch-operations.ts
│   ├── discovery/
│   │   ├── path-finder.ts
│   │   ├── similarity.ts
│   │   └── graph-query.ts
│   ├── ui/
│   │   ├── settings-tab.ts
│   │   ├── modals.ts
│   │   └── status-bar.ts
│   └── utils/
│       ├── parser.ts
│       ├── sorter.ts
│       └── cache.ts
└── styles.css
```

### Key Obsidian APIs to Use

- `MetadataCache`: For link information and cache
- `Vault`: For file operations and reading content
- `Workspace`: For UI integration and commands
- `Editor`: For inline link operations
- `FileManager`: For renaming and moving operations
- `Command`: For registering commands
- `Setting`: For settings UI

### Sequential Navigation Logic

**Pattern Detection Algorithm:**

```
1. Extract basename from current note
2. Identify numeric patterns using regex:
   - Pure numbers: /^(\d+)$/
   - Prefix + number: /^(.+?)(\d+)$/
   - Complex: /^(.+?)(\d+)(.*)$/
3. Get all files matching the pattern prefix
4. Sort using natural sort algorithm (handles 1, 2, 10 correctly)
5. Find current position in sorted array
6. Navigate to index ± 1
```

**Date Pattern Detection:**

```
1. Check for ISO date format: YYYY-MM-DD
2. Check for date variations: YYYYMMDD, DD-MM-YYYY
3. Parse date and find adjacent dates in vault
4. Navigate chronologically
```

### Performance Optimization

- **Caching**: Cache sequence detection results per folder
- **Lazy Loading**: Only analyze visible/active notes initially
- **Debouncing**: Delay expensive operations on rapid changes
- **Indexing**: Build and maintain index of common patterns
- **Incremental Updates**: Only reprocess changed portions

### Data Structures

**Sequence Cache:**

```typescript
interface SequenceCache {
  [folderPath: string]: {
    sequences: Map<string, string[]>; // pattern -> sorted files
    lastUpdated: number;
  };
}
```

**Link Graph:**

```typescript
interface LinkGraph {
  nodes: Map<string, NodeData>;
  edges: Map<string, Set<string>>; // source -> targets
  reverseEdges: Map<string, Set<string>>; // target -> sources
}
```

---

## 🚀 Development Roadmap

### Phase 1: MVP (Minimal Viable Product)

- Basic sequential navigation (numeric patterns only)
- Next/Previous commands with keyboard shortcuts
- Simple link statistics view
- Basic settings UI
- **Goal**: Core navigation working smoothly

### Phase 2: Link Management

- Link validation and broken link detection
- Batch link operations
- Enhanced link preview
- Orphaned note detection
- **Goal**: Comprehensive link management

### Phase 3: Discovery Features

- Path finding between notes
- Similar notes detection
- Backlink context enhancement
- **Goal**: Make connections visible

### Phase 4: Advanced Features

- Custom pattern support
- Auto-linking suggestions
- Link templates
- Graph queries
- **Goal**: Power user features

### Phase 5: Polish & Optimization

- Performance optimization
- UI/UX improvements
- Extensive testing
- Documentation
- **Goal**: Production-ready release

---

## ⚙️ Configuration

### Settings Schema

```typescript
interface LinkWeaverSettings {
  // Sequential Navigation
  enableSequentialNav: boolean;
  customPatterns: PatternConfig[];
  circularNavigation: boolean;
  showSequenceInStatusBar: boolean;
  
  // Link Management
  autoUpdateLinks: boolean;
  validateLinksOnSave: boolean;
  linkPreviewLength: number;
  
  // Discovery
  maxPathDepth: number;
  similarityThreshold: number;
  excludeFolders: string[];
  
  // UI
  enableHotkeys: boolean;
  showVisualIndicators: boolean;
}

interface PatternConfig {
  name: string;
  regex: string;
  enabled: boolean;
}
```

### Default Patterns

1. **Simple Numeric**: `(\d+)` → Matches "1", "2", "10", etc.
2. **Prefixed Numeric**: `^(.+?)(\d+)$` → Matches "Chapter 1", "Part 2"
3. **Date ISO**: `\d{4}-\d{2}-\d{2}` → Matches "2025-01-15"
4. **Semantic Version**: `v?(\d+)\.(\d+)\.(\d+)` → Matches "v1.2.3"

---

## 🎨 User Interface

### Commands (Command Palette)

- `LinkWeaver: Navigate to next in sequence`
- `LinkWeaver: Navigate to previous in sequence`
- `LinkWeaver: Show sequence overview`
- `LinkWeaver: Find path between notes`
- `LinkWeaver: Show link statistics`
- `LinkWeaver: Validate all links`
- `LinkWeaver: Find orphaned notes`
- `LinkWeaver: Find similar notes`

### Status Bar

Display current position in detected sequence:

```
📝 Note 5 of 12 | Chapter Series
```

### Modals

- **Path Finder Modal**: Interactive graph showing paths between notes
- **Link Statistics Modal**: Comprehensive link analytics
- **Sequence Builder Modal**: Create and manage sequences
- **Similar Notes Modal**: Browse notes with similar links

---

## 🧪 Testing Strategy

### Unit Tests

- Pattern detection algorithms
- Natural sorting logic
- Path finding algorithms
- Link parsing and validation

### Integration Tests

- Vault operations
- Cache management
- Settings persistence
- Command execution

### E2E Tests

- Navigation flows
- Batch operations
- UI interactions
- Performance benchmarks

---

## 📚 Use Cases

### 1. Daily Notes Navigation

**Scenario**: User maintains daily notes and wants to quickly jump between days.
**Solution**: LinkWeaver automatically detects date patterns and provides next/previous navigation through chronological daily notes.

### 2. Book/Course Series

**Scenario**: User has notes for each chapter of a book or lessons in a course.
**Solution**: Sequential navigation understands "Chapter 1", "Chapter 2" patterns and allows seamless chapter-by-chapter navigation.

### 3. Research Paths

**Scenario**: User wants to discover how two research topics are connected in their vault.
**Solution**: Path finder reveals connection chains and helps discover unexpected relationships.

### 4. Vault Maintenance

**Scenario**: User reorganizes vault and needs to update many links.
**Solution**: Batch link operations and validation tools ensure link integrity during reorganization.

### 5. Content Discovery

**Scenario**: User wants to find notes similar to current note.
**Solution**: Similarity detection reveals notes with related link patterns and content.

---

## 🤝 Contributing

Contributions are welcome! Areas where help is needed:

- Pattern detection algorithm improvements
- Additional language support for patterns
- UI/UX enhancements
- Performance optimization
- Documentation and examples
- Testing and bug reports

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🔗 Links

- **GitHub Repository**: [https://github.com/toonchavez8/obsdn-linkweaver](https://github.com/toonchavez8/obsdn-linkweaver)
- **Documentation**: [Wiki](https://github.com/toonchavez8/obsdn-linkweaver/wiki)
- **Bug Reports**: [Issues](https://github.com/toonchavez8/obsdn-linkweaver/issues)
- **Feature Requests**: [Issues](https://github.com/toonchavez8/obsdn-linkweaver/issues)

---

## 📝 Notes for Development

This brief serves as the foundation for building LinkWeaver. Use it to:

- Create **GitHub issues** from each feature section
- Define **acceptance criteria** using functional requirements
- Design the **plugin architecture** based on technical considerations
- Implement **sequential navigation logic** using the provided algorithms
- Structure your **codebase** following the proposed architecture

**Next Steps:**

1. [x] Set up the plugin development environment
2. [x] Implement core sequence detection
3. [x] Build navigation commands
4. [x] Create settings UI
5. [ ] Test with real vaults
6. [ ] Iterate based on feedback

---

## 🏗️ Development Status & Roadmap

### Completed Features (Phase 1 - MVP)

**Core Infrastructure:**
- [x] Plugin setup and configuration
- [x] TypeScript build system with esbuild
- [x] Settings management and UI
- [x] Status bar integration
- [x] Event handling and cache management

**Sequential Navigation:**
- [x] Sequence detection for numeric patterns (1, 2, 10)
- [x] Sequence detection for prefixed numbers (Chapter 1, Note 2)
- [x] Date-based sequence detection (YYYY-MM-DD)
- [x] Natural sorting algorithm
- [x] Custom pattern support with regex
- [x] Navigate next/previous commands
- [x] Circular navigation option
- [x] Keyboard shortcuts (Ctrl+Shift+← / →)
- [x] Status bar showing sequence position
- [x] Sequence info caching for performance

**Link Insertion:**
- [x] Insert navigation links at end of files
- [x] Update all files in sequence at once
- [x] Smart detection of existing navigation sections
- [x] Wiki-link format: `← [[Previous]] | [[Next]] →`
- [x] Support for circular link navigation

**Settings:**
- [x] Enable/disable sequential navigation
- [x] Circular navigation toggle
- [x] Status bar visibility control
- [x] Auto-insert sequence links option
- [x] Custom pattern configuration
- [x] Link preview length setting
- [x] Folder exclusions

### Phase 2 - Link Management (To Be Built)

**Link Validation:**
- [x] Detect broken links across vault
- [x] Find and report unresolved links
- [x] Validate links on save (optional)
- [x] Bulk link validation command
- [x] Custom validation rules

**Link Statistics:**
- [x] Count incoming/outgoing links per note
- [x] Identify orphaned notes (no links in/out)
- [x] Find hub pages (highly connected notes)
- [x] Link statistics modal UI
- [x] Export statistics to CSV/JSON

**Batch Operations:**
- [x] Batch link replacement
- [x] Rename all instances of a link
- [x] Update links when files are renamed (auto)
- [x] Undo functionality for batch operations
- [x] Dry-run mode for previewing changes

**Enhanced Link Preview:**
- [x] Show context around links
- [x] Configurable preview length
- [x] Filter by link type (outgoing/incoming/unresolved)

### Phase 3 - Discovery Features (To Be Built)

**Path Finding:**
- [ ] Find shortest path between two notes
- [ ] List all paths within depth limit
- [ ] Path visualization modal
- [ ] Interactive graph display
- [ ] Export path data

**Similarity Detection:**
- [ ] Find notes with similar outgoing links
- [ ] Configurable similarity threshold
- [ ] Similar notes modal UI
- [ ] Sort by similarity score

**Graph Analysis:**
- [ ] Link density metrics
- [ ] Search by link pattern
- [ ] Community detection
- [ ] Link clustering
- [ ] Graph query system

**Backlink Enhancement:**
- [ ] Show rich context around backlinks
- [ ] Context length configuration
- [ ] Filter and sort backlinks

### Phase 4 - Advanced Features (To Be Built)

**Custom Patterns:**
- [ ] Alphabetic sequences (A, B, C...)
- [ ] Roman numeral support (I, II, III...)
- [ ] Semantic versioning (v1.0.0, v1.0.1)
- [ ] Configurable separators
- [ ] Pattern testing UI

**Auto-linking:**
- [ ] Suggest relevant links while typing
- [ ] Content-based link suggestions
- [ ] Auto-complete for note names

**Link Templates:**
- [ ] Reusable link structure patterns
- [ ] Template variables and placeholders
- [ ] Template library

**Sequence Builder:**
- [ ] Tools to create sequences
- [ ] Sequence gap detection
- [ ] Auto-generate index pages
- [ ] Sequence metadata management

**Graph Queries:**
- [ ] Query language for link structures
- [ ] Save and reuse queries
- [ ] Query result visualization

### Phase 5 - Polish & Production (To Be Built)

**Performance:**
- [ ] Optimize for large vaults (10,000+ notes)
- [ ] Incremental cache updates
- [ ] Lazy loading of sequences
- [ ] Background processing for heavy operations
- [ ] Performance benchmarking

**UI/UX Improvements:**
- [ ] Sequence overview modal
- [ ] Path finder modal with graph
- [ ] Link statistics dashboard
- [ ] Improved visual indicators
- [ ] Custom icons and styling
- [ ] Dark mode support

**Testing:**
- [ ] Unit tests for core algorithms
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests
- [ ] Cross-platform testing

**Documentation:**
- [ ] User guide
- [ ] API documentation
- [ ] Video tutorials
- [ ] Example vaults
- [ ] Troubleshooting guide

**Release:**
- [ ] Submit to Obsidian community plugins
- [ ] Create release notes
- [ ] Set up changelog automation
- [ ] Community feedback integration

---

## 📊 Feature Completion Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: MVP | Complete | 100% |
| Phase 2: Link Management | Complete | 100% |
| Phase 3: Discovery | Planned | 0% |
| Phase 4: Advanced Features | Planned | 0% |
| Phase 5: Polish & Production | Planned | 0% |

**Overall Progress:** ~40% Complete

---

## 🎯 Immediate Next Actions

1. **Test Phase 1 & 2 features** with real vault scenarios
2. **Fix bugs** discovered during testing
3. **Begin Phase 3:** Start with path finding and similarity detection
4. **Create demo vault** with example sequences and link structures
5. **Write user documentation** for current features
6. **Gather feedback** from early users
