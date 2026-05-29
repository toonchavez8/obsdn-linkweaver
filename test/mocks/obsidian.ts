type Callback = (...args: unknown[]) => unknown;

export class TFolder {
	path: string;

	constructor(path: string) {
		this.path = path;
	}
}

export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	parent: TFolder | null;

	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
		this.extension = this.name.includes('.') ? this.name.split('.').pop() ?? '' : '';
		this.basename = this.name.replace(/\.[^/.]+$/, '');

		const parentPath = path.includes('/') ? path.split('/').slice(0, -1).join('/') : '';
		this.parent = new TFolder(parentPath);
	}
}

export class Notice {
	static messages: Array<{ message: string; timeout?: number }> = [];

	message: string;
	timeout?: number;

	constructor(message: string, timeout?: number) {
		this.message = message;
		this.timeout = timeout;
		Notice.messages.push({ message, timeout });
	}

	hide(): void {
		return;
	}

	static reset(): void {
		Notice.messages = [];
	}
}

export class Component {
	onunload(): void {
		return;
	}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = globalThis.document?.createElement('div') ?? ({ empty: () => undefined } as unknown as HTMLElement);
	}

	open(): void {
		this.onOpen?.();
	}

	close(): void {
		this.onClose?.();
	}

	onOpen?(): void;
	onClose?(): void;
}

export class Plugin extends Component {
	app!: App;

	addCommand = (command: unknown): unknown => command;
	addSettingTab = (tab: unknown): unknown => tab;
	addStatusBarItem = (): HTMLElement => globalThis.document?.createElement('div') ?? ({} as HTMLElement);
	registerEvent = (event: unknown): unknown => event;
	loadData = async (): Promise<unknown> => ({});
	saveData = async (_data: unknown): Promise<void> => undefined;
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = globalThis.document?.createElement('div') ?? ({} as HTMLElement);
	}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
	setName(_name: string): this { return this; }
	setDesc(_description: string): this { return this; }
	addToggle(_callback: Callback): this { return this; }
	addText(_callback: Callback): this { return this; }
}

export class MarkdownView {
	file: TFile | null = null;
}

export interface CachedMetadata {
	links?: Array<{
		link: string;
		displayText?: string;
		position: { start: { line: number } };
	}>;
	embeds?: Array<{
		link: string;
		displayText?: string;
		position: { start: { line: number } };
	}>;
}

export interface App {
	vault: {
		getMarkdownFiles(): TFile[];
		read(file: TFile): Promise<string>;
		modify(file: TFile, content: string): Promise<void>;
		getAbstractFileByPath(path: string): unknown;
		on?(name: string, callback: Callback): unknown;
	};
	metadataCache: {
		getFileCache(file: TFile): CachedMetadata | null;
		getFirstLinkpathDest(link: string, sourcePath: string): TFile | null;
	};
	workspace: {
		getActiveFile(): TFile | null;
		getLeaf(newLeaf?: boolean): { openFile(file: TFile): Promise<void> };
		getActiveViewOfType<T>(_viewType: unknown): T | null;
		on?(name: string, callback: Callback): unknown;
		activeEditor?: {
			editor?: {
				setCursor(position: { line: number; ch: number }): void;
				scrollIntoView(range: unknown, center?: boolean): void;
			}
		};
	};
}
