/**
 * jCanvas v13.07.13
 * Copyright 2013 Caleb Evans
 * Released under the MIT license
 */

(function($, document, Image, Math, parseFloat, TRUE, FALSE, NULL, UNDEFINED) {

// Define local aliases to frequently used properties
var defaults,
	merge = $.extend,
	inArray = $.inArray,
	typeOf = $.type,
	isFunction = $.isFunction,
	round = Math.round,
	PI = Math.PI,
	sin = Math.sin,
	cos = Math.cos,
	jQueryEventFix = $.event.fix,
	mouseEventMap,
	touchEventMap,
	drawingMap,
	cache = {},
	imageCache = {},
	baseTransforms = {
		rotate: 0,
		scaleX: 1,
		scaleY: 1,
		translateX: 0,
		translateY: 0,
		// Store all previous masks
		masks: []
	},
	cssProps,
	cssPropsObj;

// Preferences constructor (which inherits from the defaults object)
function jCanvasObject(args) {
	var params = this;
	// Merge preferences with arguments
	merge(params, args);
	return params;
}

// jCanvas function for setting property defaults (it's also an object)
function jCanvas(args) {
	if (args) {
		// Merge arguments with preferences
		merge(jCanvasObject.prototype, args);
	} else {
		// Reset preferences to defaults if nothing is passed
		jCanvas.prefs = jCanvasObject.prototype = merge({}, defaults);
	}
	return this;
}
// Allow jCanvas function to be "chained" to other methods
$.fn.jCanvas = jCanvas;

// Events object for maintaining jCanvas event initiation functions
jCanvas.events = {};

// jCanvas default property values
defaults = {
	align: 'center',
	autosave: TRUE,
	baseline: 'middle',
	bringToFront: FALSE,
	ccw: FALSE,
	closed: FALSE,
	compositing: 'source-over',
	concavity: 0,
	cornerRadius: 0,
	count: 1,
	cropFromCenter: TRUE,
	disableDrag: FALSE,
	disableEvents: FALSE,
	domain: NULL,
	draggable: FALSE,
	group: NULL,
	data: {},
	each: NULL,
	end: 360,
	fillStyle: 'transparent',
	font: '',
	fontStyle: 'normal',
	fontSize: '12pt',
	fontFamily: 'sans-serif',
	fromCenter: TRUE,
	fn: NULL,
	graph: 'y',
	height: NULL,
	imageSmoothing: TRUE,
	inDegrees: TRUE,
	lineHeight: 1,
	layer: FALSE,
	load: NULL,
	mask: FALSE,
	maxWidth: NULL,
	miterLimit: 10,
	name: NULL,
	opacity: 1,
	projection: 0,
	r1: NULL,
	r2: NULL,
	radius: 0,
	range: NULL,
	repeat: 'repeat',
	respectAlign: FALSE,
	rotate: 0,
	rounded: FALSE,
	scale: 1,
	scaleX: 1,
	scaleY: 1,
	shadowBlur: 0,
	shadowColor: 'transparent',
	shadowStroke: false,
	shadowX: 0,
	shadowY: 0,
	sHeight: NULL,
	sides: 0,
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
	type: NULL,
	visible: TRUE,
	width: NULL,
	x: 0,
	y: 0
};

// Copy defaults to preferences object
jCanvas();

/* Internal helper methods */

// Determine if the given operand is a string
function isString(operand) {
	return (typeOf(operand) === 'string');
}

// Get 2D context for the given canvas
function _getContext(canvas) {
	return (canvas && canvas.getContext ? canvas.getContext('2d') : NULL);
}

// Clone the given transformations object
function _cloneTransforms(transforms) {
	// Clone the object itself
	transforms = merge({}, transforms);
	// Clone the object's masks array
	transforms.masks = transforms.masks.slice(0);
	return transforms;
}

// Save canvas context and update transformation stack
function _saveCanvas(ctx, data) {
	ctx.save();
	data.savedTransforms.push(_cloneTransforms(data.transforms));
}

// Restore canvas context update transformation stack
function _restoreCanvas(ctx, data) {
	if (data.savedTransforms.length === 0) {
		// Reset transformation state if it can't be restored any more
		data.transforms = _cloneTransforms(baseTransforms);
	} else {
		// Restore canvas context
		ctx.restore();
		// Restore current transform state to the last saved state
		// Remove last saved state from transformation stack
		data.transforms = data.savedTransforms.pop();
	}
}

// Set canvas context properties
function _setGlobalProps(canvas, ctx, params) {
	// Fill style
	if (isFunction(params.fillStyle)) {
		// Handle fill styles as functions
		ctx.fillStyle = params.fillStyle.call(canvas, params);
	} else {
		// Handle fill styles as strings
		ctx.fillStyle = params.fillStyle;
	}
	// Stroke style
	if (isFunction(params.strokeStyle)) {
		// Handle stroke styles as functions
		ctx.strokeStyle = params.strokeStyle.call(canvas, params);
	} else {
		// Handle stroke styles as strings
		ctx.strokeStyle = params.strokeStyle;
	}
	ctx.lineWidth = params.strokeWidth;
	// Rounded corners for paths if chosen
	if (params.rounded) {
		ctx.lineCap = ctx.lineJoin = 'round';
	} else {
		ctx.lineCap = params.strokeCap;
		ctx.lineJoin = params.strokeJoin;
		ctx.miterLimit = params.miterLimit;
	}
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
		ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = params.imageSmoothing;
	}
}

// Optionally enable masking support for this path
function _enableMasking(ctx, data, params) {
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
function _restoreTransform(ctx, params) {
	// If shape has been transformed by jCanvas
	if (params._transformed) {
		// Restore canvas context
		ctx.restore();
	}
}

// Close current canvas path
function _closePath(canvas, ctx, params) {
	var data;
	
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
		ctx.shadowColor = 'transparent';
		ctx.shadowBlur = 0;
		// Stroke over fill as usual
		ctx.stroke();
		
	} else {
		// If shadowStroke is not enabled, stroke & fill as usual
		
		ctx.fill();
		// Prevent extra shadow created by stroke (but only when fill is present)
		if (params.fillStyle !== 'transparent') {
			ctx.shadowColor = 'transparent';
		}
		// Only stroke if the stroke
		if (params.strokeWidth !== 0) {
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

// Rotate canvas (internal)
function _rotateCanvas(ctx, params, transforms) {
	// Convert angle to radians if necessary
	params._toRad = (params.inDegrees ? (PI / 180) : 1);
	
	// Rotate canvas using shape as center of rotation
	ctx.translate(params.x, params.y);
	ctx.rotate(params.rotate * params._toRad);
	ctx.translate(-params.x, -params.y);
	// Update transformation data
	transforms.rotate += params.rotate * params._toRad;
}

// Scale canvas (internal)
function _scaleCanvas(ctx, params, transforms) {
	
	// Scale both the x- and y- axis using the 'scale' property
	if (params.scale !== 1) {
		params.scaleX = params.scaleY = params.scale;
	}
	// Scale canvas using shape as center of rotation
	ctx.translate(params.x, params.y);
	ctx.scale(params.scaleX, params.scaleY);
	ctx.translate(-params.x, -params.y);
	// Update transformation state data
	transforms.scaleX *= params.scaleX;
	transforms.scaleY *= params.scaleY;
}

// Translate canvas (internal)
function _translateCanvas(ctx, params, transforms) {
	
	// Translate both the x- and y-axis using the 'translate' property
	if (params.translate) {
		params.translateX = params.translateY = params.translate;
	}
	// Translate canvas
	ctx.translate(params.translateX, params.translateY);
	transforms.translateX += params.translateX;
	transforms.translateY += params.translateY;
}

// Transform (translate, scale, or rotate) shape
function _transformShape(ctx, params, width, height) {
			
	// Measure angles in chosen units
	params._toRad = (params.inDegrees ? (PI / 180) : 1);
	
	params._transformed = TRUE;
	ctx.save();
	
	// Always draw from center unless otherwise specified
	if (height === UNDEFINED) {
		height = width;
	}
	
	// Optionally measure (x, y) position from top-left corner
	if (!params.fromCenter && !params._centered) {
		params.x += width / 2;
		params.y += height / 2;
		params._centered = TRUE;
	}
		
	// Optionally rotate shape
	if (params.rotate) {
		_rotateCanvas(ctx, params, {});
	}
	// Optionally scale shape
	if (params.scale !== 1 || params.scaleX !== 1 || params.scaleY !== 1) {
		_scaleCanvas(ctx, params, {});
	}
	// Optionally translate shape
	if (params.translate || params.translateX || params.translateY) {
		_translateCanvas(ctx, params, {});
	}
}

/* Plugin API */

// Extend jCanvas with a user-defined method
jCanvas.extend = function extend(plugin) {
	
	// Merge properties with defaults
	jCanvas.defaults = merge(defaults, plugin.props);
	jCanvas();
	
	// Create plugin
	if (plugin.name) {
		$.fn[plugin.name] = function self(args) {
			var $canvases = this, canvas, e, ctx,
				params = new jCanvasObject(args);
						
			for (e = 0; e < $canvases.length; e += 1) {
				canvas = $canvases[e];
				ctx = _getContext(canvas);
				if (ctx) {
					args = _addLayer(canvas, params, args, self);
					_setGlobalProps(canvas, ctx, params);
					plugin.fn.call(canvas, ctx, params);
				}
			}
			return $canvases;
		};
	}
	return $.fn[plugin.name];
};

/* Layer API */

// Retrieved the stored jCanvas data for a canvas element
function _getCanvasData(canvas) {
	var data;
	if (cache._canvas === canvas && cache._data) {
		// Retrieve canvas data from cache if possible
		data = cache._data;
	} else {
		// Get canvas data
		data = $.data(canvas, 'jCanvas');
		// Create canvas data object if it does not already exist
		if (!data) {
			data = {
				// The associated canvas element
				canvas: canvas,
				// Layers array
				layers: [],
				// Layer mappings
				layer: {
					names: {},
					groups: {}
				},
				// The topmost layer whose area contains the event coordinates
				intersecting: [],
				// Properties for the current drag event
				drag: {},
				// Data for the current event
				event: {
					type: NULL,
					x: NULL,
					y: NULL
				},
				// Events which already have been bound to the canvas
				events: {},
				// The canvas's current transformation state
				transforms: _cloneTransforms(baseTransforms),
				savedTransforms: [],
				// Whether a layer is being animated or not
				animating: FALSE,
				// The layer currently being animated
				animated: NULL,
				pixelRatio: 1,
				scaled: false
			};
			// Use jQuery to store canvas data
			$.data(canvas, 'jCanvas', data);
		}
		// Cache canvas data for faster retrieval
		cache._canvas = canvas;
		cache._data = data;
	}
	return data;
}

// Get jCanvas layers array
$.fn.getLayers = function getLayers(callback) {
	var canvas = this[0],
		layers, l,
		matching = [];
	// Element must be a canvas
	if (canvas && canvas.getContext) {
		// Retrieve layers array for this canvas
		layers = _getCanvasData(canvas).layers;
		if (isFunction(callback)) {
			// Optionally filter the layers array using a function
			for (l = 0; l < layers.length; l += 1) {
				if (callback.call(canvas, layers[l])) {
					// Add layer to array of matching layers if test passes
					matching.push(layers[l]);
				}
			}
		} else {
			matching = layers;
		}
	}
	return matching;
};

// Initialize all of a layer's associated jCanvas events
function _addLayerEvents($canvas, data, layer) {
	var eventName;
	// Determine which jCanvas events need to be bound to this layer
	for (eventName in jCanvas.events) {
		if (jCanvas.events.hasOwnProperty(eventName)) {
			_addLayerEvent($canvas, data, layer, eventName);
		}
	}
}

// Initialize the given event on the given layer
function _addLayerEvent($canvas, data, layer, eventName) {
	// Only bind event if layer has callback function to complement it
	if (layer[eventName]) {
		// Use touch events if appropriate
		eventName = getTouchEventName(eventName);
		jCanvas.events[eventName]($canvas, data);
		layer._event = TRUE;
	}
}

// Enable drag support for this layer
function _enableDrag($canvas, data, layer) {
	var dragHelperEvents, eventName, i;
	// Only make layer draggable if necessary
	if (layer.draggable || layer.dragGroupWithLayer || layer.cursor) {
		
		// Organize helper events which enable drag support
		dragHelperEvents = ['mousedown', 'mousemove', 'mouseup'];
		
		// Bind each helper event to the canvas
		for (i = 0; i < dragHelperEvents.length; i += 1) {
			// Use touch events if appropriate
			eventName = getTouchEventName(dragHelperEvents[i]);
			// Bind event
			jCanvas.events[eventName]($canvas, data);
		}
		
		// If cursor mouses out of canvas while dragging, cancel drag
		if (!data.events.mouseoutdrag) {
			$canvas.bind('mouseout.jCanvas', function() {
				// Retrieve the layer whose drag event was canceled
				var layer = data.drag.layer;
				if (layer) {
					// Cancel dragging
					data.drag = {};
					// Trigger dragcancel event if defined
					if (layer.dragcancel) {
						layer.dragcancel.call($canvas[0], layer);
					}
					$canvas.drawLayers();
				}
			});
			// Indicate that an event handler has been bound
			data.events.mouseoutdrag = TRUE;
		}
		
		// Indicate that this layer has events bound to it
		layer._event = TRUE;
		
	}
}

// Update a layer property map if property is changed
function _updateLayerName($canvas, data, layer, props) {
	var nameMap = data.layer.names;
	
	// If layer name is being added, not changed
	if (!props) {
		
		props = layer;
		
	} else {
		
		// Remove old layer name entry because layer name has changed
		if (props.name !== UNDEFINED && isString(layer.name) && layer.group !== props.group) {
			delete nameMap[layer.name];
		}
		
	}
	
	// Add new entry to layer name map with new name
	if (isString(props.name)) {
		nameMap[props.name] = layer;
	}
}

// Create or update the data map for the given layer and group type
function _updateLayerGroup($canvas, data, layer, props) {
	var groupMap = data.layer.groups,
		group, index, l;
	
	// If group name is not changing
	if (!props) {
		
		props = layer;
		
	} else {
		
		// Update the layer's group map if name is changed
		if (props.group !== UNDEFINED && isString(layer.group) && layer.group !== props.group) {
			group = groupMap[layer.group];
			if (group) {
				// Remove layer from its old layer group entry
				for (l = 0; l < group.length; l += 1) {
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
					delete groupMap[layer.group];
				}
			}
		}
		
	}
	
	// Add layer to new group if a new group name is given
	if (isString(props.group)) {
		
		group = groupMap[props.group];
		if (!group) {
			// Create new group entry if it doesn't exist
			group = groupMap[props.group] = [];
			group.name = props.group;
		}
		if (index === UNDEFINED) {
			// Add layer to end of group unless otherwise stated
			index = group.length;
		}
		// Add layer to its new layer group
		group.splice(index, 0, layer);
		
	}
}

// Get a single jCanvas layer object
$.fn.getLayer = function getLayer(layerId) {
	var layers = this.getLayers(),
		idType = typeOf(layerId),
		data = _getCanvasData(this[0]),
		layer, l;
	
	if (layerId && layerId.layer) {
		
		// Return the actual layer object if given
		layer = layerId;
		
	} else if (idType === 'number') {
		
		// Retrieve the layer using the given index
			
		// Allow for negative indices
		if (layerId < 0) {
			layerId = layers.length + layerId;
		}
		// Get layer with the given index
		layer = layers[layerId];
		
	} else if (idType === 'regexp') {
		
		// Get layer with the name that matches the given regex
		for (l = 0; l < layers.length; l += 1) {
			// Check if layer matches name
			if (isString(layers[l].name) && layers[l].name.match(layerId)) {
				layer = layers[l];
				break;
			}
		}
		
	} else {
		
		// Get layer with the given name
		data = _getCanvasData(this[0]);
		layer = data.layer.names[layerId];
		
	}
	return layer;
};

// Get all layers in the given group
$.fn.getLayerGroup = function getLayerGroup(groupId) {
	var idType = typeOf(groupId),
		groups, groupName, group,
		data;
	
	if (idType === 'array') {
		
		// Return layer group if given
		return groupId;
		
	} else if (idType === 'regexp') {
		
		// Get canvas data
		data = _getCanvasData(this[0]);
		groups = data.groups;
		// Loop through all layers groups for this canvas
		for (groupName in groups) {
			// Find a group whose name matches the given regex
			if (groupName.match(groupId)) {
				group = groups[groupName];
				// Stop after finding the first matching group
				break;
			}
		}
		
	} else {
		
		// Find layer group with the given group name
		data = _getCanvasData(this[0]);
		group = data.layer.groups[groupId];
		
	}
	return group;
};

// Get index of layer in layers array
$.fn.getLayerIndex = function getLayerIndex(layerId) {
	var layers = this.getLayers(),
		layer = this.getLayer(layerId);
	
	return inArray(layer, layers);
};

// Set properties of a layer
$.fn.setLayer = function setLayer(layerId, props) {
	var $canvases = this, $canvas, e,
		data, layer;
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		data = _getCanvasData($canvases[e]);
		
		layer = $($canvases[e]).getLayer(layerId);
		if (layer) {
			
			// Update layer property mappings
			_updateLayerName($canvas, data, layer, props);
			_updateLayerGroup($canvas, data, layer, props);
			
			// Merge properties with layer
			merge(layer, props);
			
			// Update layer events
			_addLayerEvents($canvas, data, layer);
			_enableDrag($canvas, data, layer);
			
		}
	}
	return $canvases;
};

// Set properties of all layers in the given group
$.fn.setLayerGroup = function setLayerGroup(groupId, props) {
	var $canvases = this, $canvas, e,
		group, l;
	
	for (e = 0; e < $canvases.length; e += 1) {
		// Get layer group
		$canvas = $($canvases[e]);
		
		group = $canvas.getLayerGroup(groupId);
		// If group exists
		if (group) {
			
			// Loop through layers in group
			for (l = 0; l < group.length; l += 1) {
				
				// Merge given properties with layer
				$canvas.setLayer(group[l], props);
				
			}
			
		}
	}
	return $canvases;
};

// Set properties of all layers
$.fn.setLayers = function setLayers(props) {
	var $canvases = this, $canvas, e,
		layers, l;
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		
		layers = $($canvases[e]).getLayers();
		// Loop through all layers
		for (l = 0; l < layers.length; l += 1) {
			// Set properties of each layer
			$canvas.setLayer(layers[l], props);
		}
	}
	return $canvases;
};

// Move a layer's placement in the layers array
$.fn.moveLayer = function moveLayer(layerId, index) {
	var $canvases = this, $canvas, e,
		layers, layer;
		
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		
		// Retrieve layers array and desired layer
		layers = $canvas.getLayers();
		layer = $canvas.getLayer(layerId);
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
			
		}
	}
	return $canvases;
};

// Remove a jCanvas layer
$.fn.removeLayer = function removeLayer(layerId) {
	var $canvases = this, $canvas, e, data,
		layers, layer;
		
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		data = _getCanvasData($canvases[e]);
		
		// Retrieve layers array and desired layer
		layers = $canvas.getLayers();
		layer = $canvas.getLayer(layerId);
		// Remove layer if found
		if (layer) {
			
			// Ensure layer index is accurate
			layer.index = inArray(layer, layers);
			layers.splice(layer.index, 1);
			
			// Update layer name map
			_updateLayerName($canvas, data, layer, {
				name: NULL
			});
			// Update layer group map
			_updateLayerGroup($canvas, data, layer, {
				group: NULL
			});
			
		}
	}
	return $canvases;
};

// Remove all layers in the group with the given ID
$.fn.removeLayerGroup = function removeLayerGroup(groupId) {
	var $canvases = this, $canvas, e, data,
		layers, group, layer, l;
	
	if (groupId !== UNDEFINED) {
		for (e = 0; e < $canvases.length; e += 1) {
			$canvas = $($canvases[e]);
			data = _getCanvasData($canvases[e]);
			
			layers = $canvas.getLayers();
			group = $canvas.getLayerGroup(groupId);
			// Remove layer group using given group name
			if (group) {
				
				// Loop through layers in group
				for (l = 0; l < group.length; l += 1) {
					
					layer = group[l];
					// Ensure layer's index property is accurate
					layer.index = inArray(layer, layers);
					// Check if layer group matches name
					layers.splice(layer.index, 1);
					
					// Update layer name map
					_updateLayerName($canvas, data, layer, {
						name: NULL
					});
					
				}
				
				// Delete group entry
				delete data.layer.groups[group.name];
				
			}
		}
	}
	return $canvases;
};

// Remove all layers
$.fn.removeLayers = function removeLayers() {
	var $canvases = this, $canvas, e,
		data;
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		data = _getCanvasData($canvases[e]);
		
		// Setting an array's length to 0 will empty the array
		data.layers.length = 0;
		// Update layer mappings
		data.layer.names = {};
		data.layer.groups = {};
	}
	return $canvases;
};

// Draw individual layer (internal)
function _drawLayer($canvas, ctx, layer, nextLayerIndex) {
	if (layer && layer.visible && layer._method) {
		if (nextLayerIndex) {
			layer._next = nextLayerIndex;
		} else {
			layer._next = NULL;
		}
		// If layer is an object, call its respective method
		layer._method.call($canvas, layer);
	}
}

// Draw individual layer
$.fn.drawLayer = function drawLayer(layerId) {
	var $canvases = this, e, ctx,
		$canvas, layer;
		
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		ctx = _getContext($canvases[e]);
		
		// Retrieve the specified layer
		layer = $canvas.getLayer(layerId);
		_drawLayer($canvas, ctx, layer);
	}
	return $canvases;
};

// Draw all layers (or, if given, only layers starting at an index)
$.fn.drawLayers = function drawLayers(args) {
	var $canvases = this, $canvas, e, ctx,
		// Internal parameters for redrawing the canvas
		params = merge({}, args),
		// Other variables
		layers, layer, l, lastIndex, i, m,
		data, eventCache, eventType,
		drag, group, callback;
	
	// The layer index from which to start redrawing the canvas
	if (!params.index) {
		params.index = 0;
	}
		
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		ctx = _getContext($canvases[e]);
		if (ctx) {
			
			data = _getCanvasData($canvases[e]);
												
			// Clear canvas first unless otherwise directed
			if (params.clear !== FALSE) {
				$canvas.clearCanvas();
			}
			
			// Cache the layers array
			layers = data.layers;
							
			// Draw layers from first to last (bottom to top)
			for (l = params.index; l < layers.length; l += 1) {
				layer = layers[l];
								
				// Ensure layer index is up-to-date
				layer.index = l;
												
				// Prevent any one event from firing excessively
				if (params.resetFire) {
					layer._fired = FALSE;
				}
				// Optionally disable events temporarily
				layer._event = !layer.disableEvents;
				// Draw layer
				_drawLayer($canvas, ctx, layer, l + 1);
				// Store list of previous masks for each layer
				layer._masks = data.transforms.masks.slice(0);
								
				// Manage mouseout event
				if (layer._mousedout) {
					layer._mousedout = FALSE;
					layer._fired = TRUE;
					layer._hovered = FALSE;
					// Trigger mouseout event if necessary
					if (layer.mouseout) {
						layer.mouseout.call($canvases[e], layer);
					}
					// Revert cursor when mousing off layer
					if (layer.cursor && layer._cursor) {
						$canvas.css({
							cursor: layer._cursor
						});
					}
				}
				
				// Allow image layers to load before drawing successive layers
				if (layer._method === $.fn.drawImage && layer.visible) {
					break;
				}
				
			}
			
			// Store the latest
			lastIndex = l;
			// Store the topmost layer
			layer = {};
			
			// Get the topmost layer whose visible area intersects event coordinates
			for (i = data.intersecting.length - 1; i >= 0; i -= 1) {
				
				// Get current layer
				layer = data.intersecting[i];
				
				// If layer has previous masks
				if (layer._masks) {
					
					// Search previous masks to ensure layer is visible at event coordinates
					for (m = layer._masks.length - 1; m >= 0; m -= 1) {
					
						// If mask does not intersect event coordinates
						if (!layer._masks[m].intersects) {
							// Indicate that the mask does not intersect event coordinates
							layer.intersects = FALSE;
							// Stop searching previous masks
							break;
						}
					
					}
				
					// If event coordinates intersect all previous masks
					if (layer.intersects) {
						// Stop searching for topmost layer
						break;
					}
					
				}
				
			}
									
			eventCache = data.event;
			eventType = eventCache.type;
			// Use mouse event callbacks if no touch event callbacks are given
			if (!layer[eventType]) {
				eventType = getMouseEventName(eventType);
			}
			callback = layer[eventType];
			// Cache the drag object
			drag = data.drag;
						
			// Check events for intersecting layer
			if (layer._event && layer.intersects) {
											
				// Detect mouseover events
				if (layer.mouseover || layer.mouseout || layer.cursor) {
										
					if (!layer._hovered && !layer._fired) {
						
						// Prevent events from firing excessively
						layer._fired = TRUE;
						layer._hovered = TRUE;
						
						// Trigger mouseover callback if it exists
						if (layer.mouseover) {
							layer.mouseover.call($canvases[e], layer);
						}
						
						// Set cursor when mousing over layer
						if (layer.cursor) {
							// Store original cursor for later
							layer._cursor = $canvas.css('cursor');
							// Set cursor using CSS
							$canvas.css({
								cursor: layer.cursor
							});
						}
					
					}
				
				}
												
				// Detect any other mouse event
				if (callback && !layer._fired) {
				
					// Prevent event from firing twice unintentionally
					layer._fired = TRUE;
					eventCache.type = NULL;
					// Run the user-defined callback function
					callback.call($canvases[e], layer);
				
				}
			
				// Use the mousedown event to start drag
				if (layer.draggable && !layer.disableDrag && (eventType === 'mousedown' || eventType === 'touchstart')) {
														
					// Keep track of drag state
					drag.layer = layer;
							
				}
			
			}
		
			// Dragging a layer works independently from other events
			if (drag.layer) {
				
				if ((eventType === 'mousemove' || eventType === 'touchmove')) {
					// Detect when user starts dragging and when user is in the process of dragging layer
						
					// Check if layer has started to drag
					if (!drag.dragging) {
						
						// Signify that a layer on the canvas is being dragged
						drag.dragging = TRUE;
												
						// Optionally bring layer to front when drag starts
						if (drag.layer.bringToFront) {
							// Remove layer from its original position
							layers.splice(drag.layer.index, 1);
							// Bring layer to front
							// push() returns the new array length
							drag.layer.index = layers.push(drag.layer);
						}
				
						// Move a layer's drag group when layer is dragged
						group = data.layer.groups[drag.layer.group];
						if (drag.layer.group && drag.layer.dragGroupWithLayer && group) {
																					
							for (l = 0; l < group.length; l += 1) {
								if (group[l] !== drag.layer) {
									group[l]._startX = group[l].x;
									group[l]._startY = group[l].y;
									group[l]._endX = drag.layer._eventX;
									group[l]._endY = drag.layer._eventY;
									// Optionally bring all layers in drag group to front when drag starts
									if (group[l].bringToFront) {
										group[l].index = inArray(group[l], layers);
										// Remove layer from its original position in layers array
										layers.splice(group[l].index, 1);
										// Bring layer to front
										layers.splice(-1, 0, group[l]);
										// Ensure layer index is accurate
										group[l].index = layers.length - 2;
									}
									// Trigger dragstart event if defined
									if (group[l].dragstart) {
										group[l].dragstart.call($canvases[e], group[l]);
									}
									
								}
							}
													
						}
				
						// Set drag properties for this layer
						drag._startX = drag.layer._startX = drag.layer.x;
						drag._startY = drag.layer._startY = drag.layer.y;
						drag._endX = drag.layer._endX = drag.layer._eventX;
						drag._endY = drag.layer._endY = drag.layer._eventY;
						
						// Trigger dragstart event if defined
						if (drag.layer.dragstart) {
							drag.layer.dragstart.call($canvas[0], drag.layer);
						}
						
					}
					
					// Calculate position after drag
					drag.layer.x = drag.layer._eventX - (drag._endX - drag._startX);
					drag.layer.y = drag.layer._eventY - (drag._endY - drag._startY);
					
					// Move groups with layer if desired
					group = data.layer.groups[drag.layer.group];
					if (drag.layer.group && drag.layer.dragGroupWithLayer && group) {
						
						for (l = 0; l < group.length; l += 1) {
							if (group[l] !== drag.layer) {
								group[l].x = drag.layer._eventX - (group[l]._endX - group[l]._startX);
								group[l].y = drag.layer._eventY - (group[l]._endY - group[l]._startY);
								// Trigger drag event if defined
								if (group[l].drag) {
									group[l].drag.call($canvases[e], group[l]);
								}
							}
						}
						
					}
					
					// Trigger drag event if defined
					if (drag.layer.drag) {
						drag.layer.drag.call($canvases[e], drag.layer);
					}
					
				} else if ((eventType === 'mouseup' || eventType === 'touchend')) {
					// Detect when user stops dragging layer
					
					// Trigger dragstop event if defined
					if (drag.layer.dragstop && drag.dragging) {
						drag.layer.dragstop.call($canvases[e], drag.layer);
						drag.dragging = FALSE;
					}
					
					group = data.layer.groups[drag.layer.group];
					if (drag.layer.group && drag.layer.dragGroupWithLayer && group) {
						for (l = 0; l < group.length; l += 1) {
							if (group[l] !== drag.layer) {
								// Trigger dragstart event if defined
								if (group[l].dragstop) {
									group[l].dragstop.call($canvases[e], group[l]);
								}
							}
						}
					}
					// Cancel dragging
					data.drag = {};
				
				}
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
function _addLayer(canvas, params, args, method) {
	var $canvas, layers, layer = args,
		data;
	
	// Store arguments object for later use
	params._args = args;
	params.canvas = canvas;
	
	// Convert all draggable drawings into jCanvas layers
	if (params.draggable) {
		params.layer = TRUE;
	}
	
	// Determine the layer's type using the available information
	if (method) {
		params._method = method;
	} else if (params.method) {
		params._method = $.fn[params.method];
	} else if (params.type) {
		params._method = $.fn[drawingMap[params.type]];
	} else {
		params._method = function() {};
	}
	
	// Only add layer if it hasn't been added before
	if (params.layer && !params._layer) {
		
		$canvas = $(canvas);
		layers = $canvas.getLayers();
		
		data = _getCanvasData(canvas);
						
		// Ensure layers are unique across canvases by cloning them
		layer = new jCanvasObject(params);
		
		// Update layer group mappings
		_updateLayerName($canvas, data, layer);
		_updateLayerGroup($canvas, data, layer);
		
		// Check for any associated jCanvas events and enable them
		_addLayerEvents($canvas, data, layer);
		
		// Optionally enable drag-and-drop support and cursor support
		_enableDrag($canvas, data, layer);
		
		// Copy _event property to parameters object
		params._event = layer._event;
		
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
	return layer;
}

// Add a jCanvas layer
$.fn.addLayer = function addLayer(args) {
	var $canvases = this, e, ctx,
		params = merge({}, args);
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			
			params.layer = TRUE;
			args = _addLayer($canvases[e], params, args);
			
		}
	}
	return $canvases;
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
	for (i = 0; i < cssProps.length; i += 1) {
		obj[cssProps[i]] = obj['_' + cssProps[i]];
	}
}
function hideProps(obj, reset) {
	var i;
	for (i = 0; i < cssProps.length; i += 1) {
		// Hide property using same name with leading underscore
		obj['_' + cssProps[i]] = obj[cssProps[i]];
		cssPropsObj[cssProps[i]] = 1;
		if (reset) {
			delete obj[cssProps[i]];
		}
	}
}

// Evaluate property values that are functions
function evalFnValues(canvas, layer, obj) {
	var propName;
	for (propName in obj) {
		if (obj.hasOwnProperty(propName)) {
			if (isFunction(obj[propName])) {
				obj[propName] = obj[propName].call(canvas, layer, propName);
			}
		}
	}
	return obj;
}

// Convert a color value to RGB
function toRgb(color) {
	var originalColor, elem,
		rgb = [],
		multiple = 1;
	
	// Deal with hexadecimal colors and color names
	if (color.match(/^#?\w+$/gi)) {
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
	if (color.match(/^rgb/gi)) {
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
	if (typeOf(fx.start) !== 'array') {
		fx.start = toRgb(fx.start);
		fx.end = toRgb(fx.end);
	}
	fx.now = [];
	
	// If colors are RGBA, animate transparency
	if (fx.start[3] !== 1 || fx.end[3] !== 1) {
		n = 4;
	}
		
	// Calculate current frame for red, green, blue, and alpha
	for (i = 0; i < n; i += 1) {
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
$.fn.animateLayer = function animateLayer() {
	var $canvases = this, $canvas, e, ctx,
		args = ([]).slice.call(arguments, 0),
		data, layer, props;
			
	// Deal with all cases of argument placement
	/*
		0. layer name/index
		1. properties
		2. duration/options
		3. easing
		4. complete function
		5. step function
	*/
	
	if (typeOf(args[2]) === 'object') {
	
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
		} else if (isFunction(args[2])) {
			// If callback comes after object
			args.splice(2, 0, NULL);
			args.splice(3, 0, NULL);
		}
		if (args[3] === UNDEFINED) {
			// If duration is the last argument
			args[3] = NULL;
			args.splice(4, 0, NULL);
		} else if (isFunction(args[3])) {
			// If callback comes after duration
			args.splice(3, 0, NULL);
		}

	}
	
	// Run callback function when animation completes
	function complete($canvas, data, layer) {
		
		return function() {
			
			showProps(layer);
			
			// Prevent multiple redraw loops
			if (!data.animating || data.animated === layer) {
				// Redraw layers on last frame
				$canvas.drawLayers();
			}
			
			// Run callback function at the end of the animation
			if (args[4]) {
				args[4].call($canvas[0], layer);
			}
			
			// Signify the end of an animation loop
			layer._animating = FALSE;
			data.animating = FALSE;
			data.animated = NULL;
			
		};
		
	}
	// Redraw layers on every frame of the animation
	function step($canvas, data, layer) {
		
		return function(now, fx) {
			
			showProps(layer);
			
			// Signify the start of an animation loop
			if (!layer._animating && !data.animating) {
				layer._animating = TRUE;
				data.animating = TRUE;
				data.animated = layer;
			}
			
			// Prevent multiple redraw loops
			if (!data.animating || data.animated === layer) {
				// Redraw layers for every frame
				$canvas.drawLayers();
			}
			
			// Run callback function for every frame (if specified)
			if (args[5]) {
				args[5].call($canvas[0], now, fx, layer);
			}
			
		};
		
	}
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		ctx = _getContext($canvases[e]);
		if (ctx) {
			data = _getCanvasData($canvases[e]);
			
			// If a layer object was passed, use it the layer to be animated
			layer = $canvas.getLayer(args[0]);
			
			// Ignore layers that are functions
			if (layer && layer._method !== $.fn.draw) {
				
				// Do not modify original object
				props = merge({}, args[1]);
				
				props = evalFnValues($canvases[e], layer, props);
				
				// Bypass jQuery CSS Hooks for CSS properties (width, opacity, etc.)
				hideProps(props, TRUE);
				hideProps(layer);
				
				// Fix for jQuery's vendor prefixing support, which affects how width/height/opacity are animated
				layer.style = cssPropsObj;
												
				// Animate layer
				$(layer).animate(props, {
					duration: args[2],
					easing: ($.easing[args[3]] ? args[3] : NULL),
					// When animation completes
					complete: complete($canvas, data, layer),
					// Redraw canvas for every animation frame
					step: step($canvas, data, layer)
				});
			}
		}
	}
	return $canvases;
};

// Animate all layers in a layer group
$.fn.animateLayerGroup = function animateLayerGroup(groupId) {
	var $canvases = this, $canvas, e,
		args = ([]).slice.call(arguments, 0),
		group, l;
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		group = $canvas.getLayerGroup(groupId);
		
		// Animate all layers in the group
		for (l = 0; l < group.length; l += 1) {
			
			$canvas.animateLayer.apply($canvas, [group[l]].concat(args.slice(1)));
			
		}
	}
	return $canvases;
};

// Delay layer animation by a given number of milliseconds
$.fn.delayLayer = function delayLayer(layerId, duration) {
	var $canvases = this, e, layer;
	duration = duration || 0;
	
	for (e = 0; e < $canvases.length; e += 1) {
		layer = $($canvases[e]).getLayer(layerId);
		$(layer).delay(duration);
	}
	return $canvases;
};

// Delay animation all layers in a layer group
$.fn.delayLayerGroup = function delayLayerGroup(groupId, duration) {
	var $canvases = this, $canvas, e,
		group, layer, l;
	duration = duration || 0;
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		
		group = $canvas.getLayerGroup(groupId);
		// Delay all layers in the group
		if (group) {
			
			for (l = 0; l < group.length; l += 1) {
				// Delay each layer in the group
				layer = group[l];
				if (layer) {
					$(layer).delay(duration);
				}
			}
			
		}
	}
	return $canvases;
};

// Stop layer animation
$.fn.stopLayer = function stopLayer(layerId, clearQueue) {
	var $canvases = this, $canvas, e,
		layer;
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		
		layer = $canvas.getLayer(layerId);
		if (layer) {
			
			$(layer).stop(clearQueue);
			
		}
	}
	return $canvases;
};

// Stop animation of all layers in a layer group
$.fn.stopLayerGroup = function stopLayerGroup(groupId, clearQueue) {
	var $canvases = this, $canvas, e,
		group, layer, l;
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		
		group = $canvas.getLayerGroup(groupId);
		// Stop all layers in the group
		if (group) {
			
			for (l = 0; l < group.length; l += 1) {
				// Stop each layer in the group
				layer = group[l];
				if (layer) {
					$(layer).stop(clearQueue);
				}
			}
			
		}
	}
	return $canvases;
};

// Enable animation for color properties
function supportColorProps(props) {
	var p;
	for (p = 0; p < props.length; p += 1) {
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

// Map standard mouse events to touch events
mouseEventMap = {
	'mousedown': 'touchstart',
	'mouseup': 'touchend',
	'mousemove': 'touchmove'
};
// Map standard touch events to mouse events
touchEventMap = {
	'touchstart': 'mousedown',
	'touchend': 'mouseup',
	'touchmove': 'mousemove'
};

// Convert mouse event name to a corresponding touch event name (if possible)
function getTouchEventName(eventName) {
	// Detect touch event support
	if ('ontouchstart' in window) {
		if (mouseEventMap[eventName]) {
			eventName = mouseEventMap[eventName];
		}
	}
	return eventName;
}
// Convert touch event name to a corresponding mouse event name
function getMouseEventName(eventName) {
	if (touchEventMap[eventName]) {
		eventName = touchEventMap[eventName];
	}
	return eventName;
}

// Bind event to jCanvas layer using standard jQuery events
function createEvent(eventName) {
	
	jCanvas.events[eventName] = function($canvas, data) {
		var helperEventName, eventCache;
			
		// Use touch events instead of mouse events for mobile devices
		eventName = getTouchEventName(eventName);
		// Retrieve canvas's event cache
		eventCache = data.event;
		
		// Both mouseover/mouseout events will be managed by a single mousemove event
		helperEventName = (eventName === 'mouseover' || eventName === 'mouseout') ? 'mousemove' : eventName;
				
		// Ensure a single DOM event is not bound more than once
		if (!data.events[helperEventName]) {
			// Bind one canvas event which handles all layer events of that type
			$canvas.bind(helperEventName + '.jCanvas', function(event) {
				// Cache current mouse position and redraw layers
				eventCache.x = event.offsetX;
				eventCache.y = event.offsetY;
				eventCache.type = helperEventName;
				eventCache.event = event;
				// Redraw layers on every trigger of the event
				$canvas.drawLayers({
					resetFire: TRUE
				});
				// Prevent default behavior
				event.preventDefault();
			});
			// Prevent this event from being bound twice
			data.events[helperEventName] = TRUE;
		}
	};
}
function createEvents(eventNames) {
	var n;
	for (n = 0; n < eventNames.length; n += 1) {
		createEvent(eventNames[n]);
	}
}
// Populate jCanvas events object with some standard events
createEvents([
	'click',
	'dblclick',
	'mousedown',
	'mouseup',
	'mousemove',
	'mouseover',
	'mouseout',
	'touchstart',
	'touchmove',
	'touchend'
]);

// Check if event fires when a drawing is drawn
function _detectEvents(canvas, ctx, params) {
	var layer, data, eventCache, intersects,
		transforms, x, y, angle;
		
	// Use the layer object stored by the given parameters object
	layer = params._args;
	// Canvas must have event bindings
	if (layer._event) {
				
		data = _getCanvasData(canvas);
		eventCache = data.event;
		if (eventCache.x !== NULL && eventCache.y !== NULL) {
			// Respect user-defined pixel ratio
			x = eventCache.x * data.pixelRatio;
			y = eventCache.y * data.pixelRatio;
			// Determine if the given coordinates are in the current path
			intersects = ctx.isPointInPath(x, y) || (ctx.isPointInStroke && ctx.isPointInStroke(x, y));
		}
		transforms = data.transforms;
		
		// Allow callback functions to retrieve the mouse coordinates
		layer.eventX = layer.mouseX = eventCache.x;
		layer.eventY = layer.mouseY = eventCache.y;
		layer.event = eventCache.event;
		
		// Adjust coordinates to match current canvas transformation
		
		// Keep track of some transformation values
		angle = data.transforms.rotate;
		x = layer.eventX;
		y = layer.eventY;
		
		if (angle !== 0) {
			// Rotate coordinates if coordinate space has been rotated
			layer._eventX = (x * cos(-angle)) - (y * sin(-angle));
			layer._eventY = (y * cos(-angle)) + (x * sin(-angle));
		} else {
			// Otherwise, no calculations need to be made
			layer._eventX = x;
			layer._eventY = y;
		}
		
		// Scale coordinates
		layer._eventX /= transforms.scaleX;
		layer._eventY /= transforms.scaleY;
		
		// Detect mouseout events
		if (!intersects && layer._hovered && !layer._fired) {
			layer._mousedout = TRUE;
		}
			
		// If layer intersects with cursor, add it to the list
		if (intersects) {
			data.intersecting.push(layer);
		}
		layer.intersects = intersects;
	}
}

// Normalize offsetX and offsetY for all browsers
$.event.fix = function(event) {
	var offset, originalEvent, touches;
	
	event = jQueryEventFix.call($.event, event);
	originalEvent = event.originalEvent;
	
	// originalEvent does not exist for manually-triggered events
	if (originalEvent) {
		
		touches = originalEvent.changedTouches;
		
		// If offsetX and offsetY are not supported, define them
		if (event.pageX !== UNDEFINED && event.offsetX === UNDEFINED) {
			offset = $(event.target).offset();
			if (offset) {
				event.offsetX = event.pageX - offset.left;
				event.offsetY = event.pageY - offset.top;
			}
		} else if (touches) {
			// Enable offsetX and offsetY for mobile devices
			offset = $(originalEvent.target).offset();
			if (offset) {
				event.offsetX = touches[0].pageX - offset.left;
				event.offsetY = touches[0].pageY - offset.top;
			}
		}
	
	}
	return event;
};

/* Drawing API */

// Map drawing names with their respective method names
drawingMap = {
	'arc': 'drawArc',
	'bezier': 'drawBezier',
	'circle': 'drawArc',
	'ellipse': 'drawEllipse',
	'function': 'draw',
	'image': 'drawImage',
	'line': 'drawLine',
	'polygon': 'drawPolygon',
	'quadratic': 'drawQuadratic',
	'rectangle': 'drawRect',
	'text': 'drawText',
	'vector': 'drawVector'
};

// Draw on canvas using a function
$.fn.draw = function draw(args) {
	var $canvases = this, $canvas, e, ctx,
		params;
	params = new jCanvasObject(args);
	
	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		ctx = _getContext($canvases[e]);
		if (ctx) {
			
			args = _addLayer($canvases[e], params, args, draw);
			if (params.visible) {
								
				if (params.fn) {
					// Call the given user-defined function
					params.fn.call($canvases[e], ctx, params);
				} else if (params._method !== draw) {
					// Allow draw() to call any drawing method
					params._method.call($canvas, args);
				}
			
			}
			
		}
	}
	return $canvases;
};

// Clear canvas
$.fn.clearCanvas = function clearCanvas(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args);
		
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
						
			if (params.width === NULL || params.height === NULL) {
				// Clear entire canvas if width/height is not given
				
				// Reset current transformation temporarily to ensure that the entire canvas is cleared
				ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, $canvases[e].width, $canvases[e].height);
				ctx.restore();
				
			} else {
				// Otherwise, clear the defined section of the canvas
								
				// Transform clear rectangle
				_transformShape(ctx, params, params.width, params.height);
				ctx.clearRect(params.x - (params.width / 2), params.y - (params.height / 2), params.width, params.height);
				// Restore previous transformation
				ctx.restore();
				
			}
			
		}
	}
	return $canvases;
};

/* Transformation API */

// Restore canvas
$.fn.saveCanvas = function saveCanvas(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		data, i;
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			data = _getCanvasData($canvases[e]);
			args = _addLayer($canvases[e], params, args, saveCanvas);
			
			// Restore a number of times using the given count
			for (i = 0; i < params.count; i += 1) {
				_saveCanvas(ctx, data);
			}
		}
	}
	return $canvases;
};

// Restore canvas
$.fn.restoreCanvas = function restoreCanvas(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		data, i;
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			data = _getCanvasData($canvases[e]);
			args = _addLayer($canvases[e], params, args, restoreCanvas);
			
			// Restore a number of times using the given count
			for (i = 0; i < params.count; i += 1) {
				_restoreCanvas(ctx, data);
			}
		}
	}
	return $canvases;
};

// Restore canvas
$.fn.restoreCanvasOnRedraw = function restoreCanvasOnRedraw(args) {
	var $canvases = this,
		params = merge({}, args);
	params.layer = TRUE;
	$canvases.restoreCanvas(params);
	return $canvases;
};

// Rotate canvas
$.fn.rotateCanvas = function rotateCanvas(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		data;
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			data = _getCanvasData($canvases[e]);
			args = _addLayer($canvases[e], params, args, rotateCanvas);
			
			// Autosave transformation state by default
			if (params.autosave) {
				// Automatically save transformation state by default
				_saveCanvas(ctx, data);
			}
			_rotateCanvas(ctx, params, data.transforms);
		}
	}
	return $canvases;
};

// Scale canvas
$.fn.scaleCanvas = function scaleCanvas(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		data;
		
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			data = _getCanvasData($canvases[e]);
			args = _addLayer($canvases[e], params, args, scaleCanvas);
			
			// Autosave transformation state by default
			if (params.autosave) {
				// Automatically save transformation state by default
				_saveCanvas(ctx, data);
			}
			_scaleCanvas(ctx, params, data.transforms);
		}
	}
	return $canvases;
};

// Translate canvas
$.fn.translateCanvas = function translateCanvas(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		data;

	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			data = _getCanvasData($canvases[e]);
			args = _addLayer($canvases[e], params, args, translateCanvas);
			
			// Autosave transformation state by default
			if (params.autosave) {
				// Automatically save transformation state by default
				_saveCanvas(ctx, data);
			}
			_translateCanvas(ctx, params, data.transforms);
		}
	}
	return $canvases;
};

/* Shape API */

// Draw rectangle
$.fn.drawRect = function drawRect(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		x1, y1, x2, y2, r;

	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
		
			args = _addLayer($canvases[e], params, args, drawRect);
			if (params.visible) {
			
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, params.width, params.height);
				
				ctx.beginPath();
				x1 = params.x - (params.width / 2);
				y1 = params.y - (params.height / 2);
				r = params.cornerRadius;
				if (r) {
					// Draw rectangle with rounded corners if cornerRadius is defined
					
					params.closed = TRUE;
					x2 = params.x + (params.width / 2);
					y2 = params.y + (params.height / 2);
					// Prevent over-rounded corners
					if ((x2 - x1) - (2 * r) < 0) {
						r = (x2 - x1) / 2;
					}
					if ((y2 - y1) - (2 * r) < 0) {
						r = (y2 - y1) / 2;
					}
					ctx.moveTo(x1 + r, y1);
					ctx.lineTo(x2 - r, y1);
					ctx.arc(x2 - r, y1 + r, r, 3 * PI / 2, PI * 2, FALSE);
					ctx.lineTo(x2, y2 - r);
					ctx.arc(x2 - r, y2 - r, r, 0, PI / 2, FALSE);
					ctx.lineTo(x1 + r, y2);
					ctx.arc(x1 + r, y2 - r, r, PI / 2, PI, FALSE);
					ctx.lineTo(x1, y1 + r);
					ctx.arc(x1 + r, y1 + r, r, PI, 3 * PI / 2, FALSE);
					
				} else {
					
					// Otherwise, draw rectangle with square corners
					ctx.rect(x1, y1, params.width, params.height);
					
				}
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Close rectangle path
				_closePath($canvases[e], ctx, params);
				
			}
		}
	}
	return $canvases;
};

// Draw arc or circle
$.fn.drawArc = function drawArc(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args);
	args = args || {};

	// Convert default end angle to radians if necessary
	if (params.layer && !params.inDegrees && params.end === 360) {
		args.end = params.end = PI * 2;
	}
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawArc);
			if (params.visible) {
				
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, params.radius*2);
				
				// Draw arc
				ctx.beginPath();
				ctx.arc(params.x, params.y, params.radius, (params.start * params._toRad) - (PI / 2), (params.end * params._toRad) - (PI / 2), params.ccw);
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Optionally close path
				_closePath($canvases[e], ctx, params);
			
			}
			
		}
	}
	return $canvases;
};

// Draw ellipse
$.fn.drawEllipse = function drawEllipse(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		controlW = params.width * (4 / 3),
		controlH = params.height;
	params.closed = TRUE;
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawEllipse);
			if (params.visible) {
				
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, params.width, params.height);
				
				// Create ellipse using curves
				ctx.beginPath();
				ctx.moveTo(params.x, params.y - (controlH / 2));
				// Left side
				ctx.bezierCurveTo(params.x - (controlW / 2), params.y - (controlH / 2), params.x - (controlW / 2), params.y + (controlH / 2), params.x, params.y + (controlH / 2));
				// Right side
				ctx.bezierCurveTo(params.x + (controlW / 2), params.y + (controlH / 2), params.x + (controlW / 2), params.y - (controlH / 2), params.x, params.y - (controlH / 2));
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Optionally close path
				_closePath($canvases[e], ctx, params);
				
			}
		}
	}
	return $canvases;
};

// Draw a regular (equal-angled) polygon
$.fn.drawPolygon = function drawPolygon(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		// Polygon's central angle
		dtheta = (2 * PI) / params.sides,
		// Half of dtheta
		hdtheta = dtheta / 2,
		// Polygon's starting angle
		theta = hdtheta + (PI / 2),
		// Distance from polygon's center to the middle of its side
		apothem = params.radius * cos(hdtheta),
		x, y, i;
	
	// Convert 'concavity' property to 'projection'
	if (params.projection) {
		params.concavity = -params.projection;
	}
	
	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {
			
			args = _addLayer($canvases[e], params, args, drawPolygon);
			if (params.visible) {
				
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, params.radius*2);
				
				// Calculate points and draw
				ctx.beginPath();
				for (i = 0; i < params.sides; i += 1) {
					// Draw side of polygon
					x = params.x + (params.radius * cos(theta));
					y = params.y + (params.radius * sin(theta));
					// Plot point on polygon
					ctx.lineTo(x, y);
					// Project side if chosen
					if (params.concavity) {
						// Sides are projected from the polygon's apothem
						x = params.x + ((apothem + (-apothem * params.concavity)) * cos(theta + hdtheta));
						y = params.y + ((apothem + (-apothem * params.concavity)) * sin(theta + hdtheta));
						ctx.lineTo(x, y);
					}
					// Increment theta by delta theta
					theta += dtheta;
				}
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Always close path
				params.closed = TRUE;
				_closePath($canvases[e], ctx, params);
				
			}
		}
	}
	return $canvases;
};

/* Path API */

// Draw line
$.fn.drawLine = function drawLine(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		l, lx, ly;

	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawLine);
			if (params.visible) {
				
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, 0);
				
				// Draw each point
				l = 1;
				ctx.beginPath();
				while (TRUE) {
					
					lx = params['x' + l];
					ly = params['y' + l];
					
					if (lx !== UNDEFINED && ly !== UNDEFINED) {
						ctx.lineTo(lx + params.x, ly + params.y);
						l += 1;
					} else {
						break;
					}
					
				}
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Optionally close path
				_closePath($canvases[e], ctx, params);
			
			}
			
		}
	}
	return $canvases;
};

// Draw quadratic curve
$.fn.drawQuadratic = $.fn.drawQuad = function drawQuadratic(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		l, lx, ly, lcx, lcy;

	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawQuadratic);
			if (params.visible) {
				
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, 0);
				
				// Draw each point
				l = 2;
				ctx.beginPath();
				ctx.moveTo(params.x1 + params.x, params.y1 + params.y);
				while (TRUE) {
					
					lx = params['x' + l];
					ly = params['y' + l];
					lcx = params['cx' + (l - 1)];
					lcy = params['cy' + (l - 1)];
					
					if (lx !== UNDEFINED && ly !== UNDEFINED && lcx !== UNDEFINED && lcy !== UNDEFINED) {
						ctx.quadraticCurveTo(lcx + params.x, lcy + params.y, lx + params.x, ly + params.y);
						l += 1;
					} else {
						break;
					}
					
				}
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Optionally close path
				_closePath($canvases[e], ctx, params);
			
			}
		}
	}
	return $canvases;
};

// Draw Bezier curve
$.fn.drawBezier = function drawBezier(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		l , lc,
		lx, ly,
		lcx1, lcy1,
		lcx2, lcy2;

	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawBezier);
			if (params.visible) {
			
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, 0);
				
				// Draw each point
				l = 2;
				lc = 1;
				ctx.beginPath();
				ctx.moveTo(params.x1 + params.x, params.y1 + params.y);
				while (TRUE) {
					
					lx = params['x' + l];
					ly = params['y' + l];
					lcx1 = params['cx' + lc];
					lcy1 = params['cy' + lc];
					lcx2 = params['cx' + (lc + 1)];
					lcy2 = params['cy' + (lc + 1)];
					
					if (lx !== UNDEFINED && ly !== UNDEFINED && lcx1 !== UNDEFINED && lcy1 !== UNDEFINED && lcx2 !== UNDEFINED && lcy2 !== UNDEFINED) {
						ctx.bezierCurveTo(lcx1 + params.x, lcy1 + params.y, lcx2 + params.x, lcy2 + params.y, lx + params.x, ly + params.y);
						l += 1;
						lc += 2;
					} else {
						break;
					}
					
				}
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Optionally close path
				_closePath($canvases[e], ctx, params);
			
			}
		}
	}
	return $canvases;
};

// Draw vector
$.fn.drawVector = function drawVector(args) {
	var $canvases = this, e, ctx,
		params = new jCanvasObject(args),
		l, angle, length, x, y;

	for (e = 0; e < $canvases.length; e += 1) {
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawVector);
			if (params.visible) {
			
				_setGlobalProps($canvases[e], ctx, params);
				_transformShape(ctx, params, 0);
				
				// Draw each point
				l = 1;
				ctx.beginPath();
				x = params.x;
				y = params.y;
				// The vector starts at the given (x, y) coordinates
				ctx.moveTo(params.x, params.y);
				while (TRUE) {
					
					angle = params['a' + l];
					length = params['l' + l];
					
					if (angle !== UNDEFINED && length !== UNDEFINED) {
						// Convert the angle to radians with 0deg starting at north
						angle = (angle * params._toRad) - (PI / 2);
						// Compute (x, y) coordinates from angle and length
						x += (length * Math.cos(angle));
						y += (length * Math.sin(angle));
						ctx.lineTo(x, y);
						l += 1;
					} else {
						break;
					}
					
				}
				// Check for jCanvas events
				if (params._event) {
					_detectEvents($canvases[e], ctx, params);
				}
				// Optionally close path
				_closePath($canvases[e], ctx, params);
		
			}
		}
	}
	return $canvases;
};

/* Text API */

// Calculate font string and set it as the canvas font
function setCanvasFont(ctx, params) {
	if (params.font) {
		// Prefer the font string if given
		ctx.font = params.font;
	} else {
		// Otherwise, use the given font attributes
		if (!isNaN(Number(params.fontSize))) {
			// Give font size units if it doesn't have any
			params.fontSize += 'px';
		}
		// Set font using given font properties
		ctx.font = params.fontStyle + ' ' + params.fontSize + ' ' + params.fontFamily;
	}
}

// Measure canvas text
function measureText(canvas, ctx, params, lines) {
	var originalSize, sizeMatch,
		sizeExp = /\b(\d*\.?\d*)\w\w\b/gi,
		l, curWidth;
	
	// Used cached width/height if possible
	if (cache.text === params.text && cache.font === params.font && cache.fontStyle === params.fontStyle && cache.fontSize === params.fontSize && cache.fontFamily === params.fontFamily && cache.maxWidth === params.maxWidth && cache.lineHeight === params.lineHeight) {
				
		params.width = cache.width;
		params.height = cache.height;
		
	} else {
		// Calculate text dimensions only once
								
		// Calculate width of first line (for comparison)
		params.width = ctx.measureText(lines[0]).width;
		
		// Get width of longest line
		for (l = 1; l < lines.length; l += 1) {
			curWidth = ctx.measureText(lines[l]).width;
			// Ensure text's width is the width of its longest line
			if (curWidth > params.width) {
				params.width = curWidth;
			}
		}
		
		// Save original font size
		originalSize = canvas.style.fontSize;
		if (params.font) {
			// Get specified font size using pattern
			sizeMatch = params.font.match(sizeExp);
			if (sizeMatch) {
				canvas.style.fontSize = params.font.match(sizeExp)[0];
			}
		} else {
			// Otherwise, use the given font size
			canvas.style.fontSize = params.fontSize;
		}
		// Save text width and height in parameters object
		params.height = parseFloat($.css(canvas, 'fontSize')) * lines.length * params.lineHeight;
		// Reset font size to original size
		canvas.style.fontSize = originalSize;
	}
}

// Wrap a string of text within a defined width
function wrapText(ctx, params) {
	var text = params.text,
		maxWidth = params.maxWidth,
		words = text.split(' '), w,
		lines = [],
		line = '';
		
	if (ctx.measureText(text).width < maxWidth || words.length === 1) {
		// If text is short enough initially, do nothing else
		// Or, if the text consists of only one word, do nothing else
		lines = [text];
	} else {
		// Wrap lines
		for (w = 0; w < words.length; w += 1) {
			
			// Once line gets too wide, push word to next line
			if (ctx.measureText(line + words[w]).width > maxWidth) {
				// This check prevents empty lines from being created
				if (line !== '') {
					lines.push(line);
				}
				// Start new line and repeat process
				line = '';
			}
			// Add words to line until the line is too wide
			line += words[w];
			// Do not add a space after the last word
			if (w !== (words.length - 1)) {
				line += ' ';
			}
		}
		// The last word should always be pushed
		lines.push(line);
		
	}
	// Remove unnecessary white space
	lines = lines
		.join('\n')
		.replace(/( (\n))|( $)/gi, '$2')
		.split('\n');
	return lines;
}

// Draw text
$.fn.drawText = function drawText(args) {
	var $canvases = this, $canvas, e, ctx,
		params = new jCanvasObject(args),
		lines, l, x, y;

	for (e = 0; e < $canvases.length; e += 1) {
		$canvas = $($canvases[e]);
		ctx = _getContext($canvases[e]);
		if (ctx) {

			args = _addLayer($canvases[e], params, args, drawText);
			if (params.visible) {
				
				_setGlobalProps($canvases[e], ctx, params);
				
				// Set text-specific properties
				ctx.textBaseline = params.baseline;
				ctx.textAlign = params.align;
				
				// Set canvas font using given properties
				setCanvasFont(ctx, params);
										
				if (!e && params.maxWidth !== NULL) {
					// Wrap text using an internal function
					lines = wrapText(ctx, params);
				} else if (!e) {
					// Convert string of text to list of lines
					lines = String(params.text).split('\n');
				}
				
				// If this is the first iteration
				if (!e) {
					
					// Calculate text's width and height
					measureText($canvases[e], ctx, params, lines);
					
					// If text is a layer
					if (args && params.layer) {
						// Copy calculated width/height to layer object
						args.width = params.width;
						args.height = params.height;
					}
					
					// Adjust text position to accomodate different horizontal alignments
					x = params.x;
					if (params.align === 'left') {
						if (params.respectAlign) {
							// Realign text to the left if chosen
							params.x += params.width / 2;
						} else {
							// Center text block by default
							x -= params.width / 2;
						}
					} else if (params.align === 'right') {
						if (params.respectAlign) {
							// Realign text to the right if chosen
							params.x -= params.width / 2;
						} else {
							// Center text block by default
							x += params.width / 2;
						}
					}
					
				}
				_transformShape(ctx, params, params.width, params.height);
								
				// Draw each line of text separately
				for (l = 0; l < lines.length; l += 1) {
					ctx.shadowColor = params.shadowColor;
					// Add line offset to center point, but subtract some to center everything
					y = params.y + (l * params.height / lines.length) - ((lines.length - 1) * params.height / lines.length) / 2;
					ctx.fillText(lines[l], x, y);
					// Prevent extra shadow created by stroke (but only when fill is present)
					if (params.fillStyle !== 'transparent') {
						ctx.shadowColor = 'transparent';
					}
					ctx.strokeText(lines[l], x, y);
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
					_detectEvents($canvases[e], ctx, params);
					// Close path and configure masking
					ctx.closePath();
				}
				_restoreTransform(ctx, params);
				
			}
		}
	}
	cache = params;
	return $canvases;
};

// Measure text width/height using the given parameters
$.fn.measureText = function measureText(args) {
	var $canvases = this, ctx,
		params, lines;
	
	if (args !== UNDEFINED && (typeOf(args) !== 'object' || args.layer)) {
		// If layer identifier is given, get that layer
		params = $canvases.getLayer(args);
	} else {
		// If object is given, just use that
		params = new jCanvasObject(args);
	}
		
	ctx = _getContext($canvases[0]);
	if (ctx) {
		
		// Set canvas font using given properties
		setCanvasFont(ctx, params);
		// Calculate width and height of text
		lines = wrapText(ctx, params);
		measureText($canvases[0], ctx, params, lines);
		
	}
	return params;
};

/* Image API */

// Draw image
$.fn.drawImage = function drawImage(args) {
	var $canvases = this, canvas, e, ctx, data,
		params = new jCanvasObject(args),
		img, imgCtx, source;
	
	// Cache the given source
	source = params.source;
	
	imgCtx = source.getContext;
	if (source.src || imgCtx) {
		// Use image or canvas element if given
		img = source;
	} else if (source) {
		if (imageCache[source] !== UNDEFINED) {
			// Get the image element from the cache if possible
			img = imageCache[source];
		} else {
			// Otherwise, get the image from the given source URL
			img = new Image();
			img.src = source;
			// Save image in cache for improved performance
			imageCache[source] = img;
		}
	}
	
	// Draw image function
	function draw(e, ctx, data) {
	
		// Calculate image dimensions only once
		if (e === 0) {
						
			// If width and sWidth are not defined, use image width
			if (params.width === NULL && params.sWidth === NULL) {
				params.width = params.sWidth = img.width;
			}
			// If width and sHeight are not defined, use image height
			if (params.height === NULL && params.sHeight === NULL) {
				params.height = params.sHeight = img.height;
			}
			
			// Ensure image layer's width and height are accurate
			if (args && params.layer) {
				args.width = params.width;
				args.height = params.height;
			}
			
		}
						
		// Only crop image if all cropping properties are given
		if (params.sWidth !== NULL && params.sHeight !== NULL && params.sx !== NULL && params.sy !== NULL) {
			
			// Calculate image dimensions only once
			if (e === 0) {
			
				// If width is not defined, use the given sWidth
				if (params.width === NULL) {
					params.width = params.sWidth;
				}
				// If height is not defined, use the given sHeight
				if (params.height === NULL) {
					params.height = params.sHeight;
				}
			
				// Optionally crop from top-left corner of region
				if (!params.cropFromCenter) {
					params.sx += params.sWidth / 2;
					params.sy += params.sHeight / 2;
				}
			
				// Ensure cropped region does not pass image boundaries
				
				// Right
				if ((params.sx + (params.sWidth / 2)) > img.width) {
					params.sx = img.width - (params.sWidth / 2);
				}
				// Left
				if ((params.sx - (params.sWidth / 2)) < 0) {
					params.sx = (params.sWidth / 2);
				}
				// Top
				if ((params.sy - (params.sHeight / 2)) < 0) {
					params.sy = (params.sHeight / 2);
				}
				// Bottom
				if ((params.sy + (params.sHeight / 2)) > img.height) {
					params.sy = img.height - (params.sHeight / 2);
				}
				
			}
								
			// Position/transform image if necessary
			_transformShape(ctx, params, params.width, params.height);
			
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
			
			// Position/transform image if necessary
			_transformShape(ctx, params, params.width, params.height);
						
			// Draw image on canvas
			ctx.drawImage(
				img,
				params.x - params.width / 2,
				params.y - params.height / 2,
				params.width,
				params.height
			);
			
		}
				
		// Set global canvas properties
		_setGlobalProps($canvases[e], ctx, params);
		
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
			_detectEvents($canvases[e], ctx, params);
		}
		// Close path and configure masking
		ctx.closePath();
		ctx.stroke();
		_restoreTransform(ctx, params);
		_enableMasking(ctx, data, params);
	}
	// On load function
	function onload(canvas, e, ctx, data) {
		return function() {
			draw(e, ctx, data);
			// Run callback function if defined
			if (params.load) {
				params.load.call(canvas, args);
			}
			// Continue drawing successive layers after this image layer has loaded
			if (params.layer) {
				// Store list of previous masks for each layer
				params._args._masks = data.transforms.masks.slice(0);
				if (params._next) {
					// Draw successive layers
					$(canvas).drawLayers({
						clear: FALSE,
						resetFire: TRUE,
						index: params._next
					});
				}
			}
		};
	}
	for (e = 0; e < $canvases.length; e += 1) {
		canvas = $canvases[e];
		ctx = _getContext($canvases[e]);
		if (ctx) {

			data = _getCanvasData($canvases[e]);
			args = _addLayer($canvases[e], params, args, drawImage);
			if (params.visible) {
								
				if (img) {
					if (img.complete || imgCtx) {
						// Draw image if already loaded
						onload(canvas, e, ctx, data)();
					} else {
						// Otherwise, draw image when it loads
						$(img).bind('load', onload(canvas, e, ctx, data));
						// Fix onload() bug in IE9
						img.src = img.src;
					}
				}
			
			}
		}
	}
	return $canvases;
};

// Create canvas pattern
// The pattern() method has been deprecated
$.fn.createPattern = $.fn.pattern = function createPattern(args) {
	var $canvases = this,
		ctx, params = new jCanvasObject(args),
		img, pattern, imgCtx, source;
	
	// Function to be called when pattern loads
	function onload() {
		// Create pattern
		pattern = ctx.createPattern(img, params.repeat);
		// Run callback function if defined
		if (params.load) {
			params.load.call($canvases[0], pattern);
		}
	}
	
	ctx = _getContext($canvases[0]);
	if (ctx) {
	
		// Cache the given source
		source = params.source;
		
		// Draw when image is loaded (if load() callback function is defined)
		
		if (isFunction(source)) {
			// Draw pattern using function if given

			img = $('<canvas />')[0];
			img.width = params.width;
			img.height = params.height;
			imgCtx = _getContext(img);
			source.call(img, imgCtx);
			onload();
			
		} else {
			// Otherwise, draw pattern using source image
			
			imgCtx = source.getContext;
			if (source.src || imgCtx) {
				// Use image element if given
				img = source;
			} else {
				// Use URL if given to get the image
				img = new Image();
				img.src = source;
			}
			
			// Create pattern if already loaded
			if (img.complete || imgCtx) {
				onload();
			} else {
				$(img).bind('load', onload);
				// Fix onload() bug in IE9
				img.src = img.src;
			}
			
		}
	} else {
		pattern = NULL;
	}
	return pattern;
};

// Create a canvas gradient object
// The gradient() method has been deprecated
$.fn.createGradient = $.fn.gradient = function createGradient(args) {
	var $canvases = this, ctx,
		params = new jCanvasObject(args),
		gradient,
		stops = [], nstops,
		start, end,
		i, a, n, p;
	
	ctx = _getContext($canvases[0]);
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
			// Otherwise, create a linear gradient by default
			gradient = ctx.createLinearGradient(params.x1, params.y1, params.x2, params.y2);
		}

		// Count number of color stops
		for (i = 1; params['c' + i] !== UNDEFINED; i += 1) {
			if (params['s' + i] !== UNDEFINED) {
				stops.push(params['s' + i]);
			} else {
				stops.push(NULL);
			}
		}
		nstops = stops.length;
		
		// Define start stop if not already defined
		if (stops[0] === NULL) {
			stops[0] = 0;
		}
		// Define end stop if not already defined
		if (stops[nstops - 1] === NULL) {
			stops[nstops - 1] = 1;
		}
		
		// Loop through color stops to fill in the blanks
		for (i = 0; i < nstops; i += 1) {
			// A progression, in this context, is defined as all of the color stops between and including two known color stops
			
			if (stops[i] !== NULL) {
				// Start a new progression if stop is a number
				
				// Number of stops in current progression
				n = 1;
				// Current iteration in current progression
				p = 0;
				start = stops[i];

				// Look ahead to find end stop
				for (a = (i + 1); a < nstops; a += 1) {
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
			
			} else if (stops[i] === NULL) {
				// Calculate stop if not initially given
				p += 1;
				stops[i] = start + (p * ((end - start) / n));
			}
			// Add color stop to gradient object
			gradient.addColorStop(stops[i], params['c' + (i + 1)]);
		}

	} else {
		gradient = NULL;
	}
	return gradient;
};

// Get pixels on the canvas
$.fn.setPixels = function setPixels(args) {
	var $canvases = this,
		canvas, e, ctx,
		params = new jCanvasObject(args),
		px = {},
		imgData, data, i, len;
	
	for (e = 0; e < $canvases.length; e += 1) {
		canvas = $canvases[e];
		ctx = _getContext(canvas);
		if (ctx) {
			
			args = _addLayer(canvas, params, args, setPixels);
			// Measure (x, y) from center of region by default
			_transformShape(ctx, params, params.width, params.height);
			
			// Use entire canvas of x, y, width, or height is not defined
			if (params.width === NULL || params.height === NULL) {
				params.width = canvas.width;
				params.height = canvas.height;
				params.x = params.width / 2;
				params.y = params.height / 2;
			}
			
			if (params.width !== 0 && params.height !== 0) {
				// Only set pixels if width and height are not zero
				
				imgData = ctx.getImageData(params.x - (params.width / 2), params.y - (params.height / 2), params.width, params.height);
				data = imgData.data;
				len = data.length;
				px = [];
						
				// Loop through pixels with the "each" callback function
				if (params.each) {
					for (i = 0; i < len; i += 4) {
						px.r = data[i];
						px.g = data[i + 1];
						px.b = data[i + 2];
						px.a = data[i + 3];
						params.each.call(canvas, px);
						data[i] = px.r;
						data[i + 1] = px.g;
						data[i + 2] = px.b;
						data[i + 3] = px.a;
					}
				}
				// Put pixels on canvas
				ctx.putImageData(imgData, params.x - (params.width / 2), params.y - (params.height / 2));
				ctx.restore();
			
			}
			
		}
	}
	return $canvases;
};

// Get canvas image as data URL
$.fn.getCanvasImage = function getCanvasImage(type, quality) {
	var canvas = this[0];
	// JPEG quality defaults to 1
	if (quality === UNDEFINED) {
		quality = 1;
	}
	return (canvas && canvas.toDataURL ? canvas.toDataURL('image/' + type, quality) : NULL);
};

// Scale canvas based on the device's pixel ratio
$.fn.detectPixelRatio = function detectPixelRatio(callback) {
	var $canvases = this,
		$canvas, canvas, e, ctx,
		devicePixelRatio, backingStoreRatio, ratio,
		oldWidth, oldHeight,
		data;
	
	for (e = 0; e < $canvases.length; e += 1) {
		// Get canvas and its associated data
		canvas = $canvases[e];
		$canvas = $($canvases[e]);
		ctx = _getContext(canvas);
		data = _getCanvasData($canvases[e]);
		
		// If canvas has not already been scaled with this method
		if (!data.scaled) {
		
			// Determine device pixel ratios
			devicePixelRatio = window.devicePixelRatio || 1;
			backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
				ctx.mozBackingStorePixelRatio ||
				ctx.msBackingStorePixelRatio ||
				ctx.oBackingStorePixelRatio ||
				ctx.backingStorePixelRatio || 1;
		
			// Calculate general ratio based on the two given ratios
			ratio = devicePixelRatio / backingStoreRatio;
			
			if (ratio !== 1) {
				// Scale canvas relative to ratio
				
				// Get the current canvas dimensions for future use
				oldWidth = canvas.width;
				oldHeight = canvas.height;

				// Resize canvas relative to the determined ratio
				canvas.width = oldWidth * ratio;
				canvas.height = oldHeight * ratio;
			
				// Scale canvas back to original dimensions via CSS
				canvas.style.width = oldWidth + 'px';
				canvas.style.height = oldHeight + 'px';
			
				// Scale context to counter the manual scaling of canvas
				ctx.scale(ratio, ratio);
			
			}
		
			// Set pixel ratio on canvas data object
			data.pixelRatio = ratio;
			// Ensure that this method can only be called once for any given canvas
			data.scaled = TRUE;
			
			// Call the given callback function with the ratio as its only argument
			if (callback) {
				callback.call(canvas, ratio);
			}
			
		}
		
	}
	return $canvases;
};

// Enable canvas feature detection with $.support
$.support.canvas = ($('<canvas />')[0].getContext !== UNDEFINED);

// Export jCanvas functions
jCanvas.defaults = defaults;
jCanvas.detectEvents = _detectEvents;
jCanvas.closePath = _closePath;
$.jCanvas = jCanvas;

}(jQuery, document, Image, Math, parseFloat, true, false, null));