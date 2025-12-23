export interface PatternConfig {
	name: string;
	regex: string;
	enabled: boolean;
}

export interface LinkWeaverSettings {
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

export const DEFAULT_SETTINGS: LinkWeaverSettings = {
	// Sequential Navigation
	enableSequentialNav: true,
	customPatterns: [
		{
			name: 'Simple Numeric',
			regex: '(\\d+)',
			enabled: true
		},
		{
			name: 'Prefixed Numeric',
			regex: '^(.+?)(\\d+)$',
			enabled: true
		},
		{
			name: 'Date ISO',
			regex: '\\d{4}-\\d{2}-\\d{2}',
			enabled: true
		}
	],
	circularNavigation: false,
	showSequenceInStatusBar: true,
	
	// Link Management
	autoUpdateLinks: true,
	validateLinksOnSave: false,
	linkPreviewLength: 200,
	
	// Discovery
	maxPathDepth: 5,
	similarityThreshold: 0.5,
	excludeFolders: [],
	
	// UI
	enableHotkeys: true,
	showVisualIndicators: true
};
