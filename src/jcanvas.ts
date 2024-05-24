/// <reference path="./jcanvas.d.ts" />
/**
 * @license jCanvas v21.0.1
 * Copyright 2017 Caleb Evans
 * Released under the MIT license
 */
import $ from "jquery";

// Define local aliases to frequently used properties
const extendObject = $.extend,
	inArray = $.inArray,
	typeOf = function (operand: any) {
		return Object.prototype.toString.call(operand).slice(8, -1).toLowerCase();
	},
	isPlainObject = $.isPlainObject,
	// Math constants and functions
	PI = Math.PI,
	round = Math.round,
	abs = Math.abs,
	sin = Math.sin,
	cos = Math.cos,
	atan2 = Math.atan2,
	// The Array slice() method
	arraySlice = Array.prototype.slice,
	// jQuery's internal event normalization function
	jQueryEventFix = ($.event as JQueryEventWithFix).fix,
	// Object for storing a number of internal property maps
	maps: JCanvasMaps = {
		// Map drawing names with their respective method names
		drawings: {
			arc: "drawArc",
			bezier: "drawBezier",
			ellipse: "drawEllipse",
			function: "draw",
			image: "drawImage",
			line: "drawLine",
			path: "drawPath",
			polygon: "drawPolygon",
			slice: "drawSlice",
			quadratic: "drawQuadratic",
			rectangle: "drawRect",
			text: "drawText",
			vector: "drawVector",
			save: "saveCanvas",
			restore: "restoreCanvas",
			rotate: "rotateCanvas",
			scale: "scaleCanvas",
			translate: "translateCanvas",
		},
		touchEvents: {
			mousedown: "touchstart",
			mouseup: "touchend",
			mousemove: "touchmove",
		},
		// Map standard touch events to mouse events
		mouseEvents: {
			touchstart: "mousedown",
			touchend: "mouseup",
			touchmove: "mousemove",
		},
	},
	// jQuery internal caches
	caches: JCanvasCache = {
		dataCache: {},
		propCache: {},
		imageCache: {},
	},
	// Base transformations
	baseTransforms: JCanvasBaseTransforms = {
		rotate: 0,
		scaleX: 1,
		scaleY: 1,
		translateX: 0,
		translateY: 0,
		// Store all previous masks
		masks: [],
	},
	css = {
		// Define properties used in both CSS and jCanvas
		props: ["width", "height", "opacity", "lineHeight"],
		// List of CSS3 cursors that need to be prefixed
		cursors: ["grab", "grabbing", "zoom-in", "zoom-out"],
		propsObj: {} as Record<string, boolean>,
	},
	tangibleEvents = [
		"mousedown",
		"mousemove",
		"mouseup",
		"mouseover",
		"mouseout",
		"touchstart",
		"touchmove",
		"touchend",
	];

// jCanvas object in which global settings are other data are stored
const jCanvas = {
	// Events object for storing jCanvas event initiation functions
	events: {},
	// Object containing all jCanvas event hooks
	eventHooks: {},
	// Settings for enabling future jCanvas features
	future: {},
	// Need to type assert since some public API methods like transformShape are
	// lazily added to this object
} as JCanvas;

// jCanvas default property values
class jCanvasDefaults implements JCanvasDefaults {
	align: CanvasRenderingContext2D["textAlign"] = "center";
	arrowAngle: number = 90;
	arrowRadius: number = 0;
	autosave: boolean = true;
	baseline: CanvasRenderingContext2D["textBaseline"] = "middle";
	bringToFront: boolean = false;
	ccw: boolean = false;
	closed: boolean = false;
	compositing: CanvasRenderingContext2D["globalCompositeOperation"] =
		"source-over";
	concavity: number = 0;
	cornerRadius: number = 0;
	count: number = 1;
	cropFromCenter: boolean = true;
	crossOrigin: HTMLImageElement["crossOrigin"] = null;
	cursors: Record<string, string> | null = null;
	disableEvents: boolean = false;
	draggable: boolean = false;
	dragGroups: string[] | null = null;
	groups: string[] | null = null;
	data: object | null = null;
	dx: number = 0;
	dy: number = 0;
	end: number = 360;
	eventX: number | null = null;
	eventY: number | null = null;
	fillStyle: string | Function = "transparent";
	fontStyle: string = "normal";
	fontSize: string = "12pt";
	fontFamily: string = "sans-serif";
	fromCenter: boolean = true;
	height: number | null = null;
	imageSmoothing: boolean = true;
	inDegrees: boolean = true;
	intangible: boolean = false;
	index: number | null = null;
	letterSpacing: number | null = null;
	lineHeight: number = 1;
	layer: boolean = false;
	mask: boolean = false;
	maxWidth: number | null = null;
	miterLimit: number = 10;
	name: string | null = null;
	opacity: number = 1;
	r1: number | null = null;
	r2: number | null = null;
	radius: number = 0;
	repeat: Parameters<CanvasRenderingContext2D["createPattern"]>[1] = "repeat";
	respectAlign: boolean = false;
	restrictDragToAxis: "x" | "y" | null = null;
	rotate: number = 0;
	rounded: boolean = false;
	scale: number = 1;
	scaleX: number = 1;
	scaleY: number = 1;
	shadowBlur: number = 0;
	shadowColor: string = "transparent";
	shadowStroke: boolean = false;
	shadowX: number = 0;
	shadowY: number = 0;
	sHeight: number | null = null;
	sides: number = 0;
	source: string | HTMLImageElement | HTMLCanvasElement = "";
	spread: number = 0;
	start: number = 0;
	strokeCap: CanvasRenderingContext2D["lineCap"] = "butt";
	strokeDash: number[] | null = null;
	strokeDashOffset: CanvasRenderingContext2D["lineDashOffset"] = 0;
	strokeJoin: CanvasRenderingContext2D["lineJoin"] = "miter";
	strokeStyle: string | Function = "transparent";
	strokeWidth: number = 1;
	sWidth: number | null = null;
	sx: number | null = null;
	sy: number | null = null;
	text: string = "";
	translate: number = 0;
	translateX: number = 0;
	translateY: number = 0;
	type: keyof (typeof maps)["drawings"] | null = null;
	visible: boolean = true;
	width: number | null = null;
	x: number = 0;
	y: number = 0;
	[key: string]: any;
}
const defaults = new jCanvasDefaults();

// Constructor for creating objects that inherit from jCanvas preferences and defaults
class jCanvasObject extends jCanvasDefaults implements JCanvasObject {
	constructor(args?: jCanvasObject) {
		super();
		extendObject(this, args);
	}
}
jCanvasObject.prototype = defaults;

/* Internal helper methods */

// Determines if the given operand is a string
function isString(operand: any): operand is string {
	return typeOf(operand) === "string";
}

// Determines if the given operand is a function
function isFunction(operand: any): operand is Function {
	return typeOf(operand) === "function";
}

// Determines if the given operand is a function
function isObject<T extends object>(operand: any): operand is T {
	return typeOf(operand) === "object";
}

// Determines if the given operand is numeric
function isNumeric(operand: any): operand is number | string {
	return !isNaN(Number(operand)) && !isNaN(parseFloat(operand));
}

// Tells TypeScript that the given element is a canvas
function _isCanvas(element: HTMLElement): element is HTMLCanvasElement {
	return element instanceof HTMLCanvasElement;
}

// Get 2D context for the given canvas
function _getContext(
	canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
	return canvas.getContext("2d");
}

// Coerce designated number properties from strings to numbers
function _coerceNumericProps(props: Partial<jCanvasObject>) {
	// Loop through all properties in given property map
	for (const propName in props) {
		if (Object.prototype.hasOwnProperty.call(props, propName)) {
			const propValue = props[propName];
			const propType = typeOf(propValue);
			// If property is non-empty string and value is numeric
			if (
				propType === "string" &&
				isNumeric(propValue) &&
				propName !== "text"
			) {
				// Convert value to number
				props[propName] = parseFloat(String(propValue));
			}
		}
	}
	// Ensure value of text property is always a string
	if (props.text !== undefined) {
		props.text = String(props.text);
	}
}

// Clone the given transformations object
function _cloneTransforms(transforms: JCanvasBaseTransforms) {
	// Clone the object itself
	transforms = extendObject({}, transforms);
	// Clone the object's masks array
	transforms.masks = transforms.masks.slice(0);
	return transforms;
}

// Save canvas context and update transformation stack
function _saveCanvas(ctx: CanvasRenderingContext2D, data: JCanvasInternalData) {
	let transforms;
	ctx.save();
	transforms = _cloneTransforms(data.transforms);
	data.savedTransforms.push(transforms);
}

// Restore canvas context update transformation stack
function _restoreCanvas(
	ctx: CanvasRenderingContext2D,
	data: JCanvasInternalData
) {
	if (data.savedTransforms.length === 0) {
		// Reset transformation state if it can't be restored any more
		data.transforms = _cloneTransforms(baseTransforms);
	} else {
		// Restore canvas context
		ctx.restore();
		// Restore current transform state to the last saved state
		const lastTransform = data.savedTransforms.pop();
		if (lastTransform) {
			data.transforms = lastTransform;
		}
	}
}

// Set the style with the given name
function _setStyle(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	styleName: "fillStyle" | "strokeStyle"
) {
	const styleValue = params[styleName];
	if (styleValue) {
		if (isFunction(styleValue)) {
			// Handle functions
			ctx[styleName] = styleValue.call(canvas, params);
		} else {
			// Handle string values
			ctx[styleName] = styleValue;
		}
	}
}

// Set canvas context properties
function _setGlobalProps(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject
) {
	_setStyle(canvas, ctx, params, "fillStyle");
	_setStyle(canvas, ctx, params, "strokeStyle");
	ctx.lineWidth = params.strokeWidth;
	// Optionally round corners for paths
	if (params.rounded) {
		ctx.lineCap = ctx.lineJoin = "round";
	} else {
		ctx.lineCap = params.strokeCap;
		ctx.lineJoin = params.strokeJoin;
		ctx.miterLimit = params.miterLimit;
	}
	// Reset strokeDash if null
	if (!params.strokeDash) {
		params.strokeDash = [];
	}
	// Dashed lines
	if (ctx.setLineDash) {
		ctx.setLineDash(params.strokeDash);
	}
	// @ts-expect-error
	ctx.webkitLineDash = params.strokeDash;
	ctx.lineDashOffset =
		// @ts-expect-error
		ctx.webkitLineDashOffset =
		// @ts-expect-error
		ctx.mozDashOffset =
			params.strokeDashOffset;
	// Drop shadow
	ctx.shadowOffsetX = params.shadowX;
	ctx.shadowOffsetY = params.shadowY;
	ctx.shadowBlur = params.shadowBlur;
	ctx.shadowColor = params.shadowColor;
	// Opacity and composite operation
	ctx.globalAlpha = params.opacity;
	ctx.globalCompositeOperation = params.compositing;
	// Support cross-browser toggling of image smoothing
	if (params.imageSmoothing) {
		ctx.imageSmoothingEnabled = params.imageSmoothing;
	}
}

// Optionally enable masking support for this path
function _enableMasking(
	ctx: CanvasRenderingContext2D,
	data: JCanvasInternalData,
	params: jCanvasObject
) {
	if (params.mask) {
		// If jCanvas autosave is enabled
		if (params.autosave) {
			// Automatically save transformation state by default
			_saveCanvas(ctx, data);
		}
		// Clip the current path
		ctx.clip();
		// Keep track of current masks
		data.transforms.masks.push(params._args);
	}
}

// Restore individual shape transformation
function _restoreTransform(
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject
) {
	// If shape has been transformed by jCanvas
	if (params._transformed) {
		// Restore canvas context
		ctx.restore();
	}
}

// Close current canvas path
function _closePath(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject
) {
	let data;

	// Optionally close path
	if (params.closed) {
		ctx.closePath();
	}

	if (params.shadowStroke && params.strokeWidth !== 0) {
		// Extend the shadow to include the stroke of a drawing

		// Add a stroke shadow by stroking before filling
		ctx.stroke();
		ctx.fill();
		// Ensure the below stroking does not inherit a shadow
		ctx.shadowColor = "transparent";
		ctx.shadowBlur = 0;
		// Stroke over fill as usual
		ctx.stroke();
	} else {
		// If shadowStroke is not enabled, stroke & fill as usual

		ctx.fill();
		// Prevent extra shadow created by stroke (but only when fill is present)
		if (params.fillStyle !== "transparent") {
			ctx.shadowColor = "transparent";
		}
		if (params.strokeWidth !== 0) {
			// Only stroke if the stroke is not 0
			ctx.stroke();
		}
	}

	// Optionally close path
	if (!params.closed) {
		ctx.closePath();
	}

	// Restore individual shape transformation
	_restoreTransform(ctx, params);

	// Mask shape if chosen
	if (params.mask) {
		// Retrieve canvas data
		data = _getCanvasData(canvas);
		_enableMasking(ctx, data, params);
	}
}

// Transform (translate, scale, or rotate) shape
function _transformShape(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	width: number | null = null,
	height: number | null = null
) {
	// Get conversion factor for radians
	params._toRad = params.inDegrees ? PI / 180 : 1;

	params._transformed = true;
	ctx.save();

	// Optionally measure (x, y) position from top-left corner
	if (
		!params.fromCenter &&
		!params._centered &&
		width !== null &&
		height !== null
	) {
		// Always draw from center unless otherwise specified
		if (height === undefined) {
			height = width;
		}
		params.x += width / 2;
		params.y += height / 2;
		params._centered = true;
	}
	// Optionally rotate shape
	if (params.rotate) {
		_rotateCanvas(ctx, params, null);
	}
	// Optionally scale shape
	if (params.scale !== 1 || params.scaleX !== 1 || params.scaleY !== 1) {
		_scaleCanvas(ctx, params, null);
	}
	// Optionally translate shape
	if (params.translate || params.translateX || params.translateY) {
		_translateCanvas(ctx, params, null);
	}
}

/* Plugin API */

