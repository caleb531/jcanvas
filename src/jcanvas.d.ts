interface JCanvasPluginParams<TProps> {
	name: string;
	props?: Record<string, any>;
	type?: keyofJCanvasMapsdrawings;
	fn: (
		this: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		params: JCanvasObject & TProps
	) => void;
}

interface JCanvasMaps {
	drawings: Record<string, string>;
	touchEvents: Record<string, string>;
	mouseEvents: Record<string, string>;
}

interface JCanvasCache {
	dataCache: Record<string, any>;
	propCache: Partial<JCanvasObject>;
	imageCache: Record<string, HTMLImageElement>;
	pathCache: Record<string, Path2D>;
}

interface JCanvasBaseTransforms {
	rotate: number;
	scaleX: number;
	scaleY: number;
	translateX: number;
	translateY: number;
	masks: JCanvasObject[];
}

interface JCanvasPx {
	r: number;
	g: number;
	b: number;
	a: number;
}

type JCanvasLayerCallbackWithProps = (
	layer: JCanvasObject,
	props?: Partial<JCanvasObject>
) => void;

type JCanvasEventHooks = Record<string, JCanvasLayerCallbackWithProps>;

interface JCanvas {
	defaults: JCanvasDefaults;
	events: Record<string, ($canvas: JQuery, data: JCanvasInternalData) => void>;
	eventHooks: JCanvasEventHooks;
	future: Record<string, any>;
	extend<TProps extends object>(plugin: JCanvasPluginParams<TProps>): void;
	clearCache(): void;
	transformShape(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		params: jCanvasObject,
		width?: number | null,
		height?: number | null
	): void;
	detectEvents(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		params: jCanvasObject
	): void;
	closePath(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		params: jCanvasObject
	): void;
}

interface JQueryEventWithFix extends JQuery.EventExtensions {
	fix: (event: Event) => Event;
}

type JCanvasLayerId = JCanvasObject | string | number | RegExp | undefined;
type jCanvasLayerGroupId = JCanvasObject[] | string | RegExp;
type JCanvasLayerCallback = (layer: JCanvasObject) => void;
type JCanvasGetLayersCallback = (layer: JCanvasObject) => any;
type JCanvasStyleFunction = (
	layer: JCanvasObject
) => string | CanvasGradient | CanvasPattern;

type JCanvasObjectFunction = {
	new (this: JCanvasObject, args?: Partial<JCanvasObject>): JCanvasObject;
	(this: JCanvasObject, args?: Partial<JCanvasObject>): JCanvasObject;
};

interface JQueryStatic {
	jCanvas: JCanvas;
	jCanvasObject: JCanvasObjectFunction;
}

