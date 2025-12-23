# LinkWeaver Development Guide

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Obsidian (latest version)
- Git

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/toonchavez8/obsdn-linkweaver.git
   cd obsdn-linkweaver
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin:**
   ```bash
   npm run build
   ```

## Development Workflow

### Building the Plugin

- **Development mode (with auto-rebuild):**
  ```bash
  npm run dev
  ```
  This watches for file changes and rebuilds automatically.

- **Production build:**
  ```bash
  npm run build
  ```

### Testing in Obsidian

1. **Create a test vault** (if you don't have one):
   - Open Obsidian
   - Create a new vault for testing

2. **Link the plugin to your test vault:**
   
   **Option A: Manual copy**
   - Navigate to your vault's plugins folder: `<vault>/.obsidian/plugins/`
   - Create a `linkweaver` folder
   - Copy `main.js`, `manifest.json`, and `styles.css` to this folder

   **Option B: Symbolic link (recommended)**
   
   Windows:
   ```bash
   mklink /D "<vault>\.obsidian\plugins\linkweaver" "g:\obsdn-linkweaver"
   ```
   
   Linux/Mac:
   ```bash
   ln -s /path/to/obsdn-linkweaver <vault>/.obsidian/plugins/linkweaver
   ```

3. **Enable the plugin:**
   - Open Obsidian Settings
   - Go to Community Plugins
   - Disable Safe Mode if needed
   - Find "LinkWeaver" in the list
   - Toggle it on

4. **Reload the plugin after changes:**
   - Open Command Palette (Ctrl/Cmd + P)
   - Run "Reload app without saving"
   - Or use Ctrl/Cmd + R

### Development Tools

- **Hot Reload Plugin**: Install the "Hot Reload" Obsidian plugin for automatic reload during development
- **Developer Console**: Open with Ctrl/Cmd + Shift + I to see console logs and errors

## Project Structure

```
obsdn-linkweaver/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── settings.ts             # Settings interface and defaults
│   ├── navigation/             # Sequential navigation logic
│   │   ├── sequence-detector.ts
│   │   ├── navigator.ts
│   │   └── patterns.ts
│   ├── links/                  # Link management
│   │   ├── link-manager.ts
│   │   ├── link-validator.ts
│   │   └── batch-operations.ts
│   ├── discovery/              # Path finding and similarity
│   │   ├── path-finder.ts
│   │   ├── similarity.ts
│   │   └── graph-query.ts
│   ├── ui/                     # User interface components
│   │   ├── settings-tab.ts
│   │   ├── modals.ts
│   │   └── status-bar.ts
│   └── utils/                  # Utility functions
│       ├── parser.ts
│       ├── sorter.ts
│       └── cache.ts
├── styles.css                  # Plugin styles
├── manifest.json               # Plugin metadata
├── package.json                # Node dependencies
├── tsconfig.json               # TypeScript configuration
└── esbuild.config.mjs         # Build configuration
```

## Coding Guidelines

### TypeScript

- Use strict type checking
- Prefer interfaces over type aliases for object shapes
- Document public APIs with JSDoc comments
- Use async/await for asynchronous operations

### Obsidian API Best Practices

- Always check if files exist before operations
- Use `app.vault.adapter` for file system operations
- Cache metadata when possible
- Clean up event handlers in `onunload()`

### Performance

- Implement caching for expensive operations
- Use debouncing for frequent operations
- Lazy load features when possible
- Profile performance with large vaults

## Testing

### Manual Testing Checklist

Create test notes with various patterns:
- `Note 1.md`, `Note 2.md`, `Note 10.md` (numeric)
- `Chapter 1.md`, `Chapter 2.md` (prefixed numeric)
- `2025-01-01.md`, `2025-01-02.md` (date-based)

Test commands:
- [ ] Navigate to next in sequence
- [ ] Navigate to previous in sequence
- [ ] Show link statistics
- [ ] Find orphaned notes
- [ ] Find path between notes

Test settings:
- [ ] Toggle sequential navigation
- [ ] Change circular navigation
- [ ] Modify link preview length
- [ ] Add/remove excluded folders

### Unit Testing (Future)

```bash
npm test
```

## Debugging

### Common Issues

**Plugin doesn't load:**
- Check console for errors (Ctrl/Cmd + Shift + I)
- Verify `manifest.json` is valid
- Ensure `main.js` was built successfully

**Changes not reflected:**
- Make sure dev build is running (`npm run dev`)
- Reload Obsidian (Ctrl/Cmd + R)
- Check if plugin is enabled in settings

**TypeScript errors:**
- Run `npm install` to ensure dependencies are installed
- Check `tsconfig.json` for configuration issues

### Debug Tips

1. Use `console.log()` liberally during development
2. Check Obsidian's developer console for errors
3. Use the debugger: Add `debugger;` statements in code
4. Test with a small vault first

## Release Process

### Version Bump

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

This automatically updates:
- `package.json` version
- `manifest.json` version
- `versions.json` compatibility info

### Creating a Release

1. **Update changelog:**
   - Document new features, fixes, and breaking changes

2. **Build production version:**
   ```bash
   npm run build
   ```

3. **Create Git tag:**
   ```bash
   git tag -a 0.1.0 -m "Release v0.1.0"
   git push origin 0.1.0
   ```

4. **Create GitHub release:**
   - Go to GitHub repository
   - Create new release from tag
   - Attach `main.js`, `manifest.json`, and `styles.css`
   - Add release notes

## Contributing

### Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create a Pull Request

### Code Review

- All PRs require review before merging
- Ensure CI passes (when implemented)
- Update documentation as needed
- Add tests for new features

## Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API Documentation](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Obsidian Plugin Samples](https://github.com/obsidianmd/obsidian-sample-plugin)

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/toonchavez8/obsdn-linkweaver/issues)
- Discussions: [Ask questions and share ideas](https://github.com/toonchavez8/obsdn-linkweaver/discussions)

## License

MIT License - See LICENSE file for details
