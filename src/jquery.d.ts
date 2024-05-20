/// <reference types="jquery" />

interface JCanvasPluginParams {
	name: string;
	props?: Record<string, any>;
	type?: string;
}

interface JCanvasCache {
	dataCache: Record<string, any>;
	propCache: Partial<JCanvasObject>;
	imageCache: Record<string, Image>;
}

interface JCanvas {
	events: Record<
		string,
		($canvas: JQuery<HTMLCanvasElement>, data: JCanvasInternalData) => void
	>;
	eventHooks: Record<string, (layer: JCanvasObject) => void>;
	future: Record<string, any>;
	extend: null | ((JCanvasPluginParams) => void);
}

interface JQueryEventWithFix extends JQuery.EventExtensions {
	fix: (event: Event) => Event;
}