interface JQuery {
	getEventHooks(): JCanvasEventHooks;
	setEventHooks(eventHooks: JCanvasEventHooks): JQuery;
	getLayers(callback?: JCanvasGetLayersCallback): JCanvasObject[];
	getLayer(layerId: JCanvasLayerId): JCanvasObject | undefined;
	getLayerGroup(groupId: jCanvasLayerGroupId): JCanvasObject[] | undefined;
	getLayerIndex(layerId: JCanvasLayerId): number;
	setLayer(layerId: JCanvasLayerId, props: Partial<JCanvasObject>): JQuery;
	setLayers(
		props: Partial<JCanvasObject>,
		callback: JCanvasGetLayersCallback
	): JQuery;
	setLayerGroup(
		groupId: jCanvasLayerGroupId,
		props: Partial<JCanvasObject>
	): JQuery;
	moveLayer(layerId: JCanvasLayerId, index: number): JQuery;
	removeLayer(layerId: JCanvasLayerId): JQuery;
	removeLayers(callback?: JCanvasLayerCallback): JQuery;
	removeLayerGroup(groupId: jCanvasLayerGroupId): JQuery;
	addLayerToGroup(layerId: JCanvasLayerId, groupName: string): JQuery;
	removeLayerFromGroup(layerId: JCanvasLayerId, groupName: string): JQuery;
	triggerLayerEvent(layerId: JCanvasLayerId, eventType: string): JQuery;
	drawLayer(layerId: JCanvasLayerId, groupName: string): void;
	drawLayers(args?: {
		clear?: boolean;
		resetFire?: boolean;
		index?: number;
		complete?: () => void;
	}): void;
	addLayer(args: Partial<JCanvasObject>): void;
	animateLayer(
		layerId: JCanvasLayerId,
		props: Partial<JCanvasAnimatableProps>,
		...args: any[]
	): void;
	animateLayerGroup(
		groupId: jCanvasLayerGroupId,
		props: Partial<JCanvasObject>,
		...args: any[]
	): void;
	delayLayer(layerId: JCanvasLayerId, duration: number): void;
	delayLayerGroup(groupId: jCanvasLayerGroupId, duration: number): void;
	stopLayer(layerId: JCanvasLayerId, clearQueue?: boolean): void;
	stopLayerGroup(groupId: jCanvasLayerGroupId, clearQueue?: boolean): void;
	draw(args: Partial<JCanvasObject>): JQuery;
	clearCanvas(args?: JCanvasObject): JQuery;
	saveCanvas(args?: JCanvasObject): JQuery;
	restoreCanvas(args?: JCanvasObject): JQuery;
	rotateCanvas(args?: JCanvasObject): JQuery;
	scaleCanvas(args?: JCanvasObject): JQuery;
	translateCanvas(args?: JCanvasObject): JQuery;
	drawRect(args: Partial<JCanvasObject>): JQuery;
	drawArc(args: Partial<JCanvasObject>): JQuery;
	drawEllipse(args: Partial<JCanvasObject>): JQuery;
	drawPolygon(args: Partial<JCanvasObject>): JQuery;
	drawSlice(args: Partial<JCanvasObject>): JQuery;
	drawLine(args: Partial<JCanvasObject>): JQuery;
	drawQuadratic(args: Partial<JCanvasObject>): JQuery;
	drawBezier(args: Partial<JCanvasObject>): JQuery;
	drawVector(args: Partial<JCanvasObject>): JQuery;
	drawPath(args: Partial<JCanvasObject>): JQuery;
	drawText(args: Partial<JCanvasObject>): JQuery;
	measureText(args: JCanvasLayerId): JCanvasObject;
	drawImage(args: Partial<JCanvasObject>): JQuery;
	createPattern(args: Partial<JCanvasObject>): CanvasPattern | null;
	createGradient(args: Partial<JCanvasObject>): CanvasGradient | null;
	setPixels(args: Partial<JCanvasObject>): void;
	getCanvasImage(type: string, quality?: number): string | null;
	detectPixelRatio(callback?: (ratio: number) => void): JQuery;
}

