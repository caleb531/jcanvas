/*!
jCanvas v5.3b
Copyright 2012, Caleb Evans
Licensed under the MIT license
*/

// Import frequently used globals
(function($, window, document, Math, Image, parseFloat, parseInt, TRUE, FALSE, NULL, UNDEFINED) {

// Define local aliases to frequently used properties
var defaults,
	prefs,
	merge = $.extend,
	round = Math.round,
	PI = Math.PI,
	sin = Math.sin,
	cos = Math.cos,
	oldEventFix = $.event.fix,
	eventCache = {},
	cache = {},
	transparent = 'transparent',
	cssProps,
	colorProps;

// Preferences constructor (which inherits from the defaults object)
function Prefs() {}

// jCanvas function
function jCanvas(args) {
	if (args) {
		// Merge arguments with preferences
		merge(prefs, args);
	} else {
		// Reset preferences to defaults if nothing is passed
		prefs = Prefs.prototype = merge({}, defaults);
	}
	return this;
}
// Make jCanvas function "chainable"
$.fn.jCanvas = jCanvas;

jCanvas.version = '5.3b';
jCanvas.events = {};

// Set jCanvas default property values
defaults = {
	angle: 0,
	align: 'center',
	autosave: TRUE,
	baseline: 'middle',
	ccw: FALSE,
	closed: FALSE,
	compositing: 'source-over',
	cornerRadius: 0,
	cropFromCenter: TRUE,
	each: NULL,
	end: 360,
	fillStyle: transparent,
	font: '12pt sans-serif',
	fromCenter: TRUE,
	height: NULL,
	inDegrees: TRUE,
	load: NULL,
	mask: FALSE,
	miterLimit: 10,
	opacity: 1,
	projection: 0,
	r1: NULL,
	r2: NULL,
	radius: 0,
	repeat: 'repeat',
	rounded: FALSE,
	scale: 1,
	scaleX: 1,
	scaleY: 1,
	shadowBlur: 0,
	shadowColor: transparent,
	shadowX: 0,
	shadowY: 0,
	sHeight: NULL,
	sides: 3,
	source: '',
	start: 0,
	strokeCap: 'butt',
	strokeJoin: 'miter',
	strokeStyle: transparent,
	strokeWidth: 1,
	sWidth: NULL,
	sx: NULL,
	sy: NULL,
	text: '',
	visible: TRUE,
	width: NULL,
	x: 0,
	x1: 0,
	x2: 0,
	y: 0,
	y1: 0,
	y2: 0
};
// Copy defaults over to preferences
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

// Keep track of the last 2 mouse coordinates on the canvas)
eventCache.x = [];
eventCache.y = [];

// Create jCanvas event from a standard jQuery event
function createEvent(name) {
	jCanvas.events[name] = function handler($elem) {
		$elem
		.bind(name + '.jCanvas', function(event) {
			// Cache current mouse position and redraw layers
			eventCache.x[0] = event.offsetX;
			eventCache.y[0] = event.offsetY;
			eventCache.type = event.type;
			$elem.drawLayers();
		});
		handler.called = TRUE;
	};
}
// Populate jCanvas events object with some events
createEvent('click');
createEvent('dblclick');
createEvent('mousedown');
createEvent('mouseup');
createEvent('mousemove');

// Detect both "mouseover" and "mouseout" events with one "hover" event
jCanvas.events.mouseover = jCanvas.events.mouseout = function handler($elem) {
	$elem
	.bind('mousemove.jCanvas', function(event) {
		eventCache.x[1] = eventCache.x[0];
		eventCache.y[1] = eventCache.y[0];
		eventCache.x[0] = event.offsetX;
		eventCache.y[0] = event.offsetY;
		eventCache.type = 'hover';
		$elem.drawLayers();
	});
	handler.called = TRUE;
};

// Update event cache with new coordinates
function updateEventCache(params) {
	params.mouseX = eventCache.x[0];
	params.mouseY = eventCache.y[0];
	eventCache.x = [];
	eventCache.y = [];
}

// Check if event fires when a drawing is drawn
function checkEvents(elem, ctx, layer) {
	var type = eventCache.type,
		callback = layer[type],
		over = ctx.isPointInPath(eventCache.x[0], eventCache.y[0]),
		out = ctx.isPointInPath(eventCache.x[1], eventCache.y[1]);
	
	// Detect mouseover/mouseout events
	if (type === 'hover') {
				
		// Mouseover
		if (over && !out && !layer.fired) {
			layer.fired = TRUE;
			updateEventCache(layer);
			if (layer.mouseover) {
				layer.mouseover.call(elem, layer);
				setGlobalProps(ctx, layer);
			}
		// Mouseout
		} else if (!over && out && layer.fired) {
			layer.fired = FALSE;
			updateEventCache(layer);
			if (layer.mouseout) {
				layer.mouseout.call(elem, layer);
				setGlobalProps(ctx, layer);
			}
		}
		
	// Detect any other mouse events
	} else if (type !== 'hover' && callback && over) {
		updateEventCache(layer);
		callback.call(elem, layer);
		setGlobalProps(ctx, layer);
	}
}

// Load canvas (used internally)
function loadCanvas(elem) {
	return (elem && elem.getContext ? elem.getContext('2d') : NULL);
}

// Close path (used internally)
function closePath(ctx, params) {
	// Mask shape/path if chosen
	if (params.mask) {
		if (params.autosave) {ctx.save();}
		ctx.clip();
	}
	// Close path if chosen
	if (params.closed) {
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
	}
}

// Scale canvas (used internally)
function scaleCanvas(ctx, params) {
	// Scale both the X and Y axis if chosen
	if (params.scale !== 1) {
		params.scaleX = params.scaleY = params.scale;
	}
	// Scale shape if chosen
	if (params.scaleX !== 1 || params.scaleY !== 1) {
		ctx.translate(params.x, params.y);
		ctx.scale(params.scaleX, params.scaleY);
		ctx.translate(-params.x, -params.y);
	}
}

// Rotate canvas (used internally)
function rotateCanvas(ctx, params) {
	params.toRad = (params.inDegrees ? PI/180 : 1);
	ctx.translate(params.x, params.y);
	ctx.rotate(params.angle*params.toRad);
	ctx.translate(-params.x, -params.y);
}

// Rotate/scale individual shape and/or position it correctly
function positionShape(ctx, params, width, height) {
	
	// Measure angles in chosen units
	params.toRad = (params.inDegrees ? PI/180 : 1);
	ctx.save();

	// Always rotate from center
	if (!params.fromCenter) {
		params.x += width/2;
		params.y += height/2;
	}
	
	// Rotate shape if chosen
	if (params.angle) {
		rotateCanvas(ctx, params);
	}
	// Scale shape if chosen
	scaleCanvas(ctx, params);
}

// Extend jCanvas with custom methods
function extend(plugin) {

	// Merge properties with defaults
	plugin = plugin || {};
	defaults = merge(defaults, plugin.props);
	jCanvas();

	// Create plugin
	if (plugin.name) {
		$.fn[plugin.name] = function(args) {
			var $elems = this, elem, e, ctx,
				params = merge(new Prefs(), args);
			
			for (e=0; e<$elems.length; e+=1) {
				elem = $elems[e];
				ctx = loadCanvas(elem);
				if (ctx) {
					setGlobalProps(ctx, params);
					plugin.fn.call(elem, ctx, params);
				}
			}
			return $elems;
		};
	}
	return $.fn[plugin.name];
}

// Load canvas
$.fn.loadCanvas = function() {
	return loadCanvas(this[0]);
};

// Get canvas image as data URL
$.fn.getCanvasImage = function(type, quality) {
	var elem = this[0];
	if (!type) {
		type = 'png';
	}
	type = type
		.replace(/^(\w+)$/gi, 'image/$1')
		.replace(/jpg/gi, 'jpeg');
	return (elem && elem.toDataURL) ? elem.toDataURL(type, quality) : NULL;
};

// Draw on canvas using the standard canvas API
$.fn.draw = function(callback) {
	var $elems = this, e, ctx;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			callback.call($elems[e], ctx);
		}
	}
	return $elems;
};