// Extend jCanvas with a user-defined method
jCanvas.extend = function extend(plugin) {
	// Create plugin
	if (plugin.name) {
		// Merge properties with defaults
		if (plugin.props) {
			extendObject(defaults, plugin.props);
		}
		// Define plugin method
		// @ts-expect-error TODO: fix this
		$.fn[plugin.name] = function self(args) {
			const $canvases = this;
			let canvas, params;

			for (let e = 0; e < $canvases.length; e += 1) {
				const canvas = $canvases[e];
				if (!_isCanvas(canvas)) {
					continue;
				}
				const ctx = _getContext(canvas);
				if (!ctx) {
					continue;
				}
				const params = new jCanvasObject(args);
				_addLayer(canvas, params, args, self);

				_setGlobalProps(canvas, ctx, params);
				plugin.fn.call(canvas, ctx, params);
			}
			return $canvases;
		};
		// Add drawing type to drawing map
		if (plugin.type) {
			maps.drawings[String(plugin.type)] = plugin.name;
		}
	}
	// @ts-expect-error TODO: fix this
	return $.fn[plugin.name];
};

/* Layer API */

class JCanvasInternalData {
	// The associated canvas element
	canvas: HTMLCanvasElement;
	// Layers array
	layers: jCanvasObject[] = [];
	// Layer maps
	layer: {
		names: Record<string, jCanvasObject>;
		groups: Record<string, jCanvasObject[]>;
	} = {
		names: {},
		groups: {},
	};
	eventHooks = {};
	// All layers that intersect with the event coordinates (regardless of visibility)
	intersecting: jCanvasObject[] = [];
	// The topmost layer whose area contains the event coordinates
	lastIntersected = null;
	cursor: string;
	// Properties for the current drag event
	drag = {
		layer: null as jCanvasObject | null,
		dragging: false,
	};
	// Data for the current event
	event: {
		type: string | null;
		x: number | null;
		y: number | null;
		event?: Event | null;
	} = {
		type: null,
		x: null,
		y: null,
	};
	// Events which already have been bound to the canvas
	events: Record<string, boolean> = {};
	// The canvas's current transformation state
	transforms: JCanvasBaseTransforms;
	savedTransforms: JCanvasBaseTransforms[] = [];
	// Whether a layer is being animated or not
	animating = false;
	// The layer currently being animated
	animated: jCanvasObject | null = null;
	// The device pixel ratio
	pixelRatio = 1;
	// Whether pixel ratio transformations have been applied
	scaled = false;
	// Whether the canvas should be redrawn when a layer mousemove
	// event triggers (either directly, or indirectly via dragging)
	redrawOnMousemove = false;
	originalRedrawOnMousemove = false;
	drawLayersComplete?: () => void;
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.cursor = $(canvas).css("cursor");
		this.transforms = _cloneTransforms(baseTransforms);
	}
}

// Retrieved the stored jCanvas data for a canvas element
function _getCanvasData(canvas: HTMLCanvasElement) {
	let dataCache = caches.dataCache,
		data;
	if (dataCache._canvas === canvas && dataCache._data) {
		// Retrieve canvas data from cache if possible
		data = dataCache._data;
	} else {
		// Retrieve canvas data from jQuery's internal data storage
		data = $.data(canvas, "jCanvas");
		if (!data) {
			// Create canvas data object if it does not already exist
			data = new JCanvasInternalData(canvas);
			// Use jQuery to store canvas data
			$.data(canvas, "jCanvas", data);
		}
		// Cache canvas data for faster retrieval
		dataCache._canvas = canvas;
		dataCache._data = data;
	}
	return data;
}

// Initialize all of a layer's associated jCanvas events
function _addLayerEvents(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData,
	layer: jCanvasObject
) {
	// Determine which jCanvas events need to be bound to this layer
	for (let eventName in jCanvas.events) {
		if (Object.prototype.hasOwnProperty.call(jCanvas.events, eventName)) {
			// If layer has callback function to complement it
			if (layer[eventName] || (layer.cursors && layer.cursors[eventName])) {
				// Bind event to layer
				_addExplicitLayerEvent($canvas, data, layer, eventName);
			}
		}
	}
	if (!data.events.mouseout) {
		$canvas.on("mouseout.jCanvas", function () {
			// Retrieve the layer whose drag event was canceled
			const dragLayer = data.drag.layer;
			// If cursor mouses out of canvas while dragging
			if (dragLayer) {
				// Cancel drag
				data.drag = { layer: null, dragging: false };
				_triggerLayerEvent($canvas, data, dragLayer, "dragcancel");
			}
			// Loop through all layers
			for (let l = 0; l < data.layers.length; l += 1) {
				layer = data.layers[l];
				// If layer thinks it's still being moused over
				if (layer && layer._hovered) {
					// Trigger mouseout on layer
					$canvas.triggerLayerEvent(data.layers[l], "mouseout");
				}
			}
			// Redraw layers
			$canvas.drawLayers();
		});
		// Indicate that an event handler has been bound
		data.events.mouseout = true;
	}
}

// Initialize the given event on the given layer
function _addLayerEvent(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData,
	layer: jCanvasObject,
	eventName: string
) {
	// Use touch events if appropriate
	// eventName = _getMouseEventName(eventName);
	// Bind event to layer
	jCanvas.events[eventName]($canvas, data);
	layer._event = true;
}

// Add a layer event that was explicitly declared in the layer's parameter map,
// excluding events added implicitly (e.g. mousemove event required by draggable
// layers)
function _addExplicitLayerEvent(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData,
	layer: jCanvasObject,
	eventName: string
) {
	_addLayerEvent($canvas, data, layer, eventName);
	if (
		eventName === "mouseover" ||
		eventName === "mouseout" ||
		eventName === "mousemove"
	) {
		data.redrawOnMousemove = true;
	}
}

// Enable drag support for this layer
function _enableDrag(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData,
	layer: jCanvasObject
) {
	// Only make layer draggable if necessary
	if (layer.draggable || layer.cursors) {
		// Organize helper events which enable drag support
		const dragHelperEvents = ["mousedown", "mousemove", "mouseup"];

		// Bind each helper event to the canvas
		for (let i = 0; i < dragHelperEvents.length; i += 1) {
			// Use touch events if appropriate
			const eventName = dragHelperEvents[i];
			// Bind event
			_addLayerEvent($canvas, data, layer, eventName);
		}
		// Indicate that this layer has events bound to it
		layer._event = true;
	}
}

// Update a layer property map if property is changed
function _updateLayerName(
	data: JCanvasInternalData,
	layer: jCanvasObject,
	props?: Partial<jCanvasObject>
) {
	const nameMap = data.layer.names;

	// If layer name is being added, not changed
	if (!props) {
		props = layer;
	} else {
		// Remove old layer name entry because layer name has changed
		if (
			props.name !== undefined &&
			isString(layer.name) &&
			layer.name !== props.name
		) {
			delete nameMap[layer.name];
		}
	}

	// Add new entry to layer name map with new name
	if (isString(props.name)) {
		nameMap[props.name] = layer;
	}
}

// Create or update the data map for the given layer and group type
function _updateLayerGroups(
	data: JCanvasInternalData,
	layer: jCanvasObject,
	props?: Partial<jCanvasObject>
) {
	let groupMap = data.layer.groups;
	let index: number | undefined = undefined;

	// If group name is not changing
	if (!props) {
		props = layer;
	} else {
		// Remove layer from all of its associated groups
		if (props.groups !== undefined && layer.groups !== null) {
			for (let g = 0; g < layer.groups.length; g += 1) {
				const groupName = layer.groups[g];
				const group = groupMap[groupName];
				if (group) {
					// Remove layer from its old layer group entry
					for (let l = 0; l < group.length; l += 1) {
						if (group[l] === layer) {
							// Keep track of the layer's initial index
							index = l;
							// Remove layer once found
							group.splice(l, 1);
							break;
						}
					}
					// Remove layer group entry if group is empty
					if (group.length === 0) {
						delete groupMap[groupName];
					}
				}
			}
		}
	}

	// Add layer to new group if a new group name is given
	if (props.groups !== undefined && props.groups !== null) {
		for (let g = 0; g < props.groups.length; g += 1) {
			const groupName = props.groups[g];

			let group = groupMap[groupName];
			if (!group) {
				// Create new group entry if it doesn't exist
				group = groupMap[groupName] = [];
			}
			if (index === undefined) {
				// Add layer to end of group unless otherwise stated
				index = group.length;
			}
			// Add layer to its new layer group
			group.splice(index, 0, layer);
		}
	}
}

// Get event hooks object for the first selected canvas
$.fn.getEventHooks = function getEventHooks() {
	const $canvases = this;

	if ($canvases.length !== 0) {
		const canvas = $canvases[0];
		if (!_isCanvas(canvas)) {
			return {};
		}
		const data = _getCanvasData(canvas);
		return data.eventHooks;
	}
	return {};
};

// Set event hooks for the selected canvases
$.fn.setEventHooks = function setEventHooks(eventHooks) {
	const $canvases = this;
	let data;
	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		data = _getCanvasData(canvas);
		extendObject(data.eventHooks, eventHooks);
	}
	return $canvases;
};

// Get jCanvas layers array
$.fn.getLayers = function getLayers(callback) {
	const $canvases = this;
	let matching: jCanvasObject[] = [];

	if ($canvases.length !== 0) {
		const canvas = $canvases[0];
		if (!_isCanvas(canvas)) {
			return matching;
		}
		const data = _getCanvasData(canvas);
		// Retrieve layers array for this canvas
		const layers = data.layers;

		// If a callback function is given
		if (isFunction(callback)) {
			// Filter the layers array using the callback
			for (let l = 0; l < layers.length; l += 1) {
				const layer = layers[l];
				if (callback.call(canvas, layer)) {
					// Add layer to array of matching layers if test passes
					matching.push(layer);
				}
			}
		} else {
			// Otherwise, get all layers

			matching = layers;
		}
	}
	return matching;
};

// Get a single jCanvas layer object
$.fn.getLayer = function getLayer(layerId) {
	const $canvases = this;
	let canvas, data, layers, layer, l, idType;

	if ($canvases.length !== 0) {
		const canvas = $canvases[0];
		if (!_isCanvas(canvas)) {
			return null;
		}
		const data = _getCanvasData(canvas);
		const layers = data.layers;
		const idType = typeOf(layerId);

		if (
			layerId &&
			typeof layerId === "object" &&
			"layer" in layerId &&
			layerId.layer
		) {
			// Return the actual layer object if given
			layer = layerId as jCanvasObject;
		} else if (idType === "number") {
			// Retrieve the layer using the given index

			let layerIndex = layerId as number;

			// Allow for negative indices
			if (layerIndex < 0) {
				layerIndex = layers.length + layerIndex;
			}
			// Get layer with the given index
			layer = layers[layerIndex];
		} else if (idType === "regexp") {
			let layerPattern = layerId as RegExp;
			// Get layer with the name that matches the given regex
			for (let l = 0; l < layers.length; l += 1) {
				// Check if layer matches name
				if (isString(layers[l].name) && layers[l].name.match(layerPattern)) {
					layer = layers[l];
					break;
				}
			}
		} else {
			let layerName = layerId as string;
			// Get layer with the given name
			layer = data.layer.names[layerName];
		}
	}
	return layer;
};

// Get all layers in the given group
$.fn.getLayerGroup = function getLayerGroup(groupId) {
	const $canvases = this;
	const idType = typeOf(groupId);

	let group: jCanvasObject[];
	if ($canvases.length !== 0) {
		const canvas = $canvases[0];
		if (!_isCanvas(canvas)) {
			return [];
		}

		if (idType === "array") {
			// Return layer group if given
			return groupId as Exclude<typeof groupId, string>;
		} else if (idType === "regexp") {
			let groupPattern = groupId as RegExp;
			// Get canvas data
			const data = _getCanvasData(canvas);
			const groups = data.layer.groups;
			// Loop through all layers groups for this canvas
			for (let groupName in groups) {
				// Find a group whose name matches the given regex
				if (groupName.match(groupPattern)) {
					// Stop after finding the first matching group
					return groups[groupName];
				}
			}
		} else if (typeof groupId === "string") {
			// Find layer group with the given group name
			let groupName = groupId as string;
			const data = _getCanvasData(canvas);
			return data.layer.groups[groupName];
		}
	}
};

// Get index of layer in layers array
$.fn.getLayerIndex = function getLayerIndex(layerId) {
	const $canvases = this;
	const layers = $canvases.getLayers();
	const layer = $canvases.getLayer(layerId);

	return inArray(layer, layers);
};

// Set properties of a layer
$.fn.setLayer = function setLayer(layerId, props) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);

		const layer = $($canvases[e]).getLayer(layerId);
		if (layer) {
			// Update layer property maps
			_updateLayerName(data, layer, props);
			_updateLayerGroups(data, layer, props);

			_coerceNumericProps(props);

			// Merge properties with layer
			for (const propName in props) {
				if (Object.prototype.hasOwnProperty.call(props, propName)) {
					const propValue = props[propName];
					const propType = typeOf(propValue);
					if (propType === "object" && isPlainObject(propValue)) {
						// Clone objects
						layer[propName] = extendObject({}, propValue);
						_coerceNumericProps(layer[propName]);
					} else if (propType === "array") {
						// Clone arrays
						layer[propName] = propValue.slice(0);
					} else if (propType === "string") {
						if (propValue.indexOf("+=") === 0) {
							// Increment numbers prefixed with +=
							layer[propName] += parseFloat(propValue.substr(2));
						} else if (propValue.indexOf("-=") === 0) {
							// Decrement numbers prefixed with -=
							layer[propName] -= parseFloat(propValue.substr(2));
						} else if (
							!isNaN(propValue) &&
							isNumeric(propValue) &&
							propName !== "text"
						) {
							// Convert numeric values as strings to numbers
							layer[propName] = parseFloat(String(propValue));
						} else {
							// Otherwise, set given string value
							layer[propName] = propValue;
						}
					} else {
						// Otherwise, set given value
						layer[propName] = propValue;
					}
				}
			}

			// Update layer events
			_addLayerEvents($canvas, data, layer);
			_enableDrag($canvas, data, layer);

			// If layer's properties were changed
			if ($.isEmptyObject(props) === false) {
				_triggerLayerEvent($canvas, data, layer, "change", props);
			}
		}
	}
	return $canvases;
};