interface JCanvasDefaults {
	align: CanvasRenderingContext2D["textAlign"];
	arrowAngle: number;
	arrowRadius: number;
	autosave: boolean;
	baseline: CanvasRenderingContext2D["textBaseline"];
	bringToFront: boolean;
	canvas: HTMLCanvasElement | null;
	ccw: boolean;
	closed: boolean;
	compositing: CanvasRenderingContext2D["globalCompositeOperation"];
	concavity: number;
	cornerRadius: number;
	count: number;
	cropFromCenter: boolean;
	crossOrigin: HTMLImageElement["crossOrigin"];
	cursors: Record<string, string> | null;
	disableEvents: boolean;
	draggable: boolean;
	dragging: boolean;
	dragGroups: string[] | null;
	groups: string[] | null;
	d: string | null;
	data: object | null;
	dx: number;
	dy: number;
	end: number;
	eventX: number | null;
	eventY: number | null;
	fillRule: CanvasFillRule;
	fillStyle: string | CanvasGradient | CanvasPattern | JCanvasStyleFunction;
	fontStyle: string;
	fontSize: string;
	fontFamily: string;
	fromCenter: boolean;
	height: number | null;
	imageSmoothing: boolean;
	inDegrees: boolean;
	intangible: boolean;
	index: number | null;
	intersects: boolean;
	letterSpacing: number | null;
	lineHeight: number;
	layer: boolean;
	mask: boolean;
	maxWidth: number | null;
	method: keyof JQuery | null;
	miterLimit: number;
	name: string | null;
	opacity: number;
	r1: number | null;
	r2: number | null;
	radius: number;
	repeat: Parameters<CanvasRenderingContext2D["createPattern"]>[1];
	respectAlign: boolean;
	restrictDragToAxis: "x" | "y" | null;
	rotate: number;
	rounded: boolean;
	scale: number;
	scaleX: number;
	scaleY: number;
	shadowBlur: number;
	shadowColor: string;
	shadowStroke: boolean;
	shadowX: number;
	shadowY: number;
	sHeight: number | null;
	sides: number;
	source: string | HTMLImageElement | HTMLCanvasElement;
	spread: number;
	start: number;
	strokeCap: CanvasRenderingContext2D["lineCap"];
	strokeDash: number[] | null;
	strokeDashOffset: CanvasRenderingContext2D["lineDashOffset"];
	strokeJoin: CanvasRenderingContext2D["lineJoin"];
	strokeStyle: string | CanvasGradient | CanvasPattern | JCanvasStyleFunction;
	strokeWidth: number;
	sWidth: number | null;
	sx: number | null;
	sy: number | null;
	text: string;
	translate: number;
	translateX: number;
	translateY: number;
	type: keyof JCanvasMaps["drawings"] | null;
	visible: boolean;
	width: number | null;
	x: number;
	y: number;
	each?: (
		this: HTMLCanvasElement,
		px: JCanvasPx,
		params: JCanvasObject
	) => void;
	load?: (
		this: HTMLCanvasElement,
		arg: JCanvasObject | CanvasPattern | null
	) => void;
	click?: JCanvasLayerCallback;
	dblclick?: JCanvasLayerCallback;
	mousedown?: JCanvasLayerCallback;
	mouseup?: JCanvasLayerCallback;
	mousemove?: JCanvasLayerCallback;
	mouseover?: JCanvasLayerCallback;
	mouseout?: JCanvasLayerCallback;
	touchstart?: JCanvasLayerCallback;
	touchend?: JCanvasLayerCallback;
	touchmove?: JCanvasLayerCallback;
	dragstart?: JCanvasLayerCallback;
	dragstop?: JCanvasLayerCallback;
	drag?: JCanvasLayerCallback;
	dragcancel?: JCanvasLayerCallback;
	updateDragX?: (layer: JCanvasObject, newX: number) => number;
	updateDragY?: (layer: JCanvasObject, newY: number) => number;
	pointerdown?: JCanvasLayerCallback;
	pointerup?: JCanvasLayerCallback;
	pointermove?: JCanvasLayerCallback;
	contextmenu?: JCanvasLayerCallback;
	add?: JCanvasLayerCallback;
	remove?: JCanvasLayerCallback;
	change?: JCanvasLayerCallbackWithProps;
	move?: JCanvasLayerCallback;
	animatestart?: JCanvasLayerCallback;
	animate?: (layer: JCanvasObject, fx: JQuery.Tween) => void;
	animateend?: JCanvasLayerCallback;
	stop?: JCanvasLayerCallback;
	delay?: JCanvasLayerCallback;
	[key: `x${number}`]: number;
	[key: `y${number}`]: number;
	[key: `cx${number}`]: number;
	[key: `cy${number}`]: number;
	[key: `a${number}`]: number;
	[key: `l${number}`]: number;
	[key: `p${number}`]: number;
	[key: `_${string}`]: any;
	[key: string]: any;
}

interface JCanvasObject extends JCanvasDefaults {}

interface JCanvasPropHooks {
	[key: string]: JQuery.PropHook<JCanvasObject>;
}

type NumberProperties = {
	[K in keyof JCanvasObject]: JCanvasObject[K] extends number ? K : never;
};

type JCanvasAnimatableProps = {
	[K in keyof NumberProperties]: NumberProperties[K] | number | string;
};