// Create a canvas gradient object
$.fn.gradient = function(args) {
	var $elems = this, ctx,
		params = merge(new Prefs(), args),
		gradient,
		stops = [], nstops,
		start, end,
		i, a, n, p;
	
	args = args || {};
	ctx = loadCanvas($elems[0]);
	if (ctx) {
				
		// Don't calculate gradient if only one color is defined
		if (!params.c2) {
			gradient = params.c1;
		} else {

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
				
				// If stop is a number, start a new progression
				if (stops[i] !== NULL && stops[i] !== 1) {
					
					// Number of stops in current progression
					n = 1;
					// Current iteration in current progression
					p = 0;
					start = stops[i];

					// Look ahead to find end stop
					for (a=(i+1); a<nstops; a+=1) {
						// If this future stop is a number, make it the end stop for this progression
						if (stops[a] !== NULL) {
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
					args['s' + (i+1)] = stops[i];
				}
				gradient.addColorStop(stops[i], params['c' + (i+1)]);
			}

		}
	} else {
		gradient = NULL;
	}
	return gradient;
};

// Create pattern
$.fn.pattern = function(args) {
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
	
	ctx = loadCanvas($elems[0]);
	if (ctx) {
		img = new Image();
	
		// Draw when image is loaded (if load() callback function is defined)
		if (typeof params.source === 'function') {
			
			img = document.createElement('canvas');
			img.width = params.width;
			img.height = params.height;
			imgCtx = loadCanvas(img);
			params.source.call(img, imgCtx);
			onload();
			
		} else {
			
			// Use image element, if not, a image URL
			if (params.source.src) {
				img = params.source;
			} else {
				img.src = params.source;
			}
			
			// Draw image if already loaded
			if (img.complete) {
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

// Clear canvas
$.fn.clearCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);

	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			
			if (!e) {
				positionShape(ctx, params, params.width, params.height);
			}
			
			// Clear entire canvas
			if (!params.width && !params.height) {
				ctx.clearRect(0, 0, $elems[e].width, $elems[e].height);
			} else {
				ctx.clearRect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			}
			
		}
	}
	return $elems;
};

// Save canvas
$.fn.saveCanvas = function() {
	var $elems = this, e, ctx;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			ctx.save();
		}
	}
	return $elems;
};

// Restore canvas
$.fn.restoreCanvas = function() {
	var $elems = this, e, ctx;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			ctx.restore();
		}
	}
	return $elems;
};

// Scale canvas
$.fn.scaleCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);
		
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			if (params.autosave) {ctx.save();}
			scaleCanvas(ctx, params);
		}
	}
	return $elems;
};

// Translate canvas
$.fn.translateCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);

	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			if (params.autosave) {ctx.save();}
			ctx.translate(params.x, params.y);
		}
	}
	return $elems;
};

// Rotate canvas
$.fn.rotateCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			if (params.autosave) {ctx.save();}
			rotateCanvas(ctx, params);
		}
	}
	return $elems;
};

// Draw rectangle
$.fn.drawRect = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		x1, y1, x2, y2, r;

	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
		
			setGlobalProps(ctx, params);
			if (!e) {
				positionShape(ctx, params, params.width, params.height);
			}
			
			ctx.beginPath();
			// Draw a rounded rectangle if chosen
			if (params.cornerRadius) {
				params.closed = TRUE;
				x1 = params.x - params.width/2;
				y1 = params.y - params.height/2;
				x2 = params.x + params.width/2;
				y2 = params.y + params.height/2;
				r = params.cornerRadius;
				// Prevent over-rounded corners
				if ((x2 - x1) - (2 * r) < 0) {
					r = (x2 - x1) / 2;
				}
				if ((y2 - y1) - (2 * r) < 0) {
					r = (y2 - y1) / 2;
				}
				ctx.moveTo(x1+r,y1);
				ctx.lineTo(x2-r,y1);
				ctx.arc(x2-r, y1+r, r, 3*PI/2, PI*2, FALSE);
				ctx.lineTo(x2,y2-r);
				ctx.arc(x2-r, y2-r, r, 0, PI/2, FALSE);
				ctx.lineTo(x1+r,y2);
				ctx.arc(x1+r, y2-r, r, PI/2, PI, FALSE);
				ctx.lineTo(x1,y1+r);
				ctx.arc(x1+r, y1+r, r, PI, 3*PI/2, FALSE);
			} else {
				ctx.rect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			}
			ctx.restore();
			// Check for jCanvas events
			if (params.event) {
				checkEvents($elems[e], ctx, args);
			}
			closePath(ctx, params);
			
		}
	}
	return $elems;
};

// Draw arc
$.fn.drawArc = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);

	// Change default end angle to radians if necessary
	if (!params.inDegrees && params.end === 360) {
		params.end = PI * 2;
	}
		
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			
			setGlobalProps(ctx, params);
			positionShape(ctx, params, params.radius*2, params.radius*2);
	
			// Draw arc
			ctx.beginPath();
			ctx.arc(params.x, params.y, params.radius, (params.start*params.toRad)-(PI/2), (params.end*params.toRad)-(PI/2), params.ccw);
			// Close path if chosen
			ctx.restore();
			// Check for jCanvas events
			if (params.event) {
				checkEvents($elems[e], ctx, args);
			}
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

// Draw ellipse
$.fn.drawEllipse = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		controlW = params.width * 4/3;
		
	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			
			setGlobalProps(ctx, params);
			if (!e) {
				positionShape(ctx, params, params.width, params.height);
			}
			
			// Create ellipse using curves
			ctx.beginPath();
			ctx.moveTo(params.x, params.y-params.height/2);
			// Left side
			ctx.bezierCurveTo(params.x-controlW/2, params.y-params.height/2, params.x-controlW/2, params.y+params.height/2, params.x, params.y+params.height/2);
			// Right side
			ctx.bezierCurveTo(params.x+controlW/2, params.y+params.height/2, params.x+controlW/2, params.y-params.height/2, params.x, params.y-params.height/2);
			ctx.restore();
			
			// Check for jCanvas events
			if (params.event) {
				checkEvents($elems[e], ctx, args);
			}
			closePath(ctx, params);
			
		}
	}
	return $elems;
};

// Draw line
$.fn.drawLine = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l=2, lx=0, ly=0;

	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
			
			setGlobalProps(ctx, params);
			
			// Draw each point
			ctx.beginPath();
			ctx.moveTo(params.x1, params.y1);
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
			if (params.event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

// Draw quadratic curve
$.fn.drawQuad = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l=2, lx=0, ly=0, lcx=0, lcy=0;

	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
		
			setGlobalProps(ctx, params);
				
			// Draw each point
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
			if (params.event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

// Draw Bezier curve
$.fn.drawBezier = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l = 2, lc = 1,
		lx = 0, ly = 0,
		lcx1 = 0, lcy1 = 0,
		lcx2 = 0, lcy2 = 0;

	for (e=0; e<$elems.length; e+=1) {
		ctx = loadCanvas($elems[e]);
		if (ctx) {
		
			setGlobalProps(ctx, params);
		
			// Draw each point
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
			if (params.event) {
				checkEvents($elems[e], ctx, args);
			}
			// Close path if chosen
			closePath(ctx, params);
		
		}
	}
	return $elems;
};

// Measure canvas text
function measureText(elem, ctx, params) {
	var originalSize, sizeMatch;
	
	// Calculate width
	params.width = ctx.measureText(params.text).width;
	
	// Calculate height only if needed
	if (cache.font === params.font && cache.text === params.text) {
		
		params.height = cache.height;
		
	} else {
		
		// Save original font size
		originalSize = elem.style.fontSize;
		// Get specified font size, or calculate font size if not specified
		sizeMatch = params.font.match(/\d+/gi);
		if (sizeMatch) {
			elem.style.fontSize = (params.font.match(/(\d*\.?\d*)\w+/gi) || $.css(elem, 'fontSize'))[0];
		}
		// Save text width and height in parameters
		params.height = parseFloat($.css(elem, 'fontSize'));
		// Reset font size to original size
		elem.style.fontSize = originalSize;
		
	}
}

// Draw text
$.fn.drawText = function(args) {
	var $elems = this, $elem, e, ctx,
		params = merge(new Prefs(), args);

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = loadCanvas($elem[0]);
		if (ctx) {
			
			setGlobalProps(ctx, params);
			
			// Set text-specific properties
			ctx.textBaseline = params.baseline;
			ctx.textAlign = params.align;
			ctx.font = params.font;
			
			// Retrieve text's width and height
			measureText($elem[0], ctx, params);
			
			if (!e) {
				positionShape(ctx, params, params.width, params.height);
			}
			
			ctx.strokeText(params.text, params.x, params.y);
			ctx.fillText(params.text, params.x, params.y);
			
			// Detect jCanvas events
			if (params.event) {
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

// Draw image
$.fn.drawImage = function(args) {
	var $elems = this, elem, e, ctx,
		params = merge(new Prefs(), args),
		img, scaleFac,
		sWidthDefined, sHeightDefined;
	
	// Create arguments object if not defined (because the jCanvas() function was used instead)
	args = args || {};
	
	// Use image element, if not, an image URL
	if (params.source.src) {
		img = params.source;
	} else if (params.source) {
		img = new Image();
		img.src = params.source;
	}
	
	// Draw image function
	function draw(ctx, e) {
		if (!e) {
			scaleFac = img.width / img.height;
			
			// Show whole image if no cropping region is defined
			// Also ensure cropped region is not bigger than image
			if (params.sWidth === NULL || params.sWidth > img.width) {
				params.sWidth = img.width;
				sWidthDefined = TRUE;
			}
			if (params.sHeight === NULL || params.sHeight > img.height) {
				params.sHeight = img.height;
				sHeightDefined = TRUE;
			}
			// Destination width/height should equal source unless otherwise defined
			if (params.width === NULL && !sWidthDefined) {
				params.width = params.sWidth;
			}
			if (params.height === NULL && !sHeightDefined) {
				params.height = params.sHeight;
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
				args.height = params.height = params.width / scaleFac;
			// If only height is present
			} else if (params.width === NULL && params.height !== NULL) {
				args.width = params.width = params.height * scaleFac;
			// If width and height are both absent
			} else if (params.width === NULL && params.height === NULL) {
				args.width = params.width = img.width;
				args.height = params.height = img.height;
			}
			// Position image
			positionShape(ctx, params, params.width, params.height);
			
		}
			
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
		// Draw invisible rectangle to allow for events
		if (params.event) {
			ctx.fillStyle = '#000';
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
	// On load function
	function onload(elem, e, ctx) {
		return function() {
			draw(ctx, e);
			// Run callback function if defined
			if (params.load) {
				params.load.call(elem);
			}
		};
	}
	// Draw image if already loaded
	for (e=0; e<$elems.length; e+=1) {
		elem = $elems[e];
		ctx = loadCanvas($elems[e]);
		if (ctx) {
		
			setGlobalProps(ctx, params);
			
			// Draw image if already loaded
			if (img) {
				if (img.complete) {
					onload(elem, e, ctx)();
				} else {
					img.onload = onload(elem, e, ctx);
				}
			}
		
		}
	}
	return $elems;
};

// Draw a regular (equal-angled) polygon
$.fn.drawPolygon = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		inner = PI / params.sides,
		theta = (PI/2) + inner,
		dtheta = (PI*2) / params.sides,
		apothem = cos(dtheta/2) * params.radius,
		x1, y1, x2, y2, i;
	params.closed = TRUE;
	
	if (params.sides > 2) {
		for (e=0; e<$elems.length; e+=1) {
			ctx = loadCanvas($elems[e]);
			if (ctx) {
			
				setGlobalProps(ctx, params);
				
				// Calculate points and draw
				if (!e) {
					positionShape(ctx, params, params.radius, params.radius);
				}
				ctx.beginPath();
				for (i=0; i<params.sides; i+=1) {
					x1 = params.x + round(params.radius * cos(theta));
					y1 = params.y + round(params.radius * sin(theta));
					// Draw side of polygon
					if (!i) {
						ctx.moveTo(x1, y1);
					} else {
						ctx.lineTo(x1, y1);
					}
					// Project side if chosen
					if (params.projection) {
						x2 = params.x + round((apothem+apothem*params.projection) * cos(theta+inner));
						y2 = params.y + round((apothem+apothem*params.projection) * sin(theta+inner));
						ctx.lineTo(x2, y2);
					}
					theta += dtheta;
				}
				ctx.restore();
				// Check for jCanvas events
				if (params.event) {
					checkEvents($elems[e], ctx, args);
				}
				closePath(ctx, params);
				
			}
		}
	}
	return $elems;
};

// Get pixels on the canvas
$.fn.setPixels = function(args) {
	var $elems = this,
		elem, e, ctx,
		params = merge(new Prefs(), args),
		imgData, data, i, len, px = {};
	
	for (e=0; e<$elems.length; e+=1) {
		elem = $elems[e];
		ctx = loadCanvas(elem);
		if (ctx) {
		
			// Measure (x, y) from center of region
			if (!params.x && !params.y && !params.width && !params.height) {
				params.width = elem.width;
				params.height = elem.height;
				params.x = params.width/2;
				params.y = params.height/2;
			}
			if (!e) {
				positionShape(ctx, params, params.width, params.height);
			}
			imgData = ctx.getImageData(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			data = imgData.data;
			len = data.length;
			px = [];
			
			// Loop through pixels with the "each" method
			if (params.each !== NULL) {
				for (i=0; i<len; i+=4) {
					px.index = i / 4;
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

// Hide jCanvas/CSS properties from CSS Hooks so they can be animated using jCanvas
function showProps(props, obj) {
	var i;
	for (i=0; i<props.length; i+=1) {
		obj[props[i]] = obj['_' + props[i]];
	}
}
function hideProps(props, obj) {
	var i;
	for (i=0; i<props.length; i+=1) {
		obj['_' + props[i]] = obj[props[i]];
	}
}

// Define properties for both CSS and jCanvas
cssProps = [
	'width',
	'height',
	'opacity'
];
// Define supported color properties
colorProps = [
	'color',
	'backgroundColor',
	'borderColor',
	'borderTopColor',
	'borderRightColor',
	'borderBottomColor',
	'borderLeftColor',
	'fillStyle',
	'strokeStyle',
	'shadowColor',
];

// Convert a color value to RGBA
function toRgba(color) {
	var originalColor, elem,
		rgb = [],
		multiple = 1;
	
	// If color is array already
	if (typeof color === 'object') {
		rgb = color;
	} else {
		
		// Deal with color names
		if (color.match(/^[a-z]+$/gi)) {
			// Deal with complete transparency
			if (color === transparent) {
				color = 'rgba(255,255,255,0)';
			}
			elem = document.documentElement;
			originalColor = elem.style.color;
			elem.style.color = color;
			color = $.css(elem, 'color');
			elem.style.color = originalColor;
		}
		// Deal with hexadecimal
		if (color.match(/^\#/gi)) {
			// Deal with shorthand hex
			if (color.length === 4) {
				color = color.replace(/([0-9a-f])/gi, '$1$1');
			}
			rgb = color.match(/[0-9a-f]{2}/gi);
			rgb[0] = parseInt(rgb[0], 16);
			rgb[1] = parseInt(rgb[1], 16);
			rgb[2] = parseInt(rgb[2], 16);
		// Parse RGB string
		} else if (color.match(/^rgb/gi)) {
			rgb = color.match(/[0-9\.]+/gi);
			// Deal with RGB percentages
			if (color.match(/\%/gi)) {
				multiple = 2.55;
			}
			rgb[0] = rgb[0] * multiple;
			rgb[1] = rgb[1] * multiple;
			rgb[2] = rgb[2] * multiple;
		}
		// Add alpha
		if (color.match('rgba')) {
			rgb[3] = parseFloat(rgb[3]);
		} else {
			rgb[3] = 1;
		}
	}
	return rgb;
}

// Get current frame value
function getFrame(fx, i) {
	fx.now[i] = fx.start[i] + (fx.end[i] - fx.start[i]) * fx.pos;
	// Don't round a color's alpha value
	if (i < 3) {
		fx.now[i] = round(fx.now[i]);
	}
}

// Animate a hex or RGB color
function animateColor(fx) {
	if (typeof fx.start !== 'object') {
		fx.start = toRgba(fx.start);
		fx.end = toRgba(fx.end);
	}
	fx.now = [];
	getFrame(fx, 0);
	getFrame(fx, 1);
	getFrame(fx, 2);
	getFrame(fx, 3);
	fx.now = 'rgba(' + fx.now.join(',') + ')';
	// Animate colors for canvas shapes and elements
	if (fx.elem.style) {
		fx.elem.style[fx.prop] = fx.now;
	} else {
		fx.elem[fx.prop] = fx.now;
	}
}

// Enable animation for color properties
function supportColorProps(props) {
	var p;
	for (p=0; p<props.length; p+=1) {
		if (!$.fx.step[props[p]]) {
			$.fx.step[props[p]] = animateColor;
		}
	}
}

// Get jCanvas layers
$.fn.getLayers = function() {
	var elem = this[0], layers;
	if (!elem || !elem.getContext) {
		layers = NULL;
	} else {
		layers = $.data(elem, 'jCanvas-layers');
		// Create layers array if none exists
		if (!layers) {
			layers = [];
			$.data(elem, 'jCanvas-layers', layers);
		}
	}
	return layers;
};

// Get a single jCanvas layer
$.fn.getLayer = function(name) {
	var layers = this.getLayers(),
		layer, i;
	if (!layers) {
		layer = NULL;
	} else {
		if (typeof name === 'string') {
			for (i=0; i<layers.length; i+=1) {
				if (layers[i].name === name) {
					name = i;
					break;
				}
			}
		}
		name = name || 0;
		layer = layers[name];
	}
	return layer;
};

// Draw individual layer (used internally)
function drawLayer($elem, ctx, layer) {
	if (layer.visible) {
		// If layer is a function
		if (layer.method === 'draw') {
			layer.call($elem[0], ctx);
		// If layer is an object
		} else {
			if ($.fn[layer.method]) {
				$.fn[layer.method].call($elem, layer);
			}
		}
	}
}

// Draw jCanvas layers
$.fn.drawLayers = function() {
	var $elems = this, $elem, ctx,
		layers, layer, e, i;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = loadCanvas($elem[0]);
		if (ctx) {
			
			layers = $elem.getLayers();
			// Clear canvas first
			ctx.clearRect(0, 0, $elem[0].width, $elem[0].height);
			// Draw items on queue
			for (i=0; i<layers.length; i+=1) {
				layer = layers[i];
				drawLayer($elem, ctx, layer);
			}
			
		}
	}
	return $elems;
};

// Add a new jCanvas layer
$.fn.addLayer = function(args) {
	var $elems = this, $elem, e, ctx,
		params = merge(args, new Prefs(), merge({}, args)),
		layers, event;
	params.layer = TRUE;

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = loadCanvas($elem[0]);
		if (ctx) {
		
			layers = $elem.getLayers();
			// If layer is a function
			if (typeof params === 'function') {
				params.method = 'draw';
			} else {
				// Ensure width/height of shapes (other than images) can be animated without specifying those properties initially
				if (params.method !== 'drawImage') {
					params.width = params.width || 0;
					params.height = params.height || 0;
				}
				// Check for any associated jCanvas events and enable them
				for (event in jCanvas.events) {
					if (jCanvas.events.hasOwnProperty(event) && params[event]) {
						if (!jCanvas.events[event].called) {
							jCanvas.events[event].call(window, $elem);
						}
						params.event = TRUE;
					}
				}
			}
			layers.push(params);
			drawLayer($elem, ctx, params);
		}
	}
	return $elems;
};


// Remove all jCanvas layers
$.fn.removeLayers = function() {
	var $elems = this, layers, e;
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers() || [];
		layers.length = 0;
	}
	return $elems;
};

// Remove a single jCanvas layer
$.fn.removeLayer = function(index) {
	var $elems = this, e,
		type = typeof index,
		layers, i;
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers() || [];
		if (type === 'string') {
			for (i=0; i<layers.length; i+=1) {
				if (layers[i].name === index) {
					layers.splice(i, 1);
					break;
				}
			}
		} else if (type === 'number') {
			layers.splice(index, 1);
		}
	}
	return $elems;
};

// Animate jCanvas layer
$.fn.animateLayer = function() {
	var $elems = this, $elem, e,
		args = ([]).slice.call(arguments, 0),
		layer;
		
	// Deal with all cases of argument placement
	
	// If index is omitted
	if (typeof args[0] === 'object' && !args[0].layer) {
		// Animate first layer by default
		args.unshift(0);
	}
	// If object is the last argument
	if (args[2] === UNDEFINED) {
		args.splice(2, 0, NULL);
		args.splice(3, 0, NULL);
		args.splice(4, 0, NULL);
	// If callback comes after object
	} else if (typeof args[2] === 'function') {
		args.splice(2, 0, NULL);
		args.splice(3, 0, NULL);
	}
	// If duration is the last argument
	if (args[3] === UNDEFINED) {
		args[3] = NULL;
		args.splice(4, 0, NULL);
	// If callback comes after duration
	} else if (typeof args[3] === 'function') {
		args.splice(3, 0, NULL);
	}
	// If callback is ommitted
	if (args[4] === UNDEFINED) {
		args[4] = NULL;
	}

	// Animation callback functions
	function complete(layer) {
		return function() {
			showProps(cssProps, layer);
			$elems.drawLayers();
			if (args[4]) {
				args[4].call($elems);
			}
		};
	}
	// Redraw layers on every frame of the animation
	function step(layer) {
		return function() {
			showProps(cssProps, layer);
			$elems.drawLayers();
		};
	}

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		if (loadCanvas($elems[e])) {
		
			// If a layer object was passed, use it as a reference
			if (args[0].layer) {
				layer = args[0];
			} else {
				layer = $elem.getLayer(args[0]);
			}
			// Ignore layers that are functions
			if (layer && layer.method !== 'draw') {
				
				// Bypass jQuery CSS Hooks for CSS properties (width, opacity, etc.)
				hideProps(cssProps, layer);
				hideProps(cssProps, args[1]);
				// Animate layer
				$(layer).animate(args[1], {
					duration: args[2],
					easing: ($.easing[args[3]] ? args[3] : NULL),
					// When animation completes
					complete: complete(layer),
					// Redraw canvas for every animation frame
					step: step(layer)
				});
				
			}
		}
	}
	return $elems;
};

// Normalize offsetX and offsetY for all browsers
$.event.fix = function(event) {
	var offset;
	event = oldEventFix.call($.event, event);
	// If offsetX and offsetY are not supported
	if (event.pageX !== UNDEFINED && event.offsetX === UNDEFINED) {
		offset = $(event.target).offset();
		if (offset) {
			event.offsetX = event.pageX - offset.left;
			event.offsetY = event.pageY - offset.top;
		}
	}
	return event;
};

// Enable animation for color properties
supportColorProps(colorProps);

// Enable canvas feature detection with $.support
$.support.canvas = (document.createElement('canvas').getContext !== UNDEFINED);

// Export jCanvas functions
jCanvas.defaults = defaults;
jCanvas.prefs = prefs;
jCanvas.extend = extend;
$.jCanvas = jCanvas;

}(jQuery, window, document, Math, Image, parseFloat, parseInt, true, false, null));