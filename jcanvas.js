/** @license jCanvas
Copyright 2012, Caleb Evans
Licensed under the MIT license
*/

// Import frequently used globals
(function($, document, Image, Math, parseFloat, TRUE, FALSE, NULL, UNDEFINED) {

// Define local aliases to frequently used properties
var defaults,
	prefs,
	merge = $.extend,
	round = Math.round,
	PI = Math.PI,
	sin = Math.sin,
	cos = Math.cos,
	originalEventFix = $.event.fix,
	cache = {},
	cssProps,
	cssPropsObj;
		
// Preferences constructor (which inherits from the defaults object)
function Prefs() {}

// jCanvas function
function jCanvas(args) {
	if (args) {
		// Merge arguments with preferences
		merge(prefs, args);
	} else {
		// Reset preferences to defaults if nothing is passed
		jCanvas.prefs = prefs = Prefs.prototype = merge({}, defaults);
	}
	return this;
}
// Allow jCanvas function to be "chained" to other methods
$.fn.jCanvas = jCanvas;

jCanvas.events = {};

// Set jCanvas default property values
defaults = {
	align: 'center',
	autosave: TRUE,
	baseline: 'middle',
	bringToFront: FALSE,
	ccw: FALSE,
	closed: FALSE,
	compositing: 'source-over',
	cornerRadius: 0,
	cropFromCenter: TRUE,
	draggable: FALSE,
	disableDrag: FALSE,
	each: NULL,
	end: 360,
	fillStyle: 'transparent',
	font: '12pt sans-serif',
	fromCenter: TRUE,
	height: NULL,
	inDegrees: TRUE,
	lineHeight: 1,
	load: NULL,
	mask: FALSE,
	maxWidth: NULL,
	method: NULL,
	miterLimit: 10,
	opacity: 1,
	projection: 0,
	r1: NULL,
	r2: NULL,
	radius: 0,
	repeat: 'repeat',
	rotate: 0,
	rounded: FALSE,
	scale: 1,
	scaleX: 1,
	scaleY: 1,
	shadowBlur: 0,
	shadowColor: 'transparent',
	shadowX: 0,
	shadowY: 0,
	sHeight: NULL,
	sides: 3,
	source: '',
	start: 0,
	strokeCap: 'butt',
	strokeJoin: 'miter',
	strokeStyle: 'transparent',
	strokeWidth: 1,
	sWidth: NULL,
	sx: NULL,
	sy: NULL,
	text: '',
	translate: 0,
	translateX: 0,
	translateY: 0,
	visible: TRUE,
	width: NULL,
	x: 0,
	y: 0
};

// Copy defaults to preferences object
jCanvas();

// Set global properties
function setGlobalProps(ctx, params) {
	// Fill/stroke styles
	ctx.fillStyle = params.fillStyle;
	ctx.strokeStyle = params.strokeStyle;
	ctx.lineWidth = params.strokeWidth;
	// Rounded corners for paths if chosen
	if (params.rounded) {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	} else {
		ctx.lineCap = params.strokeCap;
		ctx.lineJoin = params.strokeJoin;
		ctx.miterLimit = params.miterLimit;
	}
	// Drop shadow styles
	ctx.shadowOffsetX = params.shadowX;
	ctx.shadowOffsetY = params.shadowY;
	ctx.shadowBlur = params.shadowBlur;
	ctx.shadowColor = params.shadowColor;
	// Opacity and composite operation
	ctx.globalAlpha = params.opacity;
	ctx.globalCompositeOperation = params.compositing;
}

/* Internal helper methods */

// Get canvas context
function getContext(elem) {
	return (elem && elem.getContext ? elem.getContext('2d') : NULL);
}

// Close path
function closePath(ctx, params) {
	
	// Close path if chosen
	if (params.closed) {
		ctx.closePath();
	}
	ctx.fill();
	// Prevent extra shadow created by stroke (but only when fill is present)
	if (params.fillStyle !== 'transparent') {
		ctx.shadowColor = 'transparent';
	}
	ctx.stroke();
	// Close path if chosen
	if (!params.closed) {
		ctx.closePath();
	}
	// Restore transformation if transformShape() was called
	if (params._toRad) {
		ctx.restore();
	}
	// Mask shape if chosen
	if (params.mask) {
		if (params.autosave) {ctx.save();}
		ctx.clip();
	}
}

// Translate canvas (internal)
function translateCanvas(ctx, params, transforms) {
	
	// Translate both the x- and y-axis using the 'translate' property
	if (params.translate) {
		params.translateX = params.translateY = params.translate;
	}
	// Translate shape
	ctx.translate(params.translateX, params.translateY);
	transforms.translateX += params.translateX;
	transforms.translateY += params.translateY;
}

// Scale canvas (internal)
function scaleCanvas(ctx, params, transforms) {
	
	// Scale both the x- and y- axis using the 'scale' property
	if (params.scale !== 1) {
		params.scaleX = params.scaleY = params.scale;
	}
	// Scale shape
	ctx.translate(params.x, params.y);
	ctx.scale(params.scaleX, params.scaleY);
	ctx.translate(-params.x, -params.y);
	// Update transformation data
	transforms.scaleX *= params.scaleX;
	transforms.scaleY *= params.scaleY;
}

// Rotate canvas (internal)
function rotateCanvas(ctx, params, transforms) {
	params._toRad = (params.inDegrees ? PI/180 : 1);

	ctx.translate(params.x, params.y);
	ctx.rotate(params.rotate*params._toRad);
	ctx.translate(-params.x, -params.y);
	// Update transformation data
	transforms.rotate += params.rotate;
}

// Rotate/scale individual shape and/or position it correctly
function transformShape(e, ctx, params, width, height) {
	
	// Measure angles in chosen units
	params._toRad = (params.inDegrees ? PI/180 : 1);
	ctx.save();
	
	// Always draw from center unless otherwise specified
	if (height === UNDEFINED) {
		height = width;
	}
	if (!e && !params.fromCenter) {
		params.x += width/2;
		params.y += height/2;
	}
	
	// Rotate shape if chosen
	if (params.rotate) {
		rotateCanvas(ctx, params, {});
	}
	// Scale shape if chosen
	if (params.scale !== 1 || params.scaleX !== 1 || params.scaleY !== 1) {
		scaleCanvas(ctx, params, {});
	}
	if (params.translate || params.translateX || params.translateY) {
		translateCanvas(ctx, params, {});
	}
}

// Add support for draggable paths
function makePathDraggable(params) {
	if (params.draggable) {
		params.translateX += params.x;
		params.translateY += params.y;
	}
}

/* Plugin API */

// Extend jCanvas with custom methods
jCanvas.extend = function(plugin) {
	
	// Merge properties with defaults
	jCanvas.defaults = defaults = merge(defaults, plugin.props);
	jCanvas();
	
	// Create plugin
	if (plugin.name) {
		$.fn[plugin.name] = function self(args) {
			var $elems = this, elem, e, ctx,
				params = merge(new Prefs(), args);
			
			for (e=0; e<$elems.length; e+=1) {
				elem = $elems[e];
				ctx = getContext(elem);
				if (ctx) {
					addLayer(elem, args, self);
					setGlobalProps(ctx, params);
					plugin.fn.call(elem, ctx, params);
				}
			}
			return $elems;
		};
	}
	return $.fn[plugin.name];
};

/* Layer API */

// Keep track of the last two mouse coordinates for each canvas
function getCanvasData(elem) {
	var data;
	if (cache.elem === elem) {
		// Retrieve canvas data from cache
		data = cache.data;
	} else {
		// Get canvas data
		data = $.data(elem, 'jCanvas');
		// Create canvas data object if it does not already exist
		if (!data) {
			data = {
				layers: [],
				intersects: [],
				drag: {},
				event: {},
				transforms: {
					rotate: 0,
					scaleX: 1,
					scaleY: 1,
					translateX: 0,
					translateY: 0
				}
			};
			data.savedTransforms = merge({}, data.transforms);
			$.data(elem, 'jCanvas', data);
		}
		// Cache canvas data
		cache.elem = elem;
		cache.data = data;
	}
	return data;
}

// Get jCanvas layers
$.fn.getLayers = function() {
	var elem = this[0], layers;
	if (!elem || !elem.getContext) {
		layers = [];
	} else {
		layers = getCanvasData(elem).layers;
	}
	return layers;
};

// Get a single jCanvas layer
$.fn.getLayer = function(id) {
	var layers = this.getLayers(),
		idType = $.type(id),
		layer, l;
	
	if (id && id.layer) {
		// Return the layer itself if given
		layer = id;
	} else if (idType === 'number') {
		// Get layer based on given index
		layer = layers[id];
	} else {
		// Get layer based on given layer name
		for (l=0; l<layers.length; l+=1) {
			// Ensure layer's index property is accurate
			layers[l].index = l;
			// Check if layer matches name
			if (layers[l].name === id || (idType === 'regexp' && layers[l].name.match(id))) {
				layer = layers[l];
				break;
			}
		}
	}
	return layer;
};

// Set properties of a layer
$.fn.setLayer = function(id, props) {
	var $elems = this, e,
		layer;
	for (e=0; e<$elems.length; e+=1) {
		layer = $($elems[e]).getLayer(id);
		if (layer) {
			// Merge properties with layer
			merge(layer, props);
		}
	}
	return $elems;
};

// Move a layer's placement in the layers array
$.fn.moveLayer = function(id, index) {
	var $elems = this, $elem, e,
		layers, layer;
		
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		// Retrieve layers array and desired layer
		layers = $elem.getLayers();
		layer = $elem.getLayer(id);
		if (layer) {
			// Remove layer from its current placement
			layers.splice(layer.index, 1);
			// Add layer in its new placement
			layers.splice(index, 0, layer);
			// Update layer's stored index
			layer.index = index;
		}
	
	}
	return $elems;
};

// Remove a jCanvas layer
$.fn.removeLayer = function(id) {
	var $elems = this, $elem, e,
		layers, layer;
		
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		// Retrieve layers array and desired layer
		layers = $elem.getLayers();
		layer = $elem.getLayer(id);
		
		// Remove layer if found
		if (layer) {
			layers.splice(layer.index, 1);
		}
		
	}
	return $elems;
};