// Set properties of all layers (optionally filtered by a callback)
$.fn.setLayers = function setLayers(props, callback) {
	const $canvases = this;
	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);

		const layers = $canvas.getLayers(callback);
		// Loop through all layers
		for (let l = 0; l < layers.length; l += 1) {
			// Set properties of each layer
			$canvas.setLayer(layers[l], props);
		}
	}
	return $canvases;
};

// Set properties of all layers in the given group
$.fn.setLayerGroup = function setLayerGroup(groupId, props) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		// Get layer group
		const $canvas = $($canvases[e]);

		const group = $canvas.getLayerGroup(groupId);
		// If group exists
		if (group) {
			// Loop through layers in group
			for (let l = 0; l < group.length; l += 1) {
				// Merge given properties with layer
				$canvas.setLayer(group[l], props);
			}
		}
	}
	return $canvases;
};

// Move a layer to the given index in the layers array
$.fn.moveLayer = function moveLayer(layerId, index) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);

		// Retrieve layers array and desired layer
		const layers = data.layers;
		const layer = $canvas.getLayer(layerId);
		if (layer) {
			// Ensure layer index is accurate
			layer.index = inArray(layer, layers);

			// Remove layer from its current placement
			layers.splice(layer.index, 1);
			// Add layer in its new placement
			layers.splice(index, 0, layer);

			// Handle negative indices
			if (index < 0) {
				index = layers.length + index;
			}
			// Update layer's stored index
			layer.index = index;

			_triggerLayerEvent($canvas, data, layer, "move");
		}
	}
	return $canvases;
};

// Remove a jCanvas layer
$.fn.removeLayer = function removeLayer(layerId) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);

		// Retrieve layers array and desired layer
		const layers = $canvas.getLayers();
		const layer = $canvas.getLayer(layerId);
		// Remove layer if found
		if (layer) {
			// Ensure layer index is accurate
			layer.index = inArray(layer, layers);
			// Remove layer and allow it to be re-added later
			layers.splice(layer.index, 1);
			delete layer._layer;

			// Update layer name map
			_updateLayerName(data, layer, {
				name: null,
			});
			// Update layer group map
			_updateLayerGroups(data, layer, {
				groups: null,
			});

			// Trigger 'remove' event
			_triggerLayerEvent($canvas, data, layer, "remove");
		}
	}
	return $canvases;
};

// Remove all layers
$.fn.removeLayers = function removeLayers(callback) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);
		const layers = $canvas.getLayers(callback).slice(0);
		// Remove all layers individually
		for (let l = 0; l < layers.length; l += 1) {
			$canvas.removeLayer(layers[l]);
		}
		// Update layer maps
		data.layer.names = {};
		data.layer.groups = {};
	}
	return $canvases;
};

// Remove all layers in the group with the given ID
$.fn.removeLayerGroup = function removeLayerGroup(groupId) {
	const $canvases = this;

	if (groupId !== undefined) {
		for (let e = 0; e < $canvases.length; e += 1) {
			const $canvas = $($canvases[e]);

			let group = $canvas.getLayerGroup(groupId);
			// Remove layer group using given group name
			if (group) {
				// Clone groups array
				group = group.slice(0);

				// Loop through layers in group
				for (let l = 0; l < group.length; l += 1) {
					$canvas.removeLayer(group[l]);
				}
			}
		}
	}
	return $canvases;
};

// Add an existing layer to a layer group
$.fn.addLayerToGroup = function addLayerToGroup(layerId, groupName) {
	const $canvases = this;
	let groups = [groupName];

	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);
		const layer = $canvas.getLayer(layerId);

		// If layer is not already in group
		if (layer.groups) {
			// Clone groups list
			groups = layer.groups.slice(0);
			// If layer is not already in group
			if (inArray(groupName, layer.groups) === -1) {
				// Add layer to group
				groups.push(groupName);
			}
		}
		// Update layer group maps
		$canvas.setLayer(layer, {
			groups: groups,
		});
	}
	return $canvases;
};

// Remove an existing layer from a layer group
$.fn.removeLayerFromGroup = function removeLayerFromGroup(layerId, groupName) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);
		const layer = $canvas.getLayer(layerId);

		if (layer.groups) {
			// Find index of layer in group
			const index = inArray(groupName, layer.groups);

			// If layer is in group
			if (index !== -1) {
				// Clone groups list
				const groups = layer.groups.slice(0);

				// Remove layer from group
				groups.splice(index, 1);

				// Update layer group maps
				$canvas.setLayer(layer, {
					groups: groups,
				});
			}
		}
	}
	return $canvases;
};

// Get topmost layer that intersects with event coordinates
function _getIntersectingLayer(data: JCanvasInternalData) {
	let layer: jCanvasObject | null, mask: jCanvasObject, m;

	// Store the topmost layer
	layer = null;

	// Get the topmost layer whose visible area intersects event coordinates
	for (let i = data.intersecting.length - 1; i >= 0; i -= 1) {
		// Get current layer
		layer = data.intersecting[i];

		// If layer has previous masks
		if (layer._masks) {
			// Search previous masks to ensure
			// layer is visible at event coordinates
			for (m = layer._masks.length - 1; m >= 0; m -= 1) {
				mask = layer._masks[m];
				// If mask does not intersect event coordinates
				if (!mask.intersects) {
					// Indicate that the mask does not
					// intersect event coordinates
					layer.intersects = false;
					// Stop searching previous masks
					break;
				}
			}

			// If event coordinates intersect all previous masks
			// and layer is not intangible
			if (layer.intersects && !layer.intangible) {
				// Stop searching for topmost layer
				break;
			}
		}
	}
	// If resulting layer is intangible
	if (layer && layer.intangible) {
		// Cursor does not intersect this layer
		layer = null;
	}
	return layer;
}

// Draw individual layer (internal)
function _drawLayer(
	$canvas: JQuery,
	ctx: CanvasRenderingContext2D,
	layer: jCanvasObject,
	nextLayerIndex?: number
) {
	if (layer && layer.visible && layer._method) {
		if (nextLayerIndex) {
			layer._next = nextLayerIndex;
		} else {
			layer._next = null;
		}
		// If layer is an object, call its respective method
		if (layer._method) {
			layer._method.call($canvas, layer);
		}
	}
}

// Handle dragging of the currently-dragged layer
function _handleLayerDrag(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData,
	eventType: string
) {
	const drag = data.drag;
	const layer = drag.layer as jCanvasObject;
	const dragGroups = (layer && layer.dragGroups) || [];
	const layers = data.layers;

	if (eventType === "mousemove" || eventType === "touchmove") {
		// Detect when user is currently dragging layer

		if (!drag.dragging) {
			// Detect when user starts dragging layer

			// Signify that a layer on the canvas is being dragged
			drag.dragging = true;
			layer.dragging = true;

			// Optionally bring layer to front when drag starts
			if (layer.bringToFront && layer.index !== null) {
				// Remove layer from its original position
				layers.splice(layer.index, 1);
				// Bring layer to front
				// push() returns the new array length
				layer.index = layers.push(layer);
			}

			// Set drag properties for this layer
			layer._startX = layer.x;
			layer._startY = layer.y;
			layer._endX = layer._eventX;
			layer._endY = layer._eventY;

			// Trigger dragstart event
			_triggerLayerEvent($canvas, data, layer, "dragstart");
		}

		if (drag.dragging) {
			// Calculate position after drag
			let newX = layer._eventX - (layer._endX - layer._startX);
			let newY = layer._eventY - (layer._endY - layer._startY);
			if (layer.updateDragX) {
				newX = layer.updateDragX.call($canvas[0], layer, newX);
			}
			if (layer.updateDragY) {
				newY = layer.updateDragY.call($canvas[0], layer, newY);
			}
			layer.dx = newX - layer.x;
			layer.dy = newY - layer.y;
			if (layer.restrictDragToAxis !== "y") {
				layer.x = newX;
			}
			if (layer.restrictDragToAxis !== "x") {
				layer.y = newY;
			}

			// Trigger drag event
			_triggerLayerEvent($canvas, data, layer, "drag");

			// Move groups with layer on drag
			for (let g = 0; g < dragGroups.length; g += 1) {
				const groupName = dragGroups[g];
				const group = data.layer.groups[groupName];
				if (layer.groups && group) {
					for (let l = 0; l < group.length; l += 1) {
						if (group[l] !== layer) {
							if (
								layer.restrictDragToAxis !== "y" &&
								group[l].restrictDragToAxis !== "y"
							) {
								group[l].x += layer.dx;
							}
							if (
								layer.restrictDragToAxis !== "x" &&
								group[l].restrictDragToAxis !== "x"
							) {
								group[l].y += layer.dy;
							}
						}
					}
				}
			}
		}
	} else if (eventType === "mouseup" || eventType === "touchend") {
		// Detect when user stops dragging layer

		if (drag.dragging) {
			layer.dragging = false;
			drag.dragging = false;
			data.redrawOnMousemove = data.originalRedrawOnMousemove;
			// Trigger dragstop event
			_triggerLayerEvent($canvas, data, layer, "dragstop");
		}

		// Cancel dragging
		data.drag = {
			layer: null,
			dragging: false,
		};
	}
}

// Set cursor on canvas
function _setCursor(
	$canvas: JQuery<HTMLCanvasElement>,
	layer: jCanvasObject,
	eventType: string
) {
	let cursor;
	if (layer.cursors) {
		// Retrieve cursor from cursors object if it exists
		cursor = layer.cursors[eventType];
	}
	// Prefix any CSS3 cursor
	if ($.inArray(cursor, css.cursors) !== -1) {
		cursor = cursor;
	}
	// If cursor is defined
	if (cursor) {
		// Set canvas cursor
		$canvas.css({
			cursor: cursor,
		});
	}
}

// Reset cursor on canvas
function _resetCursor(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData
) {
	$canvas.css({
		cursor: data.cursor,
	});
}

// Run the given event callback with the given arguments
function _runEventCallback(
	$canvas: JQuery<HTMLCanvasElement>,
	layer: jCanvasObject,
	eventType: string,
	callbacks: Record<string, (layer: jCanvasObject, arg: any) => void>,
	arg: any
) {
	// Prevent callback from firing recursively
	if (callbacks[eventType] && layer._running && !layer._running[eventType]) {
		// Signify the start of callback execution for this event
		layer._running[eventType] = true;
		// Run event callback with the given arguments
		callbacks[eventType].call($canvas[0], layer, arg);
		// Signify the end of callback execution for this event
		layer._running[eventType] = false;
	}
}

// Determine if the given layer can "legally" fire the given event
function _layerCanFireEvent(layer: jCanvasObject, eventType: string) {
	// If events are disable and if
	// layer is tangible or event is not tangible
	return (
		!layer.disableEvents &&
		(!layer.intangible || $.inArray(eventType, tangibleEvents) === -1)
	);
}

// Trigger the given event on the given layer
function _triggerLayerEvent(
	$canvas: JQuery<HTMLCanvasElement>,
	data: JCanvasInternalData,
	layer: jCanvasObject,
	eventType: string,
	arg?: any
) {
	// If layer can legally fire this event type
	if (_layerCanFireEvent(layer, eventType)) {
		// Do not set a custom cursor on layer mouseout
		if (eventType !== "mouseout") {
			// Update cursor if one is defined for this event
			_setCursor($canvas, layer, eventType);
		}

		// Trigger the user-defined event callback
		_runEventCallback($canvas, layer, eventType, layer, arg);
		// Trigger the canvas-bound event hook
		_runEventCallback($canvas, layer, eventType, data.eventHooks, arg);
		// Trigger the global event hook
		_runEventCallback($canvas, layer, eventType, jCanvas.eventHooks, arg);
	}
}

// Manually trigger a layer event
$.fn.triggerLayerEvent = function (layerId, eventType) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);
		const layer = $canvas.getLayer(layerId);
		if (layer) {
			_triggerLayerEvent($canvas, data, layer, eventType);
		}
	}
	return $canvases;
};

// Draw layer with the given ID
$.fn.drawLayer = function drawLayer(layerId) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const layer = $canvas.getLayer(layerId);
		_drawLayer($canvas, ctx, layer);
	}
	return $canvases;
};

// Draw all layers (or, if given, only layers starting at an index)
$.fn.drawLayers = function drawLayers(args) {
	const $canvases = this;
	// Internal parameters for redrawing the canvas
	const params = args || {};
	// Other variables
	let isImageLayer: boolean = false;

	// The layer index from which to start redrawing the canvas
	let index = params.index;
	if (!index) {
		index = 0;
	}

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		let $canvas = $(canvas);
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);

		// Clear canvas first unless otherwise directed
		if (params.clear !== false) {
			$canvas.clearCanvas();
		}

		// If a completion callback was provided, save it to the canvas data
		// store so that the function can be passed to drawLayers() again
		// after any image layers have loaded
		if (params.complete) {
			data.drawLayersComplete = params.complete;
		}

		// Cache the layers array
		const layers = data.layers;

		// Draw layers from first to last (bottom to top)
		let l;
		for (l = index; l < layers.length; l += 1) {
			const layer = layers[l];

			// Ensure layer index is up-to-date
			layer.index = l;

			// Prevent any one event from firing excessively
			if (params.resetFire) {
				layer._fired = false;
			}
			// Draw layer
			_drawLayer($canvas, ctx, layer, l + 1);
			// Store list of previous masks for each layer
			layer._masks = data.transforms.masks.slice(0);

			// Allow image layers to load before drawing successive layers
			if (layer._method === $.fn.drawImage && layer.visible) {
				isImageLayer = true;
				break;
			}
		}

		// If layer is an image layer
		if (isImageLayer) {
			// Stop and wait for drawImage() to resume drawLayers()
			continue;
		}

		// Store the latest
		const lastIndex = l;

		// Run completion callback (if provided) once all layers have drawn
		if (params.complete) {
			params.complete.call($canvases[e]);
			delete data.drawLayersComplete;
		}

		// Get first layer that intersects with event coordinates
		const layer = _getIntersectingLayer(data);

		const eventCache = data.event;
		let eventType = eventCache.type;

		// If jCanvas has detected a dragstart
		if (data.drag.layer) {
			// Handle dragging of layer
			_handleLayerDrag($canvas, data, eventType);
		}

		// Manage mouseout event
		const lastLayer = data.lastIntersected;
		if (
			lastLayer !== null &&
			layer !== lastLayer &&
			lastLayer._hovered &&
			!lastLayer._fired &&
			!data.drag.dragging
		) {
			data.lastIntersected = null;
			lastLayer._fired = true;
			lastLayer._hovered = false;
			_triggerLayerEvent($canvas, data, lastLayer, "mouseout");
			_resetCursor($canvas, data);
		}

		if (layer) {
			// Use mouse event callbacks if no touch event callbacks are given
			if (!layer[eventType]) {
				eventType = _getMouseEventName(eventType);
			}

			// Check events for intersecting layer
			if (layer._event && layer.intersects) {
				data.lastIntersected = layer;

				// Detect mouseover events
				if (
					(layer.mouseover || layer.mouseout || layer.cursors) &&
					!data.drag.dragging
				) {
					if (!layer._hovered && !layer._fired) {
						// Prevent events from firing excessively
						layer._fired = true;
						layer._hovered = true;
						_triggerLayerEvent($canvas, data, layer, "mouseover");
					}
				}

				// Detect any other mouse event
				if (!layer._fired) {
					// Prevent event from firing twice unintentionally
					layer._fired = true;
					eventCache.type = null;

					_triggerLayerEvent($canvas, data, layer, eventType);
				}

				// Use the mousedown event to start drag
				if (
					layer.draggable &&
					!layer.disableEvents &&
					(eventType === "mousedown" || eventType === "touchstart")
				) {
					// Keep track of drag state
					data.drag.layer = layer;
					data.originalRedrawOnMousemove = data.redrawOnMousemove;
					data.redrawOnMousemove = true;
				}
			}

			// If cursor is not intersecting with any layer
			if (layer === null && !data.drag.dragging) {
				// Reset cursor to previous state
				_resetCursor($canvas, data);
			}

			// If the last layer has been drawn
			if (lastIndex === layers.length) {
				// Reset list of intersecting layers
				data.intersecting.length = 0;
				// Reset transformation stack
				data.transforms = _cloneTransforms(baseTransforms);
				data.savedTransforms.length = 0;
			}
		}
	}
	return $canvases;
};

// Add a jCanvas layer (internal)
function _addLayer(
	canvas: HTMLCanvasElement,
	params: jCanvasObject,
	args?: jCanvasObject,
	method?: (args: jCanvasObject) => JQuery
) {
	let layer = params._layer ? args : params;

	// Store arguments object for later use
	params._args = args;

	// Convert all draggable drawings into jCanvas layers
	if (params.draggable || params.dragGroups) {
		params.layer = true;
		params.draggable = true;
	}

	// Determine the layer's type using the available information
	if (!params._method) {
		if (method) {
			params._method = method;
		} else if (params.method) {
			params._method = $.fn[params.method];
		} else if (params.type) {
			params._method = $.fn[maps.drawings[params.type] as keyof typeof $.fn];
		}
	}

	// If layer hasn't been added yet
	if (params.layer && !params._layer && layer) {
		// Add layer to canvas

		const $canvas = $(canvas);

		const data = _getCanvasData(canvas);
		const layers = data.layers;

		// Do not add duplicate layers of same name
		if (
			layer.name === null ||
			(isString(layer.name) && data.layer.names[layer.name] === undefined)
		) {
			// Convert number properties to numbers
			_coerceNumericProps(params);

			// Ensure layers are unique across canvases by cloning them
			layer = new jCanvasObject(params);
			layer.canvas = canvas;
			// Indicate that this is a layer for future checks
			layer.layer = true;
			layer._layer = true;
			layer._running = {};
			// If layer stores user-defined data
			if (layer.data !== null) {
				// Clone object
				layer.data = extendObject({}, layer.data);
			} else {
				// Otherwise, create data object
				layer.data = {};
			}
			// If layer stores a list of associated groups
			if (layer.groups !== null) {
				// Clone list
				layer.groups = layer.groups.slice(0);
			} else {
				// Otherwise, create empty list
				layer.groups = [];
			}

			// Update layer group maps
			_updateLayerName(data, layer);
			_updateLayerGroups(data, layer);

			// Check for any associated jCanvas events and enable them
			_addLayerEvents($canvas, data, layer);

			// Optionally enable drag-and-drop support and cursor support
			_enableDrag($canvas, data, layer);

			// Copy _event property to parameters object
			params._event = layer._event;

			// Calculate width/height for text layers
			if (layer._method === $.fn.drawText) {
				$canvas.measureText(layer);
			}

			// Add layer to end of array if no index is specified
			if (layer.index === null) {
				layer.index = layers.length;
			}

			// Add layer to layers array at specified index
			layers.splice(layer.index, 0, layer);

			// Store layer on parameters object
			params._args = layer;

			// Trigger an 'add' event
			_triggerLayerEvent($canvas, data, layer, "add");
		}
	} else if (!params.layer) {
		_coerceNumericProps(params);
	}

	return layer;
}

// Add a jCanvas layer
$.fn.addLayer = function addLayer(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		params.layer = true;
		_addLayer(canvas, params, args);
	}
	return $canvases;
};

/* Animation API */

// Hide/show jCanvas/CSS properties so they can be animated using jQuery
function _showProps(obj: Partial<jCanvasObject>) {
	for (let p = 0; p < css.props.length; p += 1) {
		const cssProp = css.props[p];
		obj[cssProp] = obj["_" + cssProp];
	}
}
function _hideProps(obj: Partial<jCanvasObject>, reset?: boolean) {
	for (let p = 0; p < css.props.length; p += 1) {
		const cssProp = css.props[p];
		// Hide property using same name with leading underscore
		if (obj[cssProp] !== undefined) {
			obj["_" + cssProp] = obj[cssProp];
			css.propsObj[cssProp] = true;
			if (reset) {
				delete obj[cssProp];
			}
		}
	}
}

// Evaluate property values that are functions
function _parseEndValues(
	canvas: HTMLCanvasElement,
	layer: jCanvasObject,
	endValues: Record<string, any>
) {
	// Loop through all properties in map of end values
	for (const propName in endValues) {
		if (Object.prototype.hasOwnProperty.call(endValues, propName)) {
			const propValue = endValues[propName];
			// If end value is function
			if (isFunction(propValue)) {
				// Call function and use its value as the end value
				endValues[propName] = propValue.call(canvas, layer, propName);
			}
			// If end value is an object
			if (typeOf(propValue) === "object" && isPlainObject(propValue)) {
				// Prepare to animate properties in object
				for (const subPropName in propValue) {
					if (Object.prototype.hasOwnProperty.call(propValue, subPropName)) {
						const subPropValue = propValue[subPropName];
						// Store property's start value at top-level of layer
						if (layer[propName] !== undefined) {
							layer[propName + "." + subPropName] =
								layer[propName][subPropName];
							// Store property's end value at top-level of end values map
							endValues[propName + "." + subPropName] = subPropValue;
						}
					}
				}
				// Delete sub-property of object as it's no longer needed
				delete endValues[propName];
			}
		}
	}
	return endValues;
}

// Remove sub-property aliases from layer object
function _removeSubPropAliases(layer: jCanvasObject) {
	for (const propName in layer) {
		if (Object.prototype.hasOwnProperty.call(layer, propName)) {
			if (propName.indexOf(".") !== -1) {
				delete layer[propName];
			}
		}
	}
}

// Convert a color value to an array of RGB values
function _colorToRgbArray(color: string) {
	let originalColor: string,
		headElem: HTMLHeadElement,
		rgb: any = [],
		multiple = 1;

	// Deal with complete transparency
	if (color === "transparent") {
		color = "rgba(0, 0, 0, 0)";
	} else if (color.match(/^([a-z]+|#[0-9a-f]+)$/gi)) {
		// Deal with hexadecimal colors and color names
		headElem = document.head;
		originalColor = headElem.style.color;
		headElem.style.color = color;
		color = $.css(headElem, "color");
		headElem.style.color = originalColor;
	}
	// Parse RGB string
	if (color.match(/^rgb/gi)) {
		rgb = color.match(/(\d+(\.\d+)?)/gi);
		// Deal with RGB percentages
		if (color.match(/%/gi)) {
			multiple = 2.55;
		}
		rgb[0] *= multiple;
		rgb[1] *= multiple;
		rgb[2] *= multiple;
		// Ad alpha channel if given
		if (rgb[3] !== undefined) {
			rgb[3] = parseFloat(String(rgb[3]));
		} else {
			rgb[3] = 1;
		}
	}
	return rgb;
}

// Animate a hex or RGB color
function _animateColor(fx: any) {
	let n = 3;
	// Only parse start and end colors once
	if (typeOf(fx.start) !== "array") {
		fx.start = _colorToRgbArray(fx.start);
		fx.end = _colorToRgbArray(fx.end);
	}
	fx.now = [];

	// If colors are RGBA, animate transparency
	if (fx.start[3] !== 1 || fx.end[3] !== 1) {
		n = 4;
	}

	// Calculate current frame for red, green, blue, and alpha
	for (let i = 0; i < n; i += 1) {
		fx.now[i] = fx.start[i] + (fx.end[i] - fx.start[i]) * fx.pos;
		// Only the red, green, and blue values must be integers
		if (i < 3) {
			fx.now[i] = round(fx.now[i]);
		}
	}
	if (fx.start[3] !== 1 || fx.end[3] !== 1) {
		// Only use RGBA if RGBA colors are given
		fx.now = "rgba(" + fx.now.join(",") + ")";
	} else {
		// Otherwise, animate as solid colors
		fx.now.slice(0, 3);
		fx.now = "rgb(" + fx.now.join(",") + ")";
	}
	// Animate colors for both canvas layers and DOM elements
	if (fx.elem.nodeName) {
		fx.elem.style[fx.prop] = fx.now;
	} else {
		fx.elem[fx.prop] = fx.now;
	}
}

// Animate jCanvas layer
$.fn.animateLayer = function animateLayer(...args) {
	const $canvases = this;
	let $canvas, data, layer, props;

	// Deal with all cases of argument placement
	/*
		0. layer name/index
		1. properties
		2. duration/options
		3. easing
		4. complete function
		5. step function
	*/

	if (!args.length) {
		return $canvases;
	}

	if (typeOf(args[2]) === "object") {
		// Accept an options object for animation
		args.splice(2, 0, args[2].duration || null);
		args.splice(3, 0, args[3].easing || null);
		args.splice(4, 0, args[4].complete || null);
		args.splice(5, 0, args[5].step || null);
	} else {
		if (args[2] === undefined) {
			// If object is the last argument
			args.splice(2, 0, null);
			args.splice(3, 0, null);
			args.splice(4, 0, null);
		} else if (isFunction(args[2])) {
			// If callback comes after object
			args.splice(2, 0, null);
			args.splice(3, 0, null);
		}
		if (args[3] === undefined) {
			// If duration is the last argument
			args[3] = null;
			args.splice(4, 0, null);
		} else if (isFunction(args[3])) {
			// If callback comes after duration
			args.splice(3, 0, null);
		}
	}

	// Run callback function when animation completes
	function complete(
		$canvas: JQuery<HTMLCanvasElement>,
		data: JCanvasInternalData,
		layer: jCanvasObject
	) {
		return function () {
			_showProps(layer);
			_removeSubPropAliases(layer);

			// Prevent multiple redraw loops
			if (!data.animating || data.animated === layer) {
				// Redraw layers on last frame
				$canvas.drawLayers();
			}

			// Signify the end of an animation loop
			layer._animating = false;
			data.animating = false;
			data.animated = null;

			// If callback is defined
			if (args[4]) {
				// Run callback at the end of the animation
				args[4].call($canvas[0], layer);
			}

			_triggerLayerEvent($canvas, data, layer, "animateend");
		};
	}

	// Redraw layers on every frame of the animation
	function step(
		$canvas: JQuery<HTMLCanvasElement>,
		data: JCanvasInternalData,
		layer: jCanvasObject
	) {
		return function (now: any, fx: any) {
			let parts,
				propName,
				subPropName,
				hidden = false;

			// If animated property has been hidden
			if (fx.prop[0] === "_") {
				hidden = true;
				// Unhide property temporarily
				fx.prop = fx.prop.replace("_", "");
				layer[fx.prop] = layer["_" + fx.prop];
			}

			// If animating property of sub-object
			if (fx.prop.indexOf(".") !== -1) {
				parts = fx.prop.split(".");
				propName = parts[0];
				subPropName = parts[1];
				if (layer[propName]) {
					layer[propName][subPropName] = fx.now;
				}
			}

			// Throttle animation to improve efficiency
			if (layer._pos !== fx.pos) {
				layer._pos = fx.pos;

				// Signify the start of an animation loop
				if (!layer._animating && !data.animating) {
					layer._animating = true;
					data.animating = true;
					data.animated = layer;
				}

				// Prevent multiple redraw loops
				if (!data.animating || data.animated === layer) {
					// Redraw layers for every frame
					$canvas.drawLayers();
				}
			}

			// If callback is defined
			if (args[5]) {
				// Run callback for each step of animation
				args[5].call($canvas[0], now, fx, layer);
			}

			_triggerLayerEvent($canvas, data, layer, "animate", fx);

			// If property should be hidden during animation
			if (hidden) {
				// Hide property again
				fx.prop = "_" + fx.prop;
			}
		};
	}

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		$canvas = $(canvas);
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		data = _getCanvasData(canvas);

		// If a layer object was passed, use it the layer to be animated
		layer = $canvas.getLayer(args[0]);

		// Ignore layers that are functions
		if (layer && layer._method !== $.fn.draw) {
			// Do not modify original object
			props = extendObject({}, args[1]);

			props = _parseEndValues(canvas, layer, props);

			// Bypass jQuery CSS Hooks for CSS properties (width, opacity, etc.)
			_hideProps(props, true);
			_hideProps(layer);

			// Fix for jQuery's vendor prefixing support, which affects how width/height/opacity are animated
			layer.style = css.propsObj;

			// Animate layer
			$(layer).animate(props, {
				duration: args[2],
				easing: $.easing[args[3]] ? args[3] : null,
				// When animation completes
				complete: complete($canvas, data, layer),
				// Redraw canvas for every animation frame
				step: step($canvas, data, layer),
			});
			_triggerLayerEvent($canvas, data, layer, "animatestart");
		}
	}
	return $canvases;
};

// Animate all layers in a layer group
$.fn.animateLayerGroup = function animateLayerGroup(groupId) {
	const $canvases = this;
	const args = arraySlice.call(arguments, 0);

	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);
		const group = $canvas.getLayerGroup(groupId);
		if (group) {
			// Animate all layers in the group
			for (let l = 0; l < group.length; l += 1) {
				// Replace first argument with layer
				args[0] = group[l];
				$canvas.animateLayer.apply($canvas, args);
			}
		}
	}
	return $canvases;
};

// Delay layer animation by a given number of milliseconds
$.fn.delayLayer = function delayLayer(layerId, duration) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);
		const layer = $canvas.getLayer(layerId);
		// If layer exists
		if (layer) {
			// Delay animation
			$(layer).delay(duration || 0);
			_triggerLayerEvent($canvas, data, layer, "delay");
		}
	}
	return $canvases;
};

// Delay animation all layers in a layer group
$.fn.delayLayerGroup = function delayLayerGroup(groupId, duration) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);

		const group = $canvas.getLayerGroup(groupId);
		// Delay all layers in the group
		if (group) {
			for (let l = 0; l < group.length; l += 1) {
				// Delay each layer in the group
				$canvas.delayLayer(group[l], duration || 0);
			}
		}
	}
	return $canvases;
};

// Stop layer animation
$.fn.stopLayer = function stopLayer(layerId, clearQueue) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const $canvas = $(canvas);
		const data = _getCanvasData(canvas);
		const layer = $canvas.getLayer(layerId);
		// If layer exists
		if (layer) {
			// Stop animation
			$(layer).stop(clearQueue);
			_triggerLayerEvent($canvas, data, layer, "stop");
		}
	}
	return $canvases;
};

// Stop animation of all layers in a layer group
$.fn.stopLayerGroup = function stopLayerGroup(groupId, clearQueue) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const $canvas = $($canvases[e]);

		const group = $canvas.getLayerGroup(groupId);
		// Stop all layers in the group
		if (group) {
			for (let l = 0; l < group.length; l += 1) {
				// Stop each layer in the group
				const layer = group[l];
				$canvas.stopLayer(layer, clearQueue);
			}
		}
	}
	return $canvases;
};

// Enable animation for color properties
function _supportColorProps(props: string[]) {
	for (let p = 0; p < props.length; p += 1) {
		$.fx.step[props[p]] = _animateColor;
	}
}

// Enable animation for color properties
_supportColorProps([
	"color",
	"backgroundColor",
	"borderColor",
	"borderTopColor",
	"borderRightColor",
	"borderBottomColor",
	"borderLeftColor",
	"fillStyle",
	"outlineColor",
	"strokeStyle",
	"shadowColor",
]);

/* Event API */

// Convert mouse event name to a corresponding touch event name (if possible)
function _getTouchEventName(eventName: keyof typeof maps.touchEvents) {
	// Detect touch event support
	if (maps.touchEvents[eventName]) {
		return maps.touchEvents[eventName];
	}
	return eventName;
}
// Convert touch event name to a corresponding mouse event name
function _getMouseEventName(eventName: string) {
	if (maps.mouseEvents[eventName]) {
		eventName = maps.mouseEvents[eventName];
	}
	return eventName;
}

// Bind event to jCanvas layer using standard jQuery events
function _createEvent(eventName: string) {
	jCanvas.events[eventName] = function ($canvas, data) {
		// Retrieve canvas's event cache
		let eventCache = data.event;

		// Both mouseover/mouseout events will be managed by a single mousemove event
		let helperEventName =
			eventName === "mouseover" || eventName === "mouseout"
				? "mousemove"
				: eventName;
		let touchEventName = _getTouchEventName(helperEventName);

		function eventCallback(event: MouseEvent) {
			// Cache current mouse position and redraw layers
			eventCache.x = event.offsetX;
			eventCache.y = event.offsetY;
			eventCache.type = helperEventName;
			eventCache.event = event;
			// Redraw layers on every trigger of the event; don't redraw if at
			// least one layer is draggable and there are no layers with
			// explicit mouseover/mouseout/mousemove events
			if (
				event.type !== "mousemove" ||
				data.redrawOnMousemove ||
				data.drag.dragging
			) {
				$canvas.drawLayers({
					resetFire: true,
				});
			}
			// Prevent default event behavior
			event.preventDefault();
		}

		// Ensure the event is not bound more than once
		if (!data.events[helperEventName]) {
			// Bind one canvas event which handles all layer events of that type
			if (touchEventName !== helperEventName) {
				$canvas.on(
					helperEventName + ".jCanvas " + touchEventName + ".jCanvas",
					eventCallback as JQuery.EventHandlerBase<HTMLElement, object>
				);
			} else {
				$canvas.on(
					helperEventName + ".jCanvas",
					eventCallback as JQuery.EventHandlerBase<HTMLElement, object>
				);
			}
			// Prevent this event from being bound twice
			data.events[helperEventName] = true;
		}
	};
}
function _createEvents(eventNames: string[]) {
	for (let n = 0; n < eventNames.length; n += 1) {
		_createEvent(eventNames[n]);
	}
}
// Populate jCanvas events object with some standard events
_createEvents([
	"click",
	"dblclick",
	"mousedown",
	"mouseup",
	"mousemove",
	"mouseover",
	"mouseout",
	"touchstart",
	"touchmove",
	"touchend",
	"pointerdown",
	"pointermove",
	"pointerup",
	"contextmenu",
]);

// Check if event fires when a drawing is drawn
function _detectEvents(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject
) {
	// Use the layer object stored by the given parameters object
	const layer = params._args;
	// Canvas must have event bindings
	if (layer) {
		let data = _getCanvasData(canvas);
		let eventCache = data.event;
		let intersects: boolean = false;
		let x: number;
		let y: number;
		if (eventCache.x !== null && eventCache.y !== null) {
			// Respect user-defined pixel ratio
			x = eventCache.x * data.pixelRatio;
			y = eventCache.y * data.pixelRatio;
			// Determine if the given coordinates are in the current path
			intersects =
				ctx.isPointInPath(x, y) ||
				(ctx.isPointInStroke && ctx.isPointInStroke(x, y));
		}
		let transforms = data.transforms;

		// Allow callback functions to retrieve the mouse coordinates
		layer.eventX = eventCache.x;
		layer.eventY = eventCache.y;
		layer.event = eventCache.event;

		// Adjust coordinates to match current canvas transformation

		// Keep track of some transformation values
		let angle = data.transforms.rotate;
		x = layer.eventX;
		y = layer.eventY;

		if (angle !== 0) {
			// Rotate coordinates if coordinate space has been rotated
			layer._eventX = x * cos(-angle) - y * sin(-angle);
			layer._eventY = y * cos(-angle) + x * sin(-angle);
		} else {
			// Otherwise, no calculations need to be made
			layer._eventX = x;
			layer._eventY = y;
		}

		// Scale coordinates
		layer._eventX /= transforms.scaleX;
		layer._eventY /= transforms.scaleY;

		// If layer intersects with cursor
		if (intersects) {
			// Add it to a list of layers that intersect with cursor
			data.intersecting.push(layer);
		}
		layer.intersects = Boolean(intersects);
	}
}

// Normalize offsetX and offsetY for all browsers
// @ts-expect-error TODO: properly type extension for $.event
$.event.fix = function (event) {
	event = jQueryEventFix.call($.event, event);
	const originalEvent = event.originalEvent;

	// originalEvent does not exist for manually-triggered events
	if (originalEvent) {
		const touches = originalEvent.changedTouches;

		// If offsetX and offsetY are not supported, define them
		let offset: JQuery.Coordinates | undefined;
		if (event.pageX !== undefined && event.offsetX === undefined) {
			try {
				offset = $(event.currentTarget).offset();
				if (offset) {
					event.offsetX = event.pageX - offset.left;
					event.offsetY = event.pageY - offset.top;
				}
			} catch (error) {
				// Fail silently
			}
		} else if (touches) {
			try {
				// Enable offsetX and offsetY for mobile devices
				offset = $(event.currentTarget).offset();
				if (offset) {
					event.offsetX = touches[0].pageX - offset.left;
					event.offsetY = touches[0].pageY - offset.top;
				}
			} catch (error) {
				// Fail silently
			}
		}
	}
	return event;
};

/* Drawing API */

// Draws on canvas using a function
$.fn.draw = function draw(args) {
	const $canvases = this;
	const params = new jCanvasObject(args);

	// Draw using any other method
	const fn = $.fn[maps.drawings[params.type!] as keyof typeof $.fn];
	if (params.type && maps.drawings[params.type] && isFunction(fn)) {
		// @ts-expect-error TODO (not sure how to fix this: "This expression is
		// not callable. Each member of the union type '...' has signatures, but
		// none of those signatures are compatible with each other.")
		fn(args);
	} else {
		for (let e = 0; e < $canvases.length; e += 1) {
			const canvas = $canvases[e];
			if (!_isCanvas(canvas)) {
				continue;
			}
			const ctx = _getContext(canvas);
			if (!ctx) {
				continue;
			}
			const params = new jCanvasObject(args);
			_addLayer(canvas, params, args, draw);
			if (params.visible) {
				if (params.fn) {
					// Call the given user-defined function
					params.fn.call($canvases[e], ctx, params);
				}
			}
		}
	}
	return $canvases;
};

// Clears canvas
$.fn.clearCanvas = function clearCanvas(args) {
	const $canvases = this;
	const params = new jCanvasObject(args);

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		if (params.width === null || params.height === null) {
			// Clear entire canvas if width/height is not given

			// Reset current transformation temporarily to ensure that the entire canvas is cleared
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.restore();
		} else {
			// Otherwise, clear the defined section of the canvas

			// Transform clear rectangle
			_addLayer(canvas, params, args, clearCanvas);
			_transformShape(canvas, ctx, params, params.width, params.height);
			ctx.clearRect(
				params.x - params.width / 2,
				params.y - params.height / 2,
				params.width,
				params.height
			);
			// Restore previous transformation
			_restoreTransform(ctx, params);
		}
	}
	return $canvases;
};

/* Transformation API */

// Restores canvas
$.fn.saveCanvas = function saveCanvas(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);

		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, saveCanvas);

		// Restore a number of times using the given count
		for (let i = 0; i < params.count; i += 1) {
			_saveCanvas(ctx, data);
		}
	}
	return $canvases;
};

// Restores canvas
$.fn.restoreCanvas = function restoreCanvas(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);

		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, restoreCanvas);

		// Restore a number of times using the given count
		for (let i = 0; i < params.count; i += 1) {
			_restoreCanvas(ctx, data);
		}
	}
	return $canvases;
};

// Rotates canvas (internal)
function _rotateCanvas(
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	transforms: JCanvasBaseTransforms | null
) {
	// Get conversion factor for radians
	params._toRad = params.inDegrees ? PI / 180 : 1;

	// Rotate canvas using shape as center of rotation
	ctx.translate(params.x, params.y);
	ctx.rotate(params.rotate * params._toRad);
	ctx.translate(-params.x, -params.y);

	// If transformation data was given
	if (transforms) {
		// Update transformation data
		transforms.rotate += params.rotate * params._toRad;
	}
}

// Scales canvas (internal)
function _scaleCanvas(
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	transforms: JCanvasBaseTransforms | null
) {
	// Scale both the x- and y- axis using the 'scale' property
	if (params.scale !== 1) {
		params.scaleX = params.scaleY = params.scale;
	}

	// Scale canvas using shape as center of rotation
	ctx.translate(params.x, params.y);
	ctx.scale(params.scaleX, params.scaleY);
	ctx.translate(-params.x, -params.y);

	// If transformation data was given
	if (transforms) {
		// Update transformation data
		transforms.scaleX *= params.scaleX;
		transforms.scaleY *= params.scaleY;
	}
}

// Translates canvas (internal)
function _translateCanvas(
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	transforms: JCanvasBaseTransforms | null
) {
	// Translate both the x- and y-axis using the 'translate' property
	if (params.translate) {
		params.translateX = params.translateY = params.translate;
	}

	// Translate canvas
	ctx.translate(params.translateX, params.translateY);

	// If transformation data was given
	if (transforms) {
		// Update transformation data
		transforms.translateX += params.translateX;
		transforms.translateY += params.translateY;
	}
}

// Rotates canvas
$.fn.rotateCanvas = function rotateCanvas(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);

		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, rotateCanvas);

		// Autosave transformation state by default
		if (params.autosave) {
			// Automatically save transformation state by default
			_saveCanvas(ctx, data);
		}
		_rotateCanvas(ctx, params, data.transforms);
	}
	return $canvases;
};

// Scales canvas
$.fn.scaleCanvas = function scaleCanvas(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);

		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, scaleCanvas);

		// Autosave transformation state by default
		if (params.autosave) {
			// Automatically save transformation state by default
			_saveCanvas(ctx, data);
		}
		_scaleCanvas(ctx, params, data.transforms);
	}
	return $canvases;
};

// Translates canvas
$.fn.translateCanvas = function translateCanvas(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);

		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, translateCanvas);

		// Autosave transformation state by default
		if (params.autosave) {
			// Automatically save transformation state by default
			_saveCanvas(ctx, data);
		}
		_translateCanvas(ctx, params, data.transforms);
	}
	return $canvases;
};

/* Shape API */

// Draws rectangle
$.fn.drawRect = function drawRect(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawRect);
		if (params.visible) {
			_transformShape(canvas, ctx, params, params.width, params.height);
			_setGlobalProps(canvas, ctx, params);

			const nonNullWidth = params.width || 0;
			const nonNullHeight = params.height || 0;
			ctx.beginPath();
			let x1 = params.x - nonNullWidth / 2;
			let y1 = params.y - nonNullHeight / 2;
			let r = abs(params.cornerRadius);
			// If corner radius is defined and is not zero
			if (r) {
				// Draw rectangle with rounded corners if cornerRadius is defined

				let x2 = params.x + nonNullWidth / 2;
				let y2 = params.y + nonNullHeight / 2;

				// Handle negative width
				if (nonNullWidth < 0) {
					const temp = x1;
					x1 = x2;
					x2 = temp;
				}
				// Handle negative height
				if (nonNullHeight < 0) {
					const temp = y1;
					y1 = y2;
					y2 = temp;
				}

				// Prevent over-rounded corners
				if (x2 - x1 - 2 * r < 0) {
					r = (x2 - x1) / 2;
				}
				if (y2 - y1 - 2 * r < 0) {
					r = (y2 - y1) / 2;
				}

				// Draw rectangle
				ctx.moveTo(x1 + r, y1);
				ctx.lineTo(x2 - r, y1);
				ctx.arc(x2 - r, y1 + r, r, (3 * PI) / 2, PI * 2, false);
				ctx.lineTo(x2, y2 - r);
				ctx.arc(x2 - r, y2 - r, r, 0, PI / 2, false);
				ctx.lineTo(x1 + r, y2);
				ctx.arc(x1 + r, y2 - r, r, PI / 2, PI, false);
				ctx.lineTo(x1, y1 + r);
				ctx.arc(x1 + r, y1 + r, r, PI, (3 * PI) / 2, false);
				// Always close path
				params.closed = true;
			} else {
				// Otherwise, draw rectangle with square corners
				ctx.rect(x1, y1, nonNullWidth, nonNullHeight);
			}
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Close rectangle path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Retrieves a coterminal angle between 0 and 2pi for the given angle
function _getCoterminal(angle: number) {
	while (angle < 0) {
		angle += 2 * PI;
	}
	return angle;
}

// Retrieves the x-coordinate for the given angle in a circle
function _getArcX(params: jCanvasObject, angle: number) {
	return params.x + params.radius * cos(angle);
}
// Retrieves the y-coordinate for the given angle in a circle
function _getArcY(params: jCanvasObject, angle: number) {
	return params.y + params.radius * sin(angle);
}

// Draws arc (internal)
function _drawArc(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject
) {
	let offsetX: number;
	let offsetY: number;
	let diff: number;

	// Determine offset from dragging
	if (params === path) {
		offsetX = 0;
		offsetY = 0;
	} else {
		offsetX = params.x;
		offsetY = params.y;
	}

	// Convert default end angle to radians
	if (!path.inDegrees && path.end === 360) {
		path.end = PI * 2;
	}

	// Convert angles to radians
	path.start *= params._toRad;
	path.end *= params._toRad;
	// Consider 0deg due north of arc
	path.start -= PI / 2;
	path.end -= PI / 2;

	// Ensure arrows are pointed correctly for CCW arcs
	diff = PI / 180;
	if (path.ccw) {
		diff *= -1;
	}

	// Calculate coordinates for start arrow
	let x1 = _getArcX(path, path.start + diff);
	let y1 = _getArcY(path, path.start + diff);
	let x2 = _getArcX(path, path.start);
	let y2 = _getArcY(path, path.start);

	_addStartArrow(canvas, ctx, params, path, x1, y1, x2, y2);

	// Draw arc
	ctx.arc(
		path.x + offsetX,
		path.y + offsetY,
		path.radius,
		path.start,
		path.end,
		path.ccw
	);

	// Calculate coordinates for end arrow
	let x3 = _getArcX(path, path.end + diff);
	let y3 = _getArcY(path, path.end + diff);
	let x4 = _getArcX(path, path.end);
	let y4 = _getArcY(path, path.end);

	_addEndArrow(canvas, ctx, params, path, x4, y4, x3, y3);
}

// Draws arc or circle
$.fn.drawArc = function drawArc(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawArc);
		if (params.visible) {
			_transformShape(canvas, ctx, params, params.radius * 2);
			_setGlobalProps(canvas, ctx, params);

			ctx.beginPath();
			_drawArc(canvas, ctx, params, params);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Optionally close path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Draws ellipse
$.fn.drawEllipse = function drawEllipse(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawEllipse);
		if (params.visible) {
			_transformShape(canvas, ctx, params, params.width, params.height);
			_setGlobalProps(canvas, ctx, params);

			// Calculate control width and height
			let controlW = (params.width || 0) * (4 / 3);
			let controlH = params.height || 0;

			// Create ellipse using curves
			ctx.beginPath();
			ctx.moveTo(params.x, params.y - controlH / 2);
			// Left side
			ctx.bezierCurveTo(
				params.x - controlW / 2,
				params.y - controlH / 2,
				params.x - controlW / 2,
				params.y + controlH / 2,
				params.x,
				params.y + controlH / 2
			);
			// Right side
			ctx.bezierCurveTo(
				params.x + controlW / 2,
				params.y + controlH / 2,
				params.x + controlW / 2,
				params.y - controlH / 2,
				params.x,
				params.y - controlH / 2
			);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Always close path
			params.closed = true;
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Draws a regular (equal-angled) polygon
$.fn.drawPolygon = function drawPolygon(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawPolygon);
		if (params.visible) {
			_transformShape(canvas, ctx, params, params.radius * 2);
			_setGlobalProps(canvas, ctx, params);

			// Polygon's central angle
			const dtheta = (2 * PI) / params.sides;
			// Half of dtheta
			const hdtheta = dtheta / 2;
			// Polygon's starting angle
			let theta = hdtheta + PI / 2;
			// Distance from polygon's center to the middle of its side
			const apothem = params.radius * cos(hdtheta);

			// Calculate path and draw
			ctx.beginPath();
			for (let i = 0; i < params.sides; i += 1) {
				// Draw side of polygon
				let x = params.x + params.radius * cos(theta);
				let y = params.y + params.radius * sin(theta);

				// Plot point on polygon
				ctx.lineTo(x, y);

				// Project side if chosen
				if (params.concavity) {
					// Sides are projected from the polygon's apothem
					x =
						params.x +
						(apothem + -apothem * params.concavity) * cos(theta + hdtheta);
					y =
						params.y +
						(apothem + -apothem * params.concavity) * sin(theta + hdtheta);
					ctx.lineTo(x, y);
				}

				// Increment theta by delta theta
				theta += dtheta;
			}
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Always close path
			params.closed = true;
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Draws pie-shaped slice
$.fn.drawSlice = function drawSlice(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawSlice);
		if (params.visible) {
			_transformShape(canvas, ctx, params, params.radius * 2);
			_setGlobalProps(canvas, ctx, params);

			// Perform extra calculations

			// Convert angles to radians
			params.start *= params._toRad;
			params.end *= params._toRad;
			// Consider 0deg at north of arc
			params.start -= PI / 2;
			params.end -= PI / 2;

			// Find positive equivalents of angles
			params.start = _getCoterminal(params.start);
			params.end = _getCoterminal(params.end);
			// Ensure start angle is less than end angle
			if (params.end < params.start) {
				params.end += 2 * PI;
			}

			// Calculate angular position of slice
			const angle = (params.start + params.end) / 2;

			// Calculate ratios for slice's angle
			const dx = params.radius * params.spread * cos(angle);
			const dy = params.radius * params.spread * sin(angle);

			// Adjust position of slice
			params.x += dx;
			params.y += dy;

			// Draw slice
			ctx.beginPath();
			ctx.arc(
				params.x,
				params.y,
				params.radius,
				params.start,
				params.end,
				params.ccw
			);
			ctx.lineTo(params.x, params.y);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Always close path
			params.closed = true;
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

/* Path API */

// Adds arrow to path using the given properties
function _addArrow(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject,
	x1: number,
	y1: number,
	x2: number,
	y2: number
) {
	// If arrow radius is given and path is not closed
	if (path.arrowRadius && !params.closed) {
		// Calculate angle
		let angle = atan2(y2 - y1, x2 - x1);
		// Adjust angle correctly
		angle -= PI;
		// Calculate offset to place arrow at edge of path
		const offsetX = params.strokeWidth * cos(angle);
		const offsetY = params.strokeWidth * sin(angle);

		// Calculate coordinates for left half of arrow
		const leftX = x2 + path.arrowRadius * cos(angle + path.arrowAngle / 2);
		const leftY = y2 + path.arrowRadius * sin(angle + path.arrowAngle / 2);
		// Calculate coordinates for right half of arrow
		const rightX = x2 + path.arrowRadius * cos(angle - path.arrowAngle / 2);
		const rightY = y2 + path.arrowRadius * sin(angle - path.arrowAngle / 2);

		// Draw left half of arrow
		ctx.moveTo(leftX - offsetX, leftY - offsetY);
		ctx.lineTo(x2 - offsetX, y2 - offsetY);
		// Draw right half of arrow
		ctx.lineTo(rightX - offsetX, rightY - offsetY);

		// Visually connect arrow to path
		ctx.moveTo(x2 - offsetX, y2 - offsetY);
		ctx.lineTo(x2 + offsetX, y2 + offsetY);
		// Move back to end of path
		ctx.moveTo(x2, y2);
	}
}

// Optionally adds arrow to start of path
function _addStartArrow(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject,
	x1: number,
	y1: number,
	x2: number,
	y2: number
) {
	if (!path._arrowAngleConverted) {
		path.arrowAngle *= params._toRad;
		path._arrowAngleConverted = true;
	}
	if (path.startArrow) {
		_addArrow(canvas, ctx, params, path, x1, y1, x2, y2);
	}
}

// Optionally adds arrow to end of path
function _addEndArrow(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject,
	x1: number,
	y1: number,
	x2: number,
	y2: number
) {
	if (!path._arrowAngleConverted) {
		path.arrowAngle *= params._toRad;
		path._arrowAngleConverted = true;
	}
	if (path.endArrow) {
		_addArrow(canvas, ctx, params, path, x1, y1, x2, y2);
	}
}

// Draws line (internal)
function _drawLine(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject
) {
	let l = 2;
	_addStartArrow(
		canvas,
		ctx,
		params,
		path,
		path.x2 + params.x,
		path.y2 + params.y,
		path.x1 + params.x,
		path.y1 + params.y
	);
	if (path.x1 !== undefined && path.y1 !== undefined) {
		ctx.moveTo(path.x1 + params.x, path.y1 + params.y);
	}
	while (true) {
		// Calculate next coordinates
		const lx = path["x" + l];
		const ly = path["y" + l];
		// If coordinates are given
		if (lx !== undefined && ly !== undefined) {
			// Draw next line
			ctx.lineTo(lx + params.x, ly + params.y);
			l += 1;
		} else {
			// Otherwise, stop drawing
			break;
		}
	}
	l -= 1;
	// Optionally add arrows to path
	_addEndArrow(
		canvas,
		ctx,
		params,
		path,
		path["x" + (l - 1)] + params.x,
		path["y" + (l - 1)] + params.y,
		path["x" + l] + params.x,
		path["y" + l] + params.y
	);
}

// Draws line
$.fn.drawLine = function drawLine(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawLine);
		if (params.visible) {
			_transformShape(canvas, ctx, params);
			_setGlobalProps(canvas, ctx, params);

			// Draw each point
			ctx.beginPath();
			_drawLine(canvas, ctx, params, params);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Optionally close path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Draws quadratic curve (internal)
function _drawQuadratic(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject
) {
	let l = 2;

	_addStartArrow(
		canvas,
		ctx,
		params,
		path,
		path.cx1 + params.x,
		path.cy1 + params.y,
		path.x1 + params.x,
		path.y1 + params.y
	);

	if (path.x1 !== undefined && path.y1 !== undefined) {
		ctx.moveTo(path.x1 + params.x, path.y1 + params.y);
	}
	while (true) {
		// Calculate next coordinates
		const lx = path["x" + l];
		const ly = path["y" + l];
		const lcx = path["cx" + (l - 1)];
		const lcy = path["cy" + (l - 1)];
		// If coordinates are given
		if (
			lx !== undefined &&
			ly !== undefined &&
			lcx !== undefined &&
			lcy !== undefined
		) {
			// Draw next curve
			ctx.quadraticCurveTo(
				lcx + params.x,
				lcy + params.y,
				lx + params.x,
				ly + params.y
			);
			l += 1;
		} else {
			// Otherwise, stop drawing
			break;
		}
	}
	l -= 1;
	_addEndArrow(
		canvas,
		ctx,
		params,
		path,
		path["cx" + (l - 1)] + params.x,
		path["cy" + (l - 1)] + params.y,
		path["x" + l] + params.x,
		path["y" + l] + params.y
	);
}

// Draws quadratic curve
$.fn.drawQuadratic = function drawQuadratic(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawQuadratic);
		if (params.visible) {
			_transformShape(canvas, ctx, params);
			_setGlobalProps(canvas, ctx, params);

			// Draw each point
			ctx.beginPath();
			_drawQuadratic(canvas, ctx, params, params);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Optionally close path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Draws Bezier curve (internal)
function _drawBezier(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject
) {
	let l = 2;
	let lc = 1;

	_addStartArrow(
		canvas,
		ctx,
		params,
		path,
		path.cx1 + params.x,
		path.cy1 + params.y,
		path.x1 + params.x,
		path.y1 + params.y
	);

	if (path.x1 !== undefined && path.y1 !== undefined) {
		ctx.moveTo(path.x1 + params.x, path.y1 + params.y);
	}
	while (true) {
		// Calculate next coordinates
		const lx = path["x" + l];
		const ly = path["y" + l];
		const lcx1 = path["cx" + lc];
		const lcy1 = path["cy" + lc];
		const lcx2 = path["cx" + (lc + 1)];
		const lcy2 = path["cy" + (lc + 1)];
		// If next coordinates are given
		if (
			lx !== undefined &&
			ly !== undefined &&
			lcx1 !== undefined &&
			lcy1 !== undefined &&
			lcx2 !== undefined &&
			lcy2 !== undefined
		) {
			// Draw next curve
			ctx.bezierCurveTo(
				lcx1 + params.x,
				lcy1 + params.y,
				lcx2 + params.x,
				lcy2 + params.y,
				lx + params.x,
				ly + params.y
			);
			l += 1;
			lc += 2;
		} else {
			// Otherwise, stop drawing
			break;
		}
	}
	l -= 1;
	lc -= 2;
	_addEndArrow(
		canvas,
		ctx,
		params,
		path,
		path["cx" + (lc + 1)] + params.x,
		path["cy" + (lc + 1)] + params.y,
		path["x" + l] + params.x,
		path["y" + l] + params.y
	);
}

// Draws Bezier curve
$.fn.drawBezier = function drawBezier(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawBezier);
		if (params.visible) {
			_transformShape(canvas, ctx, params);
			_setGlobalProps(canvas, ctx, params);

			// Draw each point
			ctx.beginPath();
			_drawBezier(canvas, ctx, params, params);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Optionally close path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Retrieves the x-coordinate for the given vector angle and length
function _getVectorX(params: jCanvasObject, angle: number, length: number) {
	angle *= params._toRad;
	angle -= PI / 2;
	return length * cos(angle);
}
// Retrieves the y-coordinate for the given vector angle and length
function _getVectorY(params: jCanvasObject, angle: number, length: number) {
	angle *= params._toRad;
	angle -= PI / 2;
	return length * sin(angle);
}

// Draws vector (internal) #2
function _drawVector(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	path: jCanvasObject
) {
	// Determine offset from dragging
	let offsetX: number;
	let offsetY: number;
	if (params === path) {
		offsetX = 0;
		offsetY = 0;
	} else {
		offsetX = params.x;
		offsetY = params.y;
	}

	let l = 1;
	let x = path.x + offsetX;
	let x3 = x;
	let x4 = x;
	let y = path.y + offsetY;
	let y3 = y;
	let y4 = y;

	_addStartArrow(
		canvas,
		ctx,
		params,
		path,
		x + _getVectorX(params, path.a1, path.l1),
		y + _getVectorY(params, path.a1, path.l1),
		x,
		y
	);

	// The vector starts at the given (x, y) coordinates
	if (path.x !== undefined && path.y !== undefined) {
		ctx.moveTo(x, y);
	}
	while (true) {
		const angle = path["a" + l];
		length = path["l" + l];

		if (angle !== undefined && length !== undefined) {
			// Convert the angle to radians with 0 degrees starting at north
			// Keep track of last two coordinates
			x3 = x4;
			y3 = y4;
			// Compute (x, y) coordinates from angle and length
			x4 += _getVectorX(params, angle, length);
			y4 += _getVectorY(params, angle, length);
			ctx.lineTo(x4, y4);
			l += 1;
		} else {
			// Otherwise, stop drawing
			break;
		}
	}
	_addEndArrow(canvas, ctx, params, path, x3, y3, x4, y4);
}

// Draws vector
$.fn.drawVector = function drawVector(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawVector);
		if (params.visible) {
			_transformShape(canvas, ctx, params);
			_setGlobalProps(canvas, ctx, params);

			// Draw each point
			ctx.beginPath();
			_drawVector(canvas, ctx, params, params);
			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Optionally close path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

// Draws a path consisting of one or more subpaths
$.fn.drawPath = function drawPath(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawPath);
		if (params.visible) {
			_transformShape(canvas, ctx, params);
			_setGlobalProps(canvas, ctx, params);

			ctx.beginPath();
			let l = 1;
			while (true) {
				let lp = params["p" + l];
				if (lp !== undefined) {
					lp = new jCanvasObject(lp);
					if (lp.type === "line") {
						_drawLine(canvas, ctx, params, lp);
					} else if (lp.type === "quadratic") {
						_drawQuadratic(canvas, ctx, params, lp);
					} else if (lp.type === "bezier") {
						_drawBezier(canvas, ctx, params, lp);
					} else if (lp.type === "vector") {
						_drawVector(canvas, ctx, params, lp);
					} else if (lp.type === "arc") {
						_drawArc(canvas, ctx, params, lp);
					}
					l += 1;
				} else {
					break;
				}
			}

			// Check for jCanvas events
			_detectEvents(canvas, ctx, params);
			// Optionally close path
			_closePath(canvas, ctx, params);
		}
	}
	return $canvases;
};

/* Text API */

// Calculates font string and set it as the canvas font
function _setCanvasFont(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject
) {
	// Otherwise, use the given font attributes
	if (!isNaN(Number(params.fontSize))) {
		// Give font size units if it doesn't have any
		params.fontSize += "px";
	}
	// Set font using given font properties
	ctx.font = params.fontStyle + " " + params.fontSize + " " + params.fontFamily;
}

// Measures canvas text
function _measureText(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	params: jCanvasObject,
	lines: string[]
) {
	const propCache = caches.propCache;

	// Used cached width/height if possible
	if (
		propCache.width &&
		propCache.height &&
		propCache.text === params.text &&
		propCache.fontStyle === params.fontStyle &&
		propCache.fontSize === params.fontSize &&
		propCache.fontFamily === params.fontFamily &&
		propCache.maxWidth === params.maxWidth &&
		propCache.lineHeight === params.lineHeight
	) {
		params.width = propCache.width;
		params.height = propCache.height;
	} else {
		// Calculate text dimensions only once

		// Calculate width of first line (for comparison)
		params.width = ctx.measureText(lines[0]).width;

		// Get width of longest line
		for (let l = 1; l < lines.length; l += 1) {
			const curWidth = ctx.measureText(lines[l]).width;
			// Ensure text's width is the width of its longest line
			if (curWidth > params.width) {
				params.width = curWidth;
			}
		}

		// Save original font size
		const originalSize = canvas.style.fontSize;
		// Temporarily set canvas font size to retrieve size in pixels
		canvas.style.fontSize = params.fontSize;
		// Save text width and height in parameters object
		params.height =
			parseFloat($.css(canvas, "fontSize")) * lines.length * params.lineHeight;
		// Reset font size to original size
		canvas.style.fontSize = originalSize;
	}
}

// Wraps a string of text within a defined width
function _wrapText(ctx: CanvasRenderingContext2D, params: jCanvasObject) {
	const allText = String(params.text);
	// Maximum line width (optional)
	const maxWidth = params.maxWidth;
	// Lines created by manual line breaks (\n)
	const manualLines = allText.split("\n");
	// All lines created manually and by wrapping
	let allLines: string[] = [];

	// Loop through manually-broken lines
	for (let l = 0; l < manualLines.length; l += 1) {
		const text = manualLines[l];
		// Split line into list of words
		const words = text.split(" ");
		let lines = [];
		let line = "";

		// If text is short enough initially
		// Or, if the text consists of only one word
		if (
			words.length === 1 ||
			(maxWidth && ctx.measureText(text).width < maxWidth)
		) {
			// No need to wrap text
			lines = [text];
		} else {
			// Wrap lines
			for (let w = 0; w < words.length; w += 1) {
				// Once line gets too wide, push word to next line
				if (maxWidth && ctx.measureText(line + words[w]).width > maxWidth) {
					// This check prevents empty lines from being created
					if (line !== "") {
						lines.push(line);
					}
					// Start new line and repeat process
					line = "";
				}
				// Add words to line until the line is too wide
				line += words[w];
				// Do not add a space after the last word
				if (w !== words.length - 1) {
					line += " ";
				}
			}
			// The last word should always be pushed
			lines.push(line);
		}
		// Remove extra space at the end of each line
		allLines = allLines.concat(
			lines
				.join("\n")
				.replace(/((\n))|($)/gi, "$2")
				.split("\n")
		);
	}

	return allLines;
}

// Draws text on canvas
$.fn.drawText = function drawText(args) {
	const $canvases = this;
	const constantCloseness = 500;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, drawText);
		if (params.visible) {
			// Set text-specific properties
			ctx.textBaseline = params.baseline;
			ctx.textAlign = params.align;

			// Set canvas font using given properties
			_setCanvasFont(canvas, ctx, params);

			let lines: string[];
			if (params.maxWidth !== null) {
				// Wrap text using an internal function
				lines = _wrapText(ctx, params);
			} else {
				// Convert string of text to list of lines
				lines = params.text.toString().split("\n");
			}

			// Calculate text's width and height
			_measureText(canvas, ctx, params, lines);

			_transformShape(canvas, ctx, params, params.width, params.height);
			_setGlobalProps(canvas, ctx, params);

			// Adjust text position to accomodate different horizontal alignments
			let x = params.x;
			if (params.align === "left" && params.width) {
				if (params.respectAlign) {
					// Realign text to the left if chosen
					params.x += params.width / 2;
				} else {
					// Center text block by default
					x -= params.width / 2;
				}
			} else if (params.align === "right" && params.width) {
				if (params.respectAlign) {
					// Realign text to the right if chosen
					params.x -= params.width / 2;
				} else {
					// Center text block by default
					x += params.width / 2;
				}
			}

			if (params.radius) {
				let fontSize = parseFloat(params.fontSize);

				// Greater values move clockwise
				if (params.letterSpacing === null) {
					params.letterSpacing = fontSize / constantCloseness;
				}

				// Loop through each line of text
				for (let l = 0; l < lines.length; l += 1) {
					ctx.save();
					ctx.translate(params.x, params.y);
					let line = lines[l];
					let chars: string[];
					if (params.flipArcText) {
						chars = line.split("");
						chars.reverse();
						line = chars.join("");
					}
					const nchars = line.length;
					ctx.rotate(-(PI * params.letterSpacing * (nchars - 1)) / 2);
					// Loop through characters on each line
					for (let c = 0; c < nchars; c += 1) {
						const ch = line[c];
						// If character is not the first character
						if (c !== 0) {
							// Rotate character onto arc
							ctx.rotate(PI * params.letterSpacing);
						}
						ctx.save();
						ctx.translate(0, -params.radius);
						if (params.flipArcText) {
							ctx.scale(-1, -1);
						}
						ctx.fillText(ch, 0, 0);
						// Prevent extra shadow created by stroke (but only when fill is present)
						if (params.fillStyle !== "transparent") {
							ctx.shadowColor = "transparent";
						}
						if (params.strokeWidth !== 0) {
							// Only stroke if the stroke is not 0
							ctx.strokeText(ch, 0, 0);
						}
						ctx.restore();
					}
					params.radius -= fontSize;
					params.letterSpacing += fontSize / (constantCloseness * 2 * PI);
					ctx.restore();
				}
			} else {
				// Draw each line of text separately
				for (let l = 0; l < lines.length; l += 1) {
					const line = lines[l];
					// Add line offset to center point, but subtract some to center everything
					const y =
						params.y +
						(l * (params.height || 0)) / lines.length -
						((lines.length - 1) * (params.height || 0)) / lines.length / 2;

					ctx.shadowColor = params.shadowColor;

					// Fill & stroke text
					ctx.fillText(line, x, y);
					// Prevent extra shadow created by stroke (but only when fill is present)
					if (params.fillStyle !== "transparent") {
						ctx.shadowColor = "transparent";
					}
					if (params.strokeWidth !== 0) {
						// Only stroke if the stroke is not 0
						ctx.strokeText(line, x, y);
					}
				}
			}

			// Adjust bounding box according to text baseline
			let y = 0;
			if (params.baseline === "top") {
				y += (params.height || 0) / 2;
			} else if (params.baseline === "bottom") {
				y -= (params.height || 0) / 2;
			}

			// Detect jCanvas events
			if (params._event) {
				const nonNullWidth = params.width || 0;
				const nonNullHeight = params.height || 0;
				ctx.beginPath();
				ctx.rect(
					params.x - nonNullWidth / 2,
					params.y - nonNullHeight / 2 + y,
					nonNullWidth,
					nonNullHeight
				);
				_detectEvents(canvas, ctx, params);
				// Close path and configure masking
				ctx.closePath();
			}
			_restoreTransform(ctx, params);
		}
		// Cache jCanvas parameters object for efficiency
		if (params) {
			caches.propCache = params;
		}
	}
	return $canvases;
};

// Measures text width/height using the given parameters
$.fn.measureText = function measureText(args) {
	const $canvases = this;

	// Attempt to retrieve layer
	let params = $canvases.getLayer(args);
	// If layer does not exist or if returned object is not a jCanvas layer
	if (!params || (params && !params._layer)) {
		params = new jCanvasObject(args);
	}

	const canvas = $canvases[0];
	if (!_isCanvas(canvas)) {
		return params;
	}
	const ctx = _getContext(canvas);
	if (!ctx) {
		return params;
	}
	// Set canvas font using given properties
	_setCanvasFont(canvas, ctx, params);
	// Calculate width and height of text
	let lines: string[];
	if (params.maxWidth !== null) {
		lines = _wrapText(ctx, params);
	} else {
		lines = params.text.split("\n");
	}
	_measureText(canvas, ctx, params, lines);

	return params;
};

/* Image API */

// Draws image on canvas
$.fn.drawImage = function drawImage(args) {
	const $canvases = this;
	let img: HTMLImageElement | HTMLCanvasElement | null = null,
		source: jCanvasObject["source"],
		imageCache = caches.imageCache;

	// Draw image function
	function draw(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		data: JCanvasInternalData,
		params: jCanvasObject,
		layer: jCanvasObject | undefined
	) {
		if (!img) {
			return;
		}
		// If width and sWidth are not defined, use image width
		if (params.width === null && params.sWidth === null) {
			params.width = params.sWidth = img.width;
		}
		// If width and sHeight are not defined, use image height
		if (params.height === null && params.sHeight === null) {
			params.height = params.sHeight = img.height;
		}

		// Ensure image layer's width and height are accurate
		if (layer) {
			layer.width = params.width;
			layer.height = params.height;
		}

		const nonNullWidth = params.width || 0;
		const nonNullHeight = params.height || 0;

		// Only crop image if all cropping properties are given
		if (
			params.sWidth !== null &&
			params.sHeight !== null &&
			params.sx !== null &&
			params.sy !== null
		) {
			// If width is not defined, use the given sWidth
			if (params.width === null) {
				params.width = params.sWidth;
			}
			// If height is not defined, use the given sHeight
			if (params.height === null) {
				params.height = params.sHeight;
			}

			// Optionally crop from top-left corner of region
			if (params.cropFromCenter) {
				params.sx += params.sWidth / 2;
				params.sy += params.sHeight / 2;
			}

			// Ensure cropped region does not escape image boundaries

			// Top
			if (params.sy - params.sHeight / 2 < 0) {
				params.sy = params.sHeight / 2;
			}
			// Bottom
			if (params.sy + params.sHeight / 2 > img.height) {
				params.sy = img.height - params.sHeight / 2;
			}
			// Left
			if (params.sx - params.sWidth / 2 < 0) {
				params.sx = params.sWidth / 2;
			}
			// Right
			if (params.sx + params.sWidth / 2 > img.width) {
				params.sx = img.width - params.sWidth / 2;
			}

			_transformShape(canvas, ctx, params, params.width, params.height);
			_setGlobalProps(canvas, ctx, params);

			// Draw image
			ctx.drawImage(
				img,
				params.sx - params.sWidth / 2,
				params.sy - params.sHeight / 2,
				params.sWidth,
				params.sHeight,
				params.x - params.width / 2,
				params.y - params.height / 2,
				params.width,
				params.height
			);
		} else {
			// Show entire image if no crop region is defined

			_transformShape(canvas, ctx, params, params.width, params.height);
			_setGlobalProps(canvas, ctx, params);

			// Draw image on canvas
			ctx.drawImage(
				img,
				params.x - nonNullWidth / 2,
				params.y - nonNullHeight / 2,
				nonNullWidth,
				nonNullHeight
			);
		}

		// Draw invisible rectangle to allow for events and masking
		ctx.beginPath();
		ctx.rect(
			params.x - nonNullWidth / 2,
			params.y - nonNullHeight / 2,
			nonNullWidth,
			nonNullHeight
		);
		// Check for jCanvas events
		_detectEvents(canvas, ctx, params);
		// Close path and configure masking
		ctx.closePath();
		_restoreTransform(ctx, params);
		_enableMasking(ctx, data, params);
	}
	// On load function
	function onload(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		data: JCanvasInternalData,
		params: jCanvasObject,
		layer: jCanvasObject | undefined
	) {
		return function () {
			const $canvas = $(canvas);
			draw(canvas, ctx, data, params, layer);
			if (params.layer && layer) {
				// Trigger 'load' event for layers
				_triggerLayerEvent($canvas, data, layer, "load");
			} else if (params.load) {
				// Run 'load' callback for non-layers
				params.load.call($canvas[0], layer);
			}
			// Continue drawing successive layers after this image layer has loaded
			if (params.layer && layer) {
				// Store list of previous masks for each layer
				layer._masks = data.transforms.masks.slice(0);
				if (params._next) {
					// Draw successive layers
					const complete = data.drawLayersComplete;
					delete data.drawLayersComplete;
					$canvas.drawLayers({
						clear: false,
						resetFire: true,
						index: params._next,
						complete: complete,
					});
				}
			}
		};
	}
	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		const data = _getCanvasData(canvas);
		const params = new jCanvasObject(args);
		const layer = _addLayer(canvas, params, args, drawImage);
		if (params.visible) {
			// Cache the given source
			source = params.source;

			if (
				source instanceof HTMLImageElement ||
				source instanceof HTMLCanvasElement
			) {
				// Use image or canvas element if given
				img = source;
			} else if (source) {
				let cachedImg = imageCache[source];
				if (cachedImg && cachedImg.complete) {
					// Get the image element from the cache if possible
					img = cachedImg;
				} else {
					// Otherwise, get the image from the given source URL
					img = new Image();
					// If source URL is not a data URL
					if (!source.match(/^data:/i)) {
						// Set crossOrigin for this image
						img.crossOrigin = params.crossOrigin;
					}
					img.src = source;
					// Save image in cache for improved performance
					imageCache[source] = img;
				}
			}

			if (img) {
				if (
					(img instanceof HTMLImageElement && img.complete) ||
					img instanceof HTMLCanvasElement
				) {
					// Draw image if already loaded
					onload(canvas, ctx, data, params, layer)();
				} else {
					// Otherwise, draw image when it loads
					img.onload = onload(canvas, ctx, data, params, layer);
				}
			}
		}
	}
	return $canvases;
};

// Creates a canvas pattern object
$.fn.createPattern = function createPattern(args) {
	const $canvases = this;
	let img: HTMLCanvasElement | HTMLImageElement;
	let pattern: CanvasPattern | null = null;
	let source: HTMLImageElement | HTMLCanvasElement | string;

	// Function to be called when pattern loads
	function onload(ctx: CanvasRenderingContext2D, params: jCanvasObject) {
		// Create pattern
		pattern = ctx.createPattern(img, params.repeat);
		// Run callback function if defined
		if (params.load) {
			params.load.call($canvases[0], pattern);
		}
	}

	const canvas = $canvases[0];
	if (!_isCanvas(canvas)) {
		return null;
	}
	const ctx = _getContext(canvas);
	if (!ctx) {
		return null;
	}
	const params = new jCanvasObject(args);

	// Cache the given source
	source = params.source;

	// Draw when image is loaded (if load() callback function is defined)

	if (isFunction(source)) {
		// Draw pattern using function if given

		img = $("<canvas />")[0] as HTMLCanvasElement;
		img.width = params.width || 0;
		img.height = params.height || 0;
		let imgCtx = _getContext(img);
		source.call(img, imgCtx);
		onload(ctx, params);
	} else {
		// Otherwise, draw pattern using source image

		if (
			source instanceof HTMLImageElement ||
			source instanceof HTMLCanvasElement
		) {
			// Use image element if given
			img = source;
		} else {
			// Use URL if given to get the image
			img = new Image();
			// If source URL is not a data URL
			if (!source.match(/^data:/i)) {
				// Set crossOrigin for this image
				img.crossOrigin = params.crossOrigin;
			}
			img.src = source;
		}

		// Create pattern if already loaded
		if (
			(img instanceof HTMLImageElement && img.complete) ||
			img instanceof HTMLCanvasElement
		) {
			onload(ctx, params);
		} else {
			img.onload = () => onload(ctx, params);
		}
	}
	return pattern;
};

// Creates a canvas gradient object
$.fn.createGradient = function createGradient(args) {
	const $canvases = this;
	let gradient: CanvasGradient | null = null;
	const stops: (number | null)[] = [];

	const params = new jCanvasObject(args);
	const canvas = $canvases[0];
	if (!_isCanvas(canvas)) {
		return;
	}
	const ctx = _getContext(canvas);
	if (!ctx) {
		return;
	}
	// Gradient coordinates must be defined
	params.x1 = params.x1 || 0;
	params.y1 = params.y1 || 0;
	params.x2 = params.x2 || 0;
	params.y2 = params.y2 || 0;

	if (params.r1 !== null && params.r2 !== null) {
		// Create radial gradient if chosen
		gradient = ctx.createRadialGradient(
			params.x1,
			params.y1,
			params.r1,
			params.x2,
			params.y2,
			params.r2
		);
	} else {
		// Otherwise, create a linear gradient by default
		gradient = ctx.createLinearGradient(
			params.x1,
			params.y1,
			params.x2,
			params.y2
		);
	}

	// Count number of color stops
	for (let i = 1; params["c" + i] !== undefined; i += 1) {
		if (params["s" + i] !== undefined) {
			stops.push(params["s" + i]);
		} else {
			stops.push(null);
		}
	}
	let nstops = stops.length;

	// Define start stop if not already defined
	if (stops[0] === null) {
		stops[0] = 0;
	}
	// Define end stop if not already defined
	if (stops[nstops - 1] === null) {
		stops[nstops - 1] = 1;
	}

	// Loop through color stops to fill in the blanks
	for (let i = 0; i < nstops; i += 1) {
		// A progression, in this context, is defined as all of the color stops between and including two known color stops
		let p: number = 0;
		let start: number | null = null;
		let end: number | null = null;
		// Number of stops in current progression
		let n = 1;
		if (stops[i] !== null) {
			// Start a new progression if stop is a number

			// Current iteration in current progression
			p = 0;
			start = stops[i];

			// Look ahead to find end stop
			let a;
			for (a = i + 1; a < nstops; a += 1) {
				if (stops[a] !== null) {
					// If this future stop is a number, make it the end stop for this progression
					end = stops[a];
					break;
				} else {
					// Otherwise, keep looking ahead
					n += 1;
				}
			}

			// Ensure start stop is not greater than end stop
			if (start! > end!) {
				stops[a] = stops[i];
			}
		} else if (stops[i] === null) {
			// Calculate stop if not initially given
			p += 1;
			stops[i] = start! + p * ((end! - start!) / n);
		}
		// Add color stop to gradient object
		const stop = stops[i];
		if (stop !== null) {
			gradient.addColorStop(stop, params["c" + (i + 1)]);
		}
	}
	return gradient;
};

// Manipulates pixels on the canvas
$.fn.setPixels = function setPixels(args) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		const canvasData = _getCanvasData(canvas);
		if (!ctx) {
			continue;
		}
		const params = new jCanvasObject(args);
		_addLayer(canvas, params, args, setPixels);
		_transformShape(canvas, ctx, params, params.width, params.height);

		// Use entire canvas of x, y, width, or height is not defined
		if (params.width === null || params.height === null) {
			params.width = canvas.width;
			params.height = canvas.height;
			params.x = params.width / 2;
			params.y = params.height / 2;
		}

		if (params.width !== 0 && params.height !== 0) {
			// Only set pixels if width and height are not zero

			let imgData = ctx.getImageData(
				(params.x - params.width / 2) * canvasData.pixelRatio,
				(params.y - params.height / 2) * canvasData.pixelRatio,
				params.width * canvasData.pixelRatio,
				params.height * canvasData.pixelRatio
			);
			let pixelData = imgData.data;
			let len = pixelData.length;

			// Loop through pixels with the "each" callback function
			if (params.each) {
				for (let i = 0; i < len; i += 4) {
					const px = {
						r: pixelData[i],
						g: pixelData[i + 1],
						b: pixelData[i + 2],
						a: pixelData[i + 3],
					};
					params.each.call(canvas, px, params);
					pixelData[i] = px.r;
					pixelData[i + 1] = px.g;
					pixelData[i + 2] = px.b;
					pixelData[i + 3] = px.a;
				}
			}
			// Put pixels on canvas
			ctx.putImageData(
				imgData,
				(params.x - params.width / 2) * canvasData.pixelRatio,
				(params.y - params.height / 2) * canvasData.pixelRatio
			);
			// Restore transformation
			ctx.restore();
		}
	}
	return $canvases;
};

// Retrieves canvas image as data URL
$.fn.getCanvasImage = function getCanvasImage(type, quality) {
	const $canvases = this;
	if ($canvases.length !== 0) {
		const canvas = $canvases[0];
		if (_isCanvas(canvas) && canvas.toDataURL) {
			// JPEG quality defaults to 1
			if (quality === undefined) {
				quality = 1;
			}
			return canvas.toDataURL("image/" + type, quality);
		}
	}
	return null;
};

// Scales canvas based on the device's pixel ratio
$.fn.detectPixelRatio = function detectPixelRatio(callback) {
	const $canvases = this;

	for (let e = 0; e < $canvases.length; e += 1) {
		// Get canvas and its associated data
		const canvas = $canvases[e];
		if (!_isCanvas(canvas)) {
			continue;
		}
		const ctx = _getContext(canvas);
		if (!ctx) {
			continue;
		}
		let data = _getCanvasData(canvas);

		// If canvas has not already been scaled with this method
		if (!data.scaled) {
			// Determine device pixel ratios
			let ratio = window.devicePixelRatio || 1;

			if (ratio !== 1) {
				// Scale canvas relative to ratio

				// Get the current canvas dimensions for future use
				let oldWidth = canvas.width;
				let oldHeight = canvas.height;

				// Resize canvas relative to the determined ratio
				canvas.width = oldWidth * ratio;
				canvas.height = oldHeight * ratio;

				// Scale canvas back to original dimensions via CSS
				canvas.style.width = oldWidth + "px";
				canvas.style.height = oldHeight + "px";

				// Scale context to counter the manual scaling of canvas
				ctx.scale(ratio, ratio);
			}

			// Set pixel ratio on canvas data object
			data.pixelRatio = ratio;
			// Ensure that this method can only be called once for any given canvas
			data.scaled = true;

			// Call the given callback function with the ratio as its only argument
			if (callback) {
				callback.call(canvas, ratio);
			}
		}
	}
	return $canvases;
};

// Clears the jCanvas cache
jCanvas.clearCache = function clearCache() {
	for (let cacheName in caches) {
		if (Object.prototype.hasOwnProperty.call(caches, cacheName)) {
			caches[cacheName as keyof typeof caches] = {};
		}
	}
};

// Enable canvas feature detection with $.support
$.support.canvas = typeof HTMLCanvasElement !== "undefined";

// Export jCanvas functions
extendObject(jCanvas, {
	defaults: defaults,
	setGlobalProps: _setGlobalProps,
	transformShape: _transformShape,
	detectEvents: _detectEvents,
	closePath: _closePath,
	setCanvasFont: _setCanvasFont,
	measureText: _measureText,
});
$.jCanvas = jCanvas;
$.jCanvasObject = jCanvasObject;