// Remove all jCanvas layers
$.fn.removeLayers = function() {
	var $elems = this, e,
		layers;
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers();
		layers.length = 0;
	}
	return $elems;
};

// Get all layers in the given group
$.fn.getLayerGroup = function(id) {
	var layers = this.getLayers(),
		idType = $.type(id),
		group = [], l;
	
	if (idType === 'array') {
		// Return layer group if given
		return id;
	} else {
		// Otherwise, find layers in group based on group name
		for (l=0; l<layers.length; l+=1) {
			// Ensure layer's index property is accurate
			layers[l].index = l;
			// Include layer is associated with group
			if (layers[l].group === id || (idType === 'regexp' && layers[l].group.match(id))) {
				group.push(layers[l]);
			}
		}
	}
	return group;
};

// Set properties of all layers in the given group
$.fn.setLayerGroup = function(id, props) {
	var $elems = this, $elem, e,
		group, l;
	
	for (e=0; e<$elems.length; e+=1) {
		// Get layer group
		$elem = $($elems[e]);
		group = $elem.getLayerGroup(id);
		for (l=0; l<group.length; l+=1) {
			// Merge given properties with layer
			merge(group[l], props);
		}
	}
	return $elems;
};

// Remove all layers within a specific group
$.fn.removeLayerGroup = function(id) {
	var $elems = this, $elem, e,
		idType = $.type(id),
		layers, l;
	
	if (id !== UNDEFINED) {
		for (e=0; e<$elems.length; e+=1) {
			$elem = $($elems[e]);
			layers = $elem.getLayers();
			// Get layer based on given layer name
			for (l=0; l<layers.length; l+=1) {
				// Ensure layer's index property is accurate
				layers[l].index = l;
				// Check if layer matches name
				if (layers[l].group === id || (idType === 'regexp' && layers[l].group.match(id))) {
					layers.splice(l, 1);
					l -= 1;
				}
			}
		}
	}
	return $elems;
};

// Draw individual layer (internal)
function drawLayer($elem, ctx, layer) {
	if (layer && layer.visible) {
		if (layer.method === $.fn.draw) {
			// If layer is a function, call it
			layer.fn.call($elem[0], ctx);
		} else if (layer.method) {
			// If layer is an object, call its respective method
			layer.method.call($elem, layer);
		}
	}
}

// Draw an individual layer
$.fn.drawLayer = function(name) {
	var $elems = this, e, ctx,
		$elem, layer;
		
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		// Retrieve the specified layer
		layer = $elem.getLayer(name);
		drawLayer($elem, ctx, layer);
	}
	return $elems;
};

// Draw all layers (or only the given layers)
$.fn.drawLayers = function(resetFire) {
	var $elems = this, $elem, e, ctx,
		layers, layer, l,
		data, eventCache, eventType,
		drag, callback;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);

			// Clear canvas first
			$elem.clearCanvas();
			
			// Retrieve canvas data from cache
			if (cache.elem === $elems[e]) {
				data = cache.data;
			} else {
				// Get canvas data and cache it
				data = getCanvasData($elems[e]);
				cache.elem = $elems[e];
				cache.data = data;
			}
			layers = data.layers;
			
			// Draw layers from first to last (bottom to top)
			for (l=0; l<layers.length; l+=1) {
				layer = layers[l];
				// Ensure layer index is up-to-date
				layer.index = l;
									
				// Prevent any one event from firing excessively
				if (resetFire) {
					layer._fired = FALSE;
				}
				drawLayer($elem, ctx, layer);
				
				// Trigger mouseout event if necessary
				if (layer._mousedout) {
					layer._mousedout = FALSE;
					layer._fired = TRUE;
					layer._hovered = FALSE;
					if (layer.mouseout) {
						layer.mouseout.call($elems[e], layer);
					}
					// Revert cursor when mousing off layer
					if (layer.cursor && layer._cursor) {
						$elem.css({
							cursor: layer._cursor
						});
					}
				}
				
			}
			
			layer = data.intersects[data.intersects.length-1] || {};
			eventCache = data.event;
			eventType = eventCache.type;
			callback = layer[eventType];
			drag = data.drag;
			
			// Check events for intersecting layer
			if (layer._event) {
													
				// Detect mouseover events
				if (layer.mouseover || layer.mouseout || layer.cursor) {
					if (!layer._hovered && !layer._fired) {
						layer._fired = TRUE;
						layer._hovered = TRUE;
						if (layer.mouseover) {
							layer.mouseover.call($elems[e], layer);
						}
						// Set cursor when mousing over layer
						if (layer.cursor) {
							layer._cursor = $elem.css('cursor');
							$elem.css({
								cursor: layer.cursor
							});
						}
					}
				}
																
				// Detect any other mouse event
				if (callback && !layer._fired) {
					layer._fired = TRUE;
					callback.call($elems[e], layer);
				}
								
				// Use the mousedown event to start drag
				if (layer.draggable && !layer.disableDrag && eventType === 'mousedown') {
								
					// Being layer to front when drag starts (if chosen)
					if (layer.bringToFront) {
						layers.splice(layer.index, 1);
						// The push() method returns the new length of the array
						layer.index = layers.push(layer);
					}
					
					// Keep track of drag state
					drag.layer = layer;
					drag.dragging = TRUE;
					drag.startX = layer.x;
					drag.startY = layer.y;
					drag.endX = layer._mouseX;
					drag.endY = layer._mouseY;
					
					// Trigger dragstart event if defined
					if (layer.dragstart) {
						layer.dragstart.call($elems[e], layer);
					}
				}
				
			}
			
			// Dragging a layer works independently from other events
			if (drag.layer) {
				
				// Use the mouseup event to stop the drag
				if (drag.dragging && eventType === 'mouseup') {
					// Trigger dragstop event if defined
					if (drag.layer.dragstop) {
						drag.layer.dragstop.call($elems[e], drag.layer);
					}
					data.drag = {};
				}
				// Regardless of whether the cursor is on the layer, drag the layer until drag stops
				if (drag.dragging && eventType === 'mousemove') {
					drag.layer.x = drag.layer._mouseX - (drag.endX - drag.startX);
					drag.layer.y = drag.layer._mouseY - (drag.endY - drag.startY);
					// Trigger drag event if defined
					if (drag.layer.drag) {
						drag.layer.drag.call($elems[e], drag.layer);
					}
				}
			}
			
		}
	}
	data.intersects = [];
	return $elems;
};

// Add a jCanvas layer (internal)
function addLayer(elem, layer, method) {
	var $elem, layers, event, layerFn,
		isFn = (typeof layer === 'function'),
		data, dragHelperEvents, i;
	layer = layer || {};
	
	// Only add layer if it hasn't been added before
	if (layer.layer && !layer._layer) {
		
		$elem = $(elem);
		layers = $elem.getLayers();
		
		// If layer is a function, wrap it in an object
		if (isFn) {
			layerFn = layer;
			// Wrap function within object
			layer = {
				method: $.fn.draw,
				fn: layerFn
			};
		}
		
		// Ensure layers are unique across canvases by cloning them
		layer = merge(new Prefs(), layer);
		
		// Detect events for non-function layers
		if (!isFn) {
						
			// Associate a jCanvas method with layer
			layer.method = $.fn[layer.method] || method;
			// Retrieve canvas data
			data = getCanvasData(elem);
				
			// Check for any associated jCanvas events and enable them
			for (event in jCanvas.events) {
				if (jCanvas.events.hasOwnProperty(event) && layer[event]) {
					jCanvas.events[event]($elem, data);
					layer._event = TRUE;
				}
			}
	
			// Enable drag-and-drop support and cursor support
			if (layer.draggable || layer.cursor) {
				layer._event = TRUE;
				dragHelperEvents = ['mousedown', 'mousemove', 'mouseup'];
				for (i=0; i<dragHelperEvents.length; i+=1) {
					event = dragHelperEvents[i];
					jCanvas.events[event]($elem, data);
				}
				// If cursor mouses out of canvas while dragging, cancel drag
				if (!data.mouseout) {
					$elem.bind('mouseout.jCanvas', function() {
						data.drag = {};
						$elem.drawLayers();
					});
					data.mouseout = TRUE;
				}
			}
		}
		// Set layer properties and add to stack
		layer.layer = TRUE;
		layer._layer = TRUE;
		// Add layer to end of array if no index is specified
		if (layer.index === UNDEFINED) {
			layer.index = layers.length;
		}
		// Add layer to layers array at specified index
		layers.splice(layer.index, 0, layer);
	}
}

// Add a jCanvas layer
$.fn.addLayer = function(args) {
	var $elems = this, e, ctx;
	args = args || {};

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			args.layer = TRUE;
			addLayer($elems[e], args);
		}
	}
	return $elems;
};

/* Animation API */

// Define properties used in both CSS and jCanvas
cssProps = [
	'width',
	'height',
	'opacity',
	'lineHeight'
];
cssPropsObj = {};

// Hide/show jCanvas/CSS properties so they can be animated using jQuery
function showProps(obj) {
	var i;
	for (i=0; i<cssProps.length; i+=1) {
		obj[cssProps[i]] = obj['_' + cssProps[i]];
	}
}
function hideProps(obj, reset) {
	var i;
	for (i=0; i<cssProps.length; i+=1) {
		obj['_' + cssProps[i]] = obj[cssProps[i]];
		cssPropsObj[cssProps[i]] = 1;
		if (reset) {
			delete obj[cssProps[i]];
		}
	}
}

// Convert a color value to RGB
function toRgb(color) {
	var originalColor, elem,
		rgb = [],
		multiple = 1;
	
	// Deal with hexadecimal colors and color names
	if (color.match(/^#?\w+$/i)) {
		// Deal with complete transparency
		if (color === 'transparent') {
			color = 'rgba(0,0,0,0)';
		}
		elem = document.head;
		originalColor = elem.style.color;
		elem.style.color = color;
		color = $.css(elem, 'color');
		elem.style.color = originalColor;
	}
	// Parse RGB string
	if (color.match(/^rgb/i)) {
		rgb = color.match(/\d+/gi);
		// Deal with RGB percentages
		if (color.match(/%/gi)) {
			multiple = 2.55;
		}
		rgb[0] *= multiple;
		rgb[1] *= multiple;
		rgb[2] *= multiple;
		// Ad alpha channel if given
		if (rgb[3] !== UNDEFINED) {
			rgb[3] = parseFloat(rgb[3]);
		} else {
			rgb[3] = 1;
		}
	}
	return rgb;
}

// Animate a hex or RGB color
function animateColor(fx) {
	var n = 3,
		i;
	// Only parse start and end colors once
	if (typeof fx.start !== 'object') {
		fx.start = toRgb(fx.start);
		fx.end = toRgb(fx.end);
	}
	fx.now = [];
	
	// If colors are RGBA, animate transparency
	if (fx.start[3] !== 1 || fx.end[3] !== 1) {
		n = 4;
	}
		
	// Calculate current frame for red, green, blue, and alpha
	for (i=0; i<n; i+=1) {
		fx.now[i] = fx.start[i] + (fx.end[i] - fx.start[i]) * fx.pos;
		// Only the red, green, and blue values must be integers
		if (i < 3) {
			fx.now[i] = round(fx.now[i]);
		}
	}
	if (fx.start[3] !== 1 || fx.end[3] !== 1) {
		// Only use RGBA if RGBA colors are given
		fx.now = 'rgba(' + fx.now.join(',') + ')';
	} else {
		// Otherwise, animate as solid colors
		fx.now.slice(0, 3);
		fx.now = 'rgb(' + fx.now.join(',') + ')';
	}
	// Animate colors for both canvas layers and DOM elements
	if (fx.elem.nodeName) {
		fx.elem.style[fx.prop] = fx.now;
	} else {
		fx.elem[fx.prop] = fx.now;
	}
}

// Animate jCanvas layer
$.fn.animateLayer = function() {
	var $elems = this, $elem, e, ctx,
		args = ([]).slice.call(arguments, 0),
		data,
		layer;
		
	// Deal with all cases of argument placement
	/*
		0. layer name/index
		1. properties
		2. duration/options
		3. easing
		4. complete function
		5. step function
	*/
	
	if (typeof args[0] === 'object' && !args[0].layer) {
		// Animate first layer by default
		args.unshift(0);
	}
	
	if (typeof args[2] === 'object') {
	
		// Accept an options object for animation
		args.splice(2, 0, args[2].duration || NULL);
		args.splice(3, 0, args[3].easing || NULL);
		args.splice(4, 0, args[4].complete || NULL);
		args.splice(5, 0, args[5].step || NULL);
			
	} else {
	
		if (args[2] === UNDEFINED) {
			// If object is the last argument
			args.splice(2, 0, NULL);
			args.splice(3, 0, NULL);
			args.splice(4, 0, NULL);
		} else if (typeof args[2] === 'function') {
			// If callback comes after object
			args.splice(2, 0, NULL);
			args.splice(3, 0, NULL);
		}
		if (args[3] === UNDEFINED) {
			// If duration is the last argument
			args[3] = NULL;
			args.splice(4, 0, NULL);
		} else if (typeof args[3] === 'function') {
			// If callback comes after duration
			args.splice(3, 0, NULL);
		}

	}
	
	// Run callback function when animation completes
	function complete($elem, layer) {
		return function() {
			showProps(layer);
			$elem.drawLayers();
			if (args[4]) {
				args[4].call($elem[0], layer);
			}
		};
	}
	// Redraw layers on every frame of the animation
	function step($elem, layer) {
		return function(now, fx) {
			showProps(layer);
			$elem.drawLayers();
			// Run callback function for every frame (if specified)
			if (args[5]) {
				args[5].call($elem[0], now, fx, layer);
			}
		};
	}

	// Do not modify original object
	args[1] = merge({}, args[1]);

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);

			// If a layer object was passed, use it the layer to be animated
			layer = $elem.getLayer(args[0]);
			
			// Ignore layers that are functions
			if (layer && layer.method !== $.fn.draw) {
								
				// Bypass jQuery CSS Hooks for CSS properties (width, opacity, etc.)
				hideProps(layer);
				hideProps(args[1], TRUE);
								
				// Fix for jQuery's vendor prefixing support, which affects how width/height/opacity are animated
				layer.style = cssPropsObj;
				
				// Animate layer
				$(layer).animate(args[1], {
					duration: args[2],
					easing: ($.easing[args[3]] ? args[3] : NULL),
					// When animation completes
					complete: complete($elem, layer),
					// Redraw canvas for every animation frame
					step: step($elem, layer)
				});
			}
		}
	}
	return $elems;
};

// Animate all layers in a layer group
$.fn.animateLayerGroup = function(id) {
	var $elems = this, $elem, e,
		args = ([]).slice.call(arguments, 0),
		group, l;
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		group = $elem.getLayerGroup(id);
		// Animate all layers in the group
		for (l=0; l<group.length; l+=1) {
			$elem.animateLayer.apply($elem, [group[l]].concat(args.slice(1)));
		}
	}
};

// Delay layer animation by a given number of milliseconds
$.fn.delayLayer = function(id, duration) {
	var $elems = this, e, layer;
	duration = duration || 0;
	
	for (e=0; e<$elems.length; e+=1) {
		layer = $($elems[e]).getLayer(id);
		$(layer).delay(duration);
	}
	return $elems;
};

// Delay animation all layers in a layer group
$.fn.delayLayerGroup = function(id, duration) {
	var $elems = this, $elem, e,
		group, l;
	duration = duration || 0;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		group = $elem.getLayerGroup(id);
		// Delay all layers in the group
		for (l=0; l<group.length; l+=1) {
			$elem.delayLayer.call($elem, group[l], duration);
		}
	}
};

// Stop layer animation
$.fn.stopLayer = function(id, clearQueue) {
	var $elems = this, e, layer;
	
	for (e=0; e<$elems.length; e+=1) {
		layer = $($elems[e]).getLayer(id);
		$(layer).stop(clearQueue);
	}
	return $elems;
};

// Stop animation of all layers in a layer group
$.fn.stopLayerGroup = function(id, clearQueue) {
	var $elems = this, $elem, e,
		group, l;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		group = $elem.getLayerGroup(id);
		// Stop all layers in the group
		for (l=0; l<group.length; l+=1) {
			$elem.stopLayer.call($elem, group[l], clearQueue);
		}
	}
};

// Enable animation for color properties
function supportColorProps(props) {
	var p;
	for (p=0; p<props.length; p+=1) {
		$.fx.step[props[p]] = animateColor;
	}
}

// Enable animation for color properties
supportColorProps([
	'color',
	'backgroundColor',
	'borderColor',
	'borderTopColor',
	'borderRightColor',
	'borderBottomColor',
	'borderLeftColor',
	'fillStyle',
	'outlineColor',
	'strokeStyle',
	'shadowColor'
]);

/* Event API */

// Bind event to jCanvas layer using standard jQuery events
function createEvent(eventName) {
	jCanvas.events[eventName] = function($elem, data) {
	
		// Both mouseover/mouseout events will be managed by a single mousemove event
		var helperEventName = (eventName === 'mouseover' || eventName === 'mouseout') ? 'mousemove' : eventName,
			// Retrieve canvas's event cache
			eventCache = data.event;
				
		// Ensure a single DOM event is not bound more than once
		if (!data[helperEventName]) {
			// Bind one canvas event which handles all layer events of that type
			$elem.bind(helperEventName + '.jCanvas', function(event) {
				// Cache current mouse position and redraw layers
				eventCache.x = event.offsetX;
				eventCache.y = event.offsetY;
				eventCache.type = helperEventName;
				$elem.drawLayers(TRUE);
				event.preventDefault();
			});
			data[helperEventName] = TRUE;
		}
	};
}
// Populate jCanvas events object with some standard events
createEvent('click');
createEvent('dblclick');
createEvent('mousedown');
createEvent('mouseup');
createEvent('mousemove');
createEvent('mouseover');
createEvent('mouseout');

// Check if event fires when a drawing is drawn
function checkEvents(elem, ctx, layer) {
	var data = getCanvasData(elem),
		eventCache = data.event,
		over = ctx.isPointInPath(eventCache.x, eventCache.y),
		transforms = data.transforms,
		x, y, angle;
		
	// Allow callback functions to retrieve the mouse coordinates
	layer.mouseX = eventCache.x;
	layer.mouseY = eventCache.y;
	
	// Adjust coordinates to match current canvas transformation
	
	// Keep track of some transformation values
	angle = data.transforms.rotate * PI / 180;
	x = layer.mouseX;
	y = layer.mouseY;

	// Rotate coordinates
	layer._mouseX = (x * cos(-angle)) - (y * sin(-angle));
	layer._mouseY = (y * cos(-angle)) + (x * sin(-angle));
	
	// Scale coordinates
	layer._mouseX /= transforms.scaleX;
	layer._mouseY /= transforms.scaleY;
	
	// Detect mouseout events
	if (!over && layer._hovered && !layer._fired) {
		layer._mousedout = TRUE;
	}
		
	// If layer intersects with cursor, add it to the list
	if (over) {
		data.intersects.push(layer);
	}
}

// Normalize offsetX and offsetY for all browsers
$.event.fix = function(event) {
	var offset;
	event = originalEventFix.call($.event, event);
	
	// If offsetX and offsetY are not supported, define them
	if (event.pageX !== UNDEFINED && event.offsetX === UNDEFINED) {
		offset = $(event.target).offset();
		if (offset) {
			event.offsetX = event.pageX - offset.left;
			event.offsetY = event.pageY - offset.top;
		}
	}
	return event;
};

/* Drawing API */

// Draw on canvas using a function
$.fn.draw = function self(args) {
	var $elems = this, e, ctx;
	args = args || {};
	
	// Convert single function argument to object
	if (typeof args === 'function') {
		args = {
			fn: args
		};
	}
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx && args.fn) {
			addLayer($elems[e], args, self);
			args.fn.call($elems[e], ctx);
		}
	}
	return $elems;
};

// Clear canvas
$.fn.clearCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			// Save current transformation
			transformShape(e, ctx, params, params.width, params.height);
			
			// Reset current transformation temporarily to ensure the entire canvas is cleared
			ctx.setTransform(1, 0, 0, 1, 0, 0);
					
			// Clear entire canvas if any area properties are not given
			if (!params.x || !params.y || !params.width || !params.height) {
				ctx.clearRect(0, 0, $elems[e].width, $elems[e].height);
			} else {
				// Otherwise, clear the defined section of the canvas
				ctx.clearRect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			}
			// Restore previous transformation
			ctx.restore();
			
		}
	}
	return $elems;
};

/* Transformation API */

// Save canvas
$.fn.saveCanvas = function() {
	var $elems = this, e, ctx,
		data;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);
			
			ctx.save();
			data.savedTransforms = merge({}, data.transforms);
		}
	}
	return $elems;
};

// Restore canvas
$.fn.restoreCanvas = function() {
	var $elems = this, e, ctx,
		data;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);
			
			ctx.restore();
			data.transforms = data.savedTransforms;
		}
	}
	return $elems;
};

// Translate canvas
$.fn.translateCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		data;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);
			
			if (params.autosave) {ctx.save();}
			translateCanvas(ctx, params, data.transforms);
		}
	}
	return $elems;
};

// Scale canvas
$.fn.scaleCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		data;
		
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);
			
			if (params.autosave) {ctx.save();}
			scaleCanvas(ctx, params, data.transforms);
		}
	}
	return $elems;
};

// Rotate canvas
$.fn.rotateCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		data;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			data = getCanvasData($elems[e]);
			
			if (params.autosave) {ctx.save();}
			rotateCanvas(ctx, params, data.transforms);
		}
	}
	return $elems;
};

/* Shape API */

// Draw rectangle
$.fn.drawRect = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		x1, y1, x2, y2, r;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
		
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			transformShape(e, ctx, params, params.width, params.height);
			
			ctx.beginPath();
			x1 = params.x - params.width/2;
			y1 = params.y - params.height/2;
			r = params.cornerRadius;
			// Draw a rounded rectangle if chosen
			if (r) {
				params.closed = TRUE;
				x2 = params.x + params.width/2;
				y2 = params.y + params.height/2;
				// Prevent over-rounded corners
				if ((x2 - x1) - (2 * r) < 0) {
					r = (x2 - x1) / 2;
				}
				if ((y2 - y1) - (2 * r) < 0) {
					r = (y2 - y1) / 2;
				}
				ctx.moveTo(x1+r, y1);
				ctx.lineTo(x2-r, y1);
				ctx.arc(x2-r, y1+r, r, 3*PI/2, PI*2, FALSE);
				ctx.lineTo(x2, y2-r);
				ctx.arc(x2-r, y2-r, r, 0, PI/2, FALSE);
				ctx.lineTo(x1+r, y2);
				ctx.arc(x1+r, y2-r, r, PI/2, PI, FALSE);
				ctx.lineTo(x1, y1+r);
				ctx.arc(x1+r, y1+r, r, PI, 3*PI/2, FALSE);
			} else {
				ctx.rect(x1, y1, params.width, params.height);
			}
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		}
	}
	return $elems;
};

// Draw arc or circle
$.fn.drawArc = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);
	args = args || {};

	// Change default end angle to radians if necessary
	if (!params.inDegrees && params.end === 360) {
		args.end = params.end = PI * 2;
	}
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			transformShape(e, ctx, params, params.radius*2);
			
			// Draw arc
			ctx.beginPath();
			ctx.arc(params.x, params.y, params.radius, (params.start*params._toRad)-(PI/2), (params.end*params._toRad)-(PI/2), params.ccw);
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		}
	}
	return $elems;
};

// Draw ellipse
$.fn.drawEllipse = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		controlW = params.width * 4/3,
		controlH = params.height;
	params.closed = TRUE;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			transformShape(e, ctx, params, params.width, params.height);
			
			// Create ellipse using curves
			ctx.beginPath();
			ctx.moveTo(params.x, params.y-controlH/2);
			// Left side
			ctx.bezierCurveTo(params.x-controlW/2, params.y-controlH/2, params.x-controlW/2, params.y+controlH/2, params.x, params.y+controlH/2);
			// Right side
			ctx.bezierCurveTo(params.x+controlW/2, params.y+controlH/2, params.x+controlW/2, params.y-controlH/2, params.x, params.y-controlH/2);
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		}
	}
	return $elems;
};

// Draw a regular (equal-angled) polygon
$.fn.drawPolygon = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		// dtheta is polygon's central angle
		dtheta = (2 * PI) / params.sides,
		// hdtheta is half of dtheta
		hdtheta = PI / params.sides,
		// theta is polygon's starting angle
		theta = hdtheta + (PI / 2),
		// apothem is distance from polygon's center to the middle of its side
		apothem = params.radius * cos(dtheta / 2),
		x, y, i;
	params.closed = TRUE;
		
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			transformShape(e, ctx, params, params.radius*2);

			// Calculate points and draw
			ctx.beginPath();
			for (i=0; i<params.sides; i+=1) {
				// Draw side of polygon
				x = params.x + round(params.radius * cos(theta));
				y = params.y + round(params.radius * sin(theta));
				ctx.lineTo(x, y);
				// Project side if chosen
				if (params.projection) {
					// Sides are projected from the polygon's apothem
					x = params.x + round((apothem + apothem*params.projection) * cos(theta + hdtheta));
					y = params.y + round((apothem + apothem*params.projection) * sin(theta + hdtheta));
					ctx.lineTo(x, y);
				}
				theta += dtheta;
			}
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		}
	}
	return $elems;
};

/* Path API */

// Draw line
$.fn.drawLine = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l, lx, ly;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			makePathDraggable(params);
			transformShape(e, ctx, params, 0);
				
			// Draw each point
			l = 1;
			ctx.beginPath();
			while (TRUE) {
				lx = params['x' + l];
				ly = params['y' + l];
				if (lx !== UNDEFINED && ly !== UNDEFINED) {
					ctx.lineTo(lx, ly);
					l += 1;
				} else {
					break;
				}
			}
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

// Draw quadratic curve
$.fn.drawQuad = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l, lx, ly, lcx, lcy;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			makePathDraggable(params);
			transformShape(e, ctx, params, 0);
			
			// Draw each point
			l = 2;
			ctx.beginPath();
			ctx.moveTo(params.x1, params.y1);
			while (TRUE) {
				lx = params['x' + l];
				ly = params['y' + l];
				lcx = params['cx' + (l-1)];
				lcy = params['cy' + (l-1)];
				if (lx !== UNDEFINED && ly !== UNDEFINED && lcx !== UNDEFINED && lcy !== UNDEFINED) {
					ctx.quadraticCurveTo(lcx, lcy, lx, ly);
					l += 1;
				} else {
					break;
				}
			}
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

// Draw Bezier curve
$.fn.drawBezier = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l , lc,
		lx, ly,
		lcx1, lcy1,
		lcx2, lcy2;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			makePathDraggable(params);
			transformShape(e, ctx, params, 0);
			
			// Draw each point
			l = 2;
			lc = 1;
			ctx.beginPath();
			ctx.moveTo(params.x1, params.y1);
			while (TRUE) {
				lx = params['x' + l];
				ly = params['y' + l];
				lcx1 = params['cx' + lc];
				lcy1 = params['cy' + lc];
				lcx2 = params['cx' + (lc+1)];
				lcy2 = params['cy' + (lc+1)];
				if (lx !== UNDEFINED && ly !== UNDEFINED && lcx1 !== UNDEFINED && lcy1 !== UNDEFINED && lcx2 !== UNDEFINED && lcy2 !== UNDEFINED) {
					ctx.bezierCurveTo(lcx1, lcy1, lcx2, lcy2, lx, ly);
					l += 1;
					lc += 2;
				} else {
					break;
				}
			}
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

/* Text API */

// Measure canvas text
function measureText(elem, e, ctx, params, lines) {
	var originalSize, sizeMatch,
		sizeExp = /\b(\d*\.?\d*)\w\w\b/gi,
		l, curWidth;
	
	// Used cached width/height if possible
	if (cache.text === params.text && cache.font === params.font && cache.maxWidth === params.maxWidth && cache.lineHeight === params.lineHeight) {
		
		params.width = cache.width;
		params.height = cache.height;
		
	} else if (!e) {
		// Calculate text dimensions only once
		
		// Calculate width of first line (for comparison)
		params.width = ctx.measureText(lines[0]).width;
		
		// Get width of longest line
		for (l=1; l<lines.length; l+=1) {
			curWidth = ctx.measureText(lines[l]).width;
			// Ensure text's width is the width of its longest line
			if (curWidth > params.width) {
				params.width = curWidth;
			}
		}
		
		// Save original font size
		originalSize = elem.style.fontSize;
		// Get specified font size
		sizeMatch = params.font.match(sizeExp);
		if (sizeMatch) {
			elem.style.fontSize = params.font.match(sizeExp)[0];
		}
		// Save text width and height in parameters object
		params.height = parseFloat($.css(elem, 'fontSize')) * lines.length * params.lineHeight;
		// Reset font size to original size
		elem.style.fontSize = originalSize;
	}
}

// Wrap a strong of text within a defined width
function wrapText(ctx, params) {
	var text = params.text,
		maxWidth = params.maxWidth,
		words = params.text.split(' '),
		lines = [],
		line = '';
	
	if (ctx.measureText(text).width < maxWidth) {
		// If text is short enough initially, do nothing else
		lines = [text];
	} else {
		// Keep adding words to line until line is too long
		while (words.length > 0) {
			// Keep adding words to the current line until it is too long
			// Also ensure that words longer than maxWidth will not crash the script
			if (ctx.measureText(words[0]).width > maxWidth || ctx.measureText(line + words[0]).width < maxWidth) {
				line += words.shift() + ' ';
			} else {
				// If line is too long, break and start a new line
				lines.push(line);
				line = '';
			}
			if (words.length === 0) {
				// If we reach the last word, break and add new line
				lines.push(line);
			}
		}
	}
	return lines;
}

// Draw text
$.fn.drawText = function self(args) {
	var $elems = this, $elem, e, ctx,
		params = merge(new Prefs(), args),
		lines, l, x, y;

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			
			// Set text-specific properties
			ctx.textBaseline = params.baseline;
			ctx.textAlign = params.align;
			ctx.font = params.font;
						
			if (!e && params.maxWidth !== NULL) {
				// Wrap text using an internal function
				lines = wrapText(ctx, params);
				// Remove unnecessary white space
				lines = lines
					.join('\n')
					.replace(/( (\n))|( $)/gi, '$2')
					.split('\n');
			} else if (!e) {
				// Convert string of text to list of lines
				lines = String(params.text).split('\n');
			}
			
			// Calculate text's width and height
			measureText($elems[e], e, ctx, params, lines);
			transformShape(e, ctx, params, params.width, params.height);
			
			// Adjust text position to accomodate different horizontal alignments
			if (!e) {
				x = params.x;
				if (params.align === 'left') {
					x -= params.width / 2;
				} else if (params.align === 'right') {
					x += params.width / 2;
				}
			}
			
			// Draw each line of text separately
			for (l=0; l<lines.length; l+=1) {
				ctx.shadowColor = params.shadowColor;
				// Add line offset to center point, but subtract some to center everything
				y = params.y + (l * params.height / lines.length) - ((lines.length - 1) * params.height / lines.length) / 2;
				ctx.fillText(lines[l], x, y);
				// Prevent extra shadow created by stroke (but only when fill is present)
				if (params.fillStyle !== 'transparent') {
					ctx.shadowColor = 'transparent';
				}
				ctx.strokeText(lines[l], params.x, y);
			}
						
			// Detect jCanvas events
			if (params._event) {
				ctx.beginPath();
				ctx.rect(
					params.x - params.width / 2,
					params.y - params.height / 2,
					params.width,
					params.height
				);
				ctx.restore();
				checkEvents($elems[e], ctx, args);
				ctx.closePath();
			} else {
				ctx.restore();
			}
			
		}
	}
	cache = params;
	return $elems;
};

// Measure text width/height using the given parameters
$.fn.measureText = function(args) {
	var $elems = this, ctx,
		params;
	
	if (args !== UNDEFINED && typeof args !== 'object') {
		// If layer identifier is given, get that layer
		params = $elems.getLayer(args);
	} else {
		// If object is given, just use that
		params = merge(new Prefs(), args);
	}
	
	ctx = getContext($elems[0]);
	if (ctx && params.text !== UNDEFINED) {
		// Calculate width and height of text
		measureText($elems[0], 0, ctx, params, params.text.split('\n'));
	}
	return params;
};

/* Image API */

// Draw image
$.fn.drawImage = function self(args) {
	var $elems = this, elem, e, ctx,
		params = merge(new Prefs(), args),
		img, imgCtx, scaleFactor;
	
	// Use image or canvas element, if not, an image URL
	imgCtx = params.source.getContext;
	if (params.source.src || imgCtx) {
		img = params.source;
		params.width = img.width;
		params.height = img.height;
	} else if (params.source) {
		img = new Image();
		img.src = params.source;
	}
	
	// Draw image function
	function draw(e, ctx) {
	
		// Calculate image dimensions only once
		if (!e) {
		
			scaleFactor = img.width / img.height;
			
			// Show entire image if no cropping region is defined
			
			// If width/sWidth or height/sHeight is not defined
			if (params.width === NULL && params.sWidth === NULL) {
				args.width = params.width = params.sWidth = img.width;
			}
			if (params.height === NULL && params.sHeight === NULL) {
				args.height = params.height = params.sHeight = img.height;
			}
			
			// If width or height is not defined
			if (params.width === NULL && params.sWidth !== NULL) {
				params.width = params.sWidth;
			}
			if (params.height === NULL && params.sHeight !== NULL) {
				params.height = params.sHeight;
			}
			
			// If sWidth or sHeight is not defined
			if (params.sWidth === NULL && params.width !== NULL) {
				args.sWidth = params.sWidth = img.width;
			}
			if (params.sHeight === NULL && params.height !== NULL) {
				args.sHeight = params.sHeight = img.height;
			}
			
			// If no sx/sy defined, use center of image (or top-left corner if cropFromCenter is FALSE)
			if (params.sx === NULL) {
				if (params.cropFromCenter) {
					params.sx = img.width / 2;
				} else {
					params.sx = 0;
				}
			}
			if (params.sy === NULL) {
				if (params.cropFromCenter) {
					params.sy = img.height / 2;
				} else {
					params.sy = 0;
				}
			}
			
			// Crop from top-left corner if cropFromCenter is FALSE
			if (!params.cropFromCenter) {
				params.sx += params.sWidth/2;
				params.sy += params.sHeight/2;
			}
			
			// Ensure cropped region does not extend beyond image boundary
			if ((params.sx + params.sWidth / 2) > img.width) {
				params.sx = img.width - params.sWidth / 2;
			}
			if ((params.sx - params.sWidth/2) < 0) {
				params.sx = params.sWidth / 2;
			}
			if ((params.sy - params.sHeight / 2) < 0) {
				params.sy = params.sHeight / 2;
			}
			if ((params.sy + params.sHeight / 2) > img.height) {
				params.sy = img.height - params.sHeight / 2;
			}
			
			// If only width is present
			if (params.width !== NULL && params.height === NULL) {
				args.height = params.height = params.width / scaleFactor;
			// If only height is present
			} else if (params.width === NULL && params.height !== NULL) {
				args.width = params.width = params.height * scaleFactor;
			// If width and height are both absent
			} else if (params.width === NULL && params.height === NULL) {
				args.width = params.width = img.width;
				args.height = params.height = img.height;
			}
			
		}
		
		// Only position image
		transformShape(e, ctx, params, params.width, params.height);
							
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
		// Ensure the rectangle below is actually invisible
		ctx.fillStyle = ctx.strokeStyle = 'transparent';
		// Draw invisible rectangle to allow for events and masking
		ctx.beginPath();
		ctx.rect(
			params.x - params.width / 2,
			params.y - params.height / 2,
			params.width,
			params.height
		);
		// Check for jCanvas events
		if (params._event) {
			checkEvents($elems[e], ctx, args);
		}
		// Close path and mask (if chosen)
		closePath(ctx, params);
	}
	// On load function
	function onload(elem, e, ctx) {
		return function() {
			draw(e, ctx);
			// Run callback function if defined
			if (params.load) {
				params.load.call(elem, args);
			}
		};
	}
	// Draw image if already loaded
	for (e=0; e<$elems.length; e+=1) {
		elem = $elems[e];
		ctx = getContext($elems[e]);
		if (ctx) {

			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
				
			// Draw image if already loaded
			if (img) {
				if (img.complete || imgCtx) {
					onload(elem, e, ctx)();
				} else {
					img.onload = onload(elem, e, ctx);
					// Fix onload() bug in IE9
					img.src = img.src;
				}
			}
				
		}
	}
	return $elems;
};

// Create canvas pattern
$.fn.createPattern = $.fn.pattern = function(args) {
	var $elems = this,
		ctx, params = merge(new Prefs(), args),
		img, pattern, imgCtx;

	// Create pattern when image loads
	function create() {
		// Create pattern
		pattern = ctx.createPattern(img, params.repeat);
	}
	function onload() {
		create();
		// Run callback function if defined
		if (params.load) {
			params.load.call($elems[0], pattern);
		}
	}
	
	ctx = getContext($elems[0]);
	if (ctx) {
	
		// Draw when image is loaded (if load() callback function is defined)
		if (typeof params.source === 'function') {
			
			img = document.createElement('canvas');
			img.width = params.width;
			img.height = params.height;
			imgCtx = getContext(img);
			params.source.call(img, imgCtx);
			onload();
			
		} else {
			
			// Use image element, if not, a image URL
			imgCtx = params.source.getContext;
			if (params.source.src || imgCtx) {
				img = params.source;
			} else {
				img = new Image();
				img.src = params.source;
			}
			
			// Draw image if already loaded
			if (img.complete || imgCtx) {
				onload();
			} else {
				img.onload = onload;
			}
			
		}
	} else {
		pattern = NULL;
	}
	return pattern;
};

// Create a canvas gradient object
$.fn.createGradient = $.fn.gradient = function(args) {
	var $elems = this, ctx,
		params = merge(new Prefs(), args),
		gradient,
		stops = [], nstops,
		start, end,
		i, a, n, p;
	
	ctx = getContext($elems[0]);
	if (ctx) {
		
		// Gradient coordinates must be defined
		params.x1 = params.x1 || 0;
		params.y1 = params.y1 || 0;
		params.x2 = params.x2 || 0;
		params.y2 = params.y2 || 0;
		
		if (params.r1 !== NULL || params.r2 !== NULL) {
			// Create radial gradient if chosen
			gradient = ctx.createRadialGradient(params.x1, params.y1, params.r1, params.x2, params.y2, params.r2);
		} else {
			// By default, create a linear gradient
			gradient = ctx.createLinearGradient(params.x1, params.y1, params.x2, params.y2);
		}

		// Count number of color stops
		for (i=1; params['c' + i] !== UNDEFINED; i+=1) {
			if (params['s' + i] !== UNDEFINED) {
				stops.push(params['s' + i]);
			} else {
				stops.push(NULL);
			}
		}
		nstops = stops.length;
		
		// Define start and end stops if not already defined
		if (stops[0] === NULL) {
			stops[0] = 0;
		}
		if (stops[nstops-1] === NULL) {
			stops[nstops-1] = 1;
		}
		
		// Loop through color stops to fill in the blanks
		for (i=0; i<nstops; i+=1) {
			// A progression, in this case, is defined as all of the color stops between and including two known color stops
			
			// If stop is a number, start a new progression
			if (stops[i] !== NULL) {
				
				// Number of stops in current progression
				n = 1;
				// Current iteration in current progression
				p = 0;
				start = stops[i];

				// Look ahead to find end stop
				for (a=(i+1); a<nstops; a+=1) {
					if (stops[a] !== NULL) {
						// If this future stop is a number, make it the end stop for this progression
						end = stops[a];
						break;
					} else {
						// Otherwise, keep looking ahead
						n += 1;
					}
				}
				
				// Ensure start stop is not greater than end stop
				if (start > end) {
					stops[a] = stops[i];
				}
			
			// If stop must be calculated
			} else if (stops[i] === NULL) {
				p += 1;
				stops[i] = start + (p * ((end - start) / n));
			}
			gradient.addColorStop(stops[i], params['c' + (i+1)]);
		}

	} else {
		gradient = NULL;
	}
	return gradient;
};

// Get pixels on the canvas
$.fn.setPixels = function self(args) {
	var $elems = this,
		elem, e, ctx,
		params = merge(new Prefs(), args),
		px = {},
		imgData, data, i, len;
	
	for (e=0; e<$elems.length; e+=1) {
		elem = $elems[e];
		ctx = getContext(elem);
		if (ctx) {
			
			addLayer($elems[e], args, self);
			// Measure (x, y) from center of region
			transformShape(e, ctx, params, params.width, params.height);
			
			if (!params.x || !params.y || !params.width || !params.height) {
				params.width = elem.width;
				params.height = elem.height;
				params.x = params.width / 2;
				params.y = params.height / 2;
			}
			imgData = ctx.getImageData(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			data = imgData.data;
			len = data.length;
			px = [];
						
			// Loop through pixels with the "each" method
			if (params.each) {
				for (i=0; i<len; i+=4) {
					px.r = data[i];
					px.g = data[i+1];
					px.b = data[i+2];
					px.a = data[i+3];
					params.each.call(elem, px);
					data[i] = px.r;
					data[i+1] = px.g;
					data[i+2] = px.b;
					data[i+3] = px.a;
				}
			}
			// Put pixels on canvas
			ctx.putImageData(imgData, params.x-params.width/2, params.y-params.height/2);
			ctx.restore();
			
		}
	}
	return $elems;
};

// Get canvas image as data URL
$.fn.getCanvasImage = function(type, quality) {
	var elem = this[0];
	return (elem && elem.toDataURL ?
		elem.toDataURL('image/' + type, quality) :
		NULL);
};

// Enable canvas feature detection with $.support
$.support.canvas = (document.createElement('canvas').getContext !== UNDEFINED);

// Export jCanvas functions
jCanvas.defaults = defaults;
jCanvas.checkEvents = checkEvents;
$.jCanvas = jCanvas;

}(jQuery, document, Image, Math, parseFloat, true, false, null));