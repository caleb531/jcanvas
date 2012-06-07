/*!
jCanvas v5.4
Copyright 2012, Caleb Evans
Licensed under the MIT license
*/

// Import frequently used globals
(function($, window, document, Image, Math, Function, parseFloat, TRUE, FALSE, NULL, UNDEFINED) {

// Define local aliases to frequently used properties
var defaults,
	prefs,
	merge = $.extend,
	round = Math.round,
	PI = Math.PI,
	sin = Math.sin,
	cos = Math.cos,
	oldEventFix = $.event.fix,
	cache = {},
	cssProps;

// Preferences constructor (which inherits from the defaults object)
function Prefs() {}

// jCanvas function
function jCanvas(args) {
	if (args) {
		// Merge arguments with preferences
		merge(prefs, args);
	} else {
		// Reset preferences to defaults if nothing is passed
		prefs = merge(Prefs.prototype, defaults);
	}
	return this;
}
// Make jCanvas function "chainable"
$.fn.jCanvas = jCanvas;

jCanvas.version = '5.4';
jCanvas.events = {};

// Set jCanvas default property values
defaults = {
	angle: 0, // deprecated
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
	fillStyle: 'transparent',
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
	y: 0,
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

// Keep track of the last two mouse coordinates for each canvas
function getEventCache(elem) {
	var eventCache = $.data(elem, 'eventCache');
	// Create event cache if it does not already exist
	if (!eventCache) {
		eventCache = $.data(elem, 'eventCache', {
			x: [], y: []
		});
	}
	return eventCache;
}

// Bind event to jCanvas layer using standard jQuery events
function createEvent(name) {
	jCanvas.events[name] = function($elem) {
		var helperEventName = (name === 'mouseover' || name === 'mouseout') ? 'mousemove' : name;
		$elem
		.bind(helperEventName + '.jCanvas', function(event) {
			var eventCache = getEventCache($elem[0]);
			// Cache current mouse position and redraw layers
			eventCache.x[1] = eventCache.x[0];
			eventCache.y[1] = eventCache.y[0];
			eventCache.x[0] = event.offsetX;
			eventCache.y[0] = event.offsetY;
			eventCache.type = helperEventName;
			$elem.drawLayers();
		});
		$.data($elem[0], 'jCanvas-' + name, TRUE);
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

// Update event cache with new coordinates
function updateEventCache(eventCache, params) {
	params.mouseX = eventCache.x[0];
	params.mouseY = eventCache.y[0];
}

// Check if event fires when a drawing is drawn
function checkEvents(elem, ctx, layer) {
	var eventCache = $.data(elem, 'eventCache'),
		type, callback, over, out;
	type = eventCache.type;
	callback = layer[type];
	over = ctx.isPointInPath(eventCache.x[0], eventCache.y[0]);
	out = ctx.isPointInPath(eventCache.x[1], eventCache.y[1]);
	
	// Detect mouseover/mouseout events
	if (layer.mouseover || layer.mouseout) {
				
		// Mouseover
		if (over && !out && !layer._fired) {
			layer._fired = TRUE;
			updateEventCache(eventCache, layer);
			if (layer.mouseover) {
				layer.mouseover.call(elem, layer);
				setGlobalProps(ctx, layer);
			}
		// Mouseout
		} else if (!over && out && layer._fired) {
			layer._fired = FALSE;
			updateEventCache(eventCache, layer);
			if (layer.mouseout) {
				layer.mouseout.call(elem, layer);
				setGlobalProps(ctx, layer);
			}
		}
	}

	// Detect any other mouse event
	if (callback && over) {
		updateEventCache(eventCache, layer);
		callback.call(elem, layer);
		setGlobalProps(ctx, layer);
	}
}

// Get canvas context
function getContext(elem) {
	return (elem && elem.getContext ? elem.getContext('2d') : NULL);
}

// Close path
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

// Translate canvas (internal)
function translateCanvas(ctx, params) {
	// Maintain compatibility for 'x' and 'y' properties
	if ((!params.translateX && !params.translateY) && (params.x || params.y)) {
		params.translateX = params.x;
		params.translateY = params.y;
	}
	// Translate both the X and Y axis if chosen
	if (params.translate) {
		params.translateX = params.translateY = params.translate;
	}
	// Translate shape
	ctx.translate(params.translateX, params.translateY);
}

// Scale canvas (internal)
function scaleCanvas(ctx, params) {
	// Scale both the X and Y axis if chosen
	if (params.scale !== 1) {
		params.scaleX = params.scaleY = params.scale;
	}
	// Scale shape
	ctx.translate(params.x, params.y);
	ctx.scale(params.scaleX, params.scaleY);
	ctx.translate(-params.x, -params.y);
}

// Rotate canvas (internal)
function rotateCanvas(ctx, params) {
	params.toRad = (params.inDegrees ? PI/180 : 1);
	// Maintain compatibility for 'angle' property
	params.rotate = params.rotate || params.angle;

	ctx.translate(params.x, params.y);
	ctx.rotate(params.rotate*params.toRad);
	ctx.translate(-params.x, -params.y);
}

// Rotate/scale individual shape and/or position it correctly
function positionShape(e, ctx, params, width, height) {
	
	// Measure angles in chosen units
	params.toRad = (params.inDegrees ? PI/180 : 1);
	ctx.save();
	
	// Always draw from center unless otherwise specified
	height = height || width;
	if (!e && !params.fromCenter) {
		params.x += width/2;
		params.y += height/2;
	}
	
	// Rotate shape if chosen
	if (params.rotate || params.angle) {
		rotateCanvas(ctx, params);
	}
	// Scale shape if chosen
	if (params.scale !== 1 || params.scaleX !== 1 || params.scaleY !== 1) {
		scaleCanvas(ctx, params);
	}
	if (params.translate || params.translateX || params.translateY) {
		translateCanvas(ctx, params);
	}
}

// Extend jCanvas with custom methods
jCanvas.extend = function(plugin) {
	
	// Merge properties with defaults
	defaults = merge(defaults, plugin.props);
	jCanvas();
	
	// Create plugin
	if (plugin.name) {
		$.fn[plugin.name] = function(args) {
			var $elems = this, elem, e, ctx,
				params = merge(new Prefs(), args);
			
			for (e=0; e<$elems.length; e+=1) {
				elem = $elems[e];
				ctx = getContext(elem);
				if (ctx) {
					setGlobalProps(ctx, params);
					plugin.fn.call(elem, ctx, params);
				}
			}
			return $elems;
		};
	}
	return $.fn[plugin.name];
};

// Load canvas (deprecated)
$.fn.loadCanvas = function() {
	return getContext(this[0]);
};

// Get canvas image as data URL
$.fn.getCanvasImage = function(type, quality) {
	var elem = this[0];
	return (elem && elem.toDataURL) ?
		elem.toDataURL('image/' + type, quality) :
		NULL;
};

// Draw on canvas using the standard canvas API
$.fn.draw = function(callback) {
	var $elems = this, e, ctx;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
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
	
	ctx = getContext($elems[0]);
	if (ctx) {
			
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

// Clear canvas
$.fn.clearCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			positionShape(e, ctx, params, params.width, params.height);
			
			// Clear entire canvas
			if (!params.x && !params.y && !params.width && !params.height) {
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
		ctx = getContext($elems[e]);
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
		ctx = getContext($elems[e]);
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
		ctx = getContext($elems[e]);
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
		ctx = getContext($elems[e]);
		if (ctx) {
			if (params.autosave) {ctx.save();}
			translateCanvas(ctx, params);
		}
	}
	return $elems;
};

// Rotate canvas
$.fn.rotateCanvas = function(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			if (params.autosave) {ctx.save();}
			rotateCanvas(ctx, params);
		}
	}
	return $elems;
};

// Draw rectangle
$.fn.drawRect = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		x1, y1, x2, y2, r;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
		
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			positionShape(e, ctx, params, params.width, params.height);
			
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
				ctx.rect(x1, y1, params.width, params.height);
			}
			ctx.restore();
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			closePath(ctx, params);
			
		}
	}
	return $elems;
};



// Draw arc
$.fn.drawArc = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args);

	// Change default end angle to radians if necessary
	if (!params.inDegrees && params.end === 360) {
		params.end = PI * 2;
	}
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			positionShape(e, ctx, params, params.radius*2);
	
			// Draw arc
			ctx.beginPath();
			ctx.arc(params.x, params.y, params.radius, (params.start*params.toRad)-(PI/2), (params.end*params.toRad)-(PI/2), params.ccw);
			// Close path if chosen
			ctx.restore();
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
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
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			positionShape(e, ctx, params, params.width, params.height);
			
			// Create ellipse using curves
			ctx.beginPath();
			ctx.moveTo(params.x, params.y-controlH/2);
			// Left side
			ctx.bezierCurveTo(params.x-controlW/2, params.y-controlH/2, params.x-controlW/2, params.y+controlH/2, params.x, params.y+controlH/2);
			// Right side
			ctx.bezierCurveTo(params.x+controlW/2, params.y+controlH/2, params.x+controlW/2, params.y-controlH/2, params.x, params.y-controlH/2);
			ctx.restore();
			
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			closePath(ctx, params);
			
		}
	}
	return $elems;
};

// Draw line
$.fn.drawLine = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		l=1, lx=0, ly=0;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			
			// Draw each point
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
		l=2, lx=0, ly=0, lcx=0, lcy=0;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
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
		l = 2, lc = 1,
		lx = 0, ly = 0,
		lcx1 = 0, lcy1 = 0,
		lcx2 = 0, lcy2 = 0;

	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
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
			if (params._event) {
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
	var originalSize, sizeMatch,
		sizeExp = /(\d*\.?\d*)\w\w\b/gi;
	
	// Calculate width
	params.width = ctx.measureText(params.text).width;
	
	// Calculate height only if needed
	if (cache.font === params.font && cache.text === params.text) {
		
		params.height = cache.height;
		
	} else {
		
		// Save original font size
		originalSize = elem.style.fontSize;
		// Get specified font size, or calculate font size if not specified
		sizeMatch = params.font.match(sizeExp);
		if (sizeMatch) {
			elem.style.fontSize = (params.font.match(sizeExp) || $.css(elem, 'fontSize'))[0];
		}
		// Save text width and height in parameters object
		params.height = parseFloat($.css(elem, 'fontSize'));
		// Reset font size to original size
		elem.style.fontSize = originalSize;
		
	}
}

// Draw text
$.fn.drawText = function self(args) {
	var $elems = this, $elem, e, ctx,
		params = merge(new Prefs(), args);

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elem[0]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			
			// Set text-specific properties
			ctx.textBaseline = params.baseline;
			ctx.textAlign = params.align;
			ctx.font = params.font;
			
			// Retrieve text's width and height
			measureText($elem[0], ctx, params);
			
			positionShape(e, ctx, params, params.width, params.height);
			
			ctx.strokeText(params.text, params.x, params.y);
			ctx.fillText(params.text, params.x, params.y);
			
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

// Draw image
$.fn.drawImage = function self(args) {
	var $elems = this, elem, e, ctx,
		params = merge(new Prefs(), args),
		img, scaleFac;
	
	// Use image element, if not, an image URL
	if (params.source.src) {
		img = params.source;
	} else if (params.source) {
		img = new Image();
		img.src = params.source;
	}
	
	// Draw image function
	function draw(e, ctx) {
	
		if (!e) {
			scaleFac = img.width / img.height;
			
			// Show whole image if no cropping region is defined
			// Also ensure cropped region is not bigger than image
						
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
				args.height = params.height = params.width / scaleFac;
			// If only height is present
			} else if (params.width === NULL && params.height !== NULL) {
				args.width = params.width = params.height * scaleFac;
			// If width and height are both absent
			} else if (params.width === NULL && params.height === NULL) {
				args.width = params.width = img.width;
				args.height = params.height = img.height;
			}
			
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
	// On load function
	function onload(elem, e, ctx) {
		return function() {
			draw(e, ctx);
			// Run callback function if defined
			if (params.load) {
				params.load.call(elem);
			}
		};
	}
	// Draw image if already loaded
	for (e=0; e<$elems.length; e+=1) {
		elem = $elems[e];
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			positionShape(e, ctx, params, params.width, params.height);
			
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
$.fn.drawPolygon = function self(args) {
	var $elems = this, e, ctx,
		params = merge(new Prefs(), args),
		rotation = PI / params.sides,
		theta = (PI/2) + rotation,
		dtheta = (PI*2) / params.sides,
		apothem = cos(dtheta/2) * params.radius,
		x, y, i;
	params.closed = TRUE;
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			positionShape(e, ctx, params, params.radius*2);

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
					x = params.x + round((apothem+apothem*params.projection) * cos(theta+rotation));
					y = params.y + round((apothem+apothem*params.projection) * sin(theta+rotation));
					ctx.lineTo(x, y);
				}
				theta += dtheta;
			}
			ctx.restore();
			// Check for jCanvas events
			if (params._event) {
				checkEvents($elems[e], ctx, args);
			}
			closePath(ctx, params);
			
		}
	}
	return $elems;
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
			
			// Allow for layer support
			addLayer($elems[e], args, self);
			// Measure (x, y) from center of region
			positionShape(e, ctx, params, params.width, params.height);
			
			if (!params.x && !params.y && !params.width && !params.height) {
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
			if (params.each !== NULL) {
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

/* Layers API */

// Get jCanvas layers
$.fn.getLayers = function() {
	var elem = this[0], layers;
	if (!elem || !elem.getContext) {
		layers = [];
	} else {
		layers = $.data(elem, 'jCanvas-layers');
		// Create layers array if non-existent
		if (!layers) {
			layers = [];
			$.data(elem, 'jCanvas-layers', layers);
		}
	}
	return layers;
};

// Get a single jCanvas layer
$.fn.getLayer = function(name) {
	var layers = this.getLayers(), i;
	if (typeof name === 'string') {
		for (i=0; i<layers.length; i+=1) {
			// Ensure layer's index is up-to-date
			layers[i].index = i;
			// Check if layer matches name
			if (layers[i].name === name) {
				name = i;
				break;
			}
		}
	}
	// layer name/index defaults to 0
	name = name || 0;
	return layers[name];
};

// Draw individual layer (internal)
function drawLayer($elem, ctx, layer) {
	if (layer && layer.visible) {
		if (layer.method === $.fn.draw) {
			// If layer is a function, call it
			layer.call($elem[0], ctx);
		} else if (layer.method) {
			// If layer is an object, call its respective method
			layer.method.call($elem, layer);
		}
	}
}

// Draw individual layer (jQuery method)
$.fn.drawLayer = function(name) {
	var $elems = this, e, ctx,
		$elem, layer;
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elem[0]);
		layer = $elem.getLayer(name);
		drawLayer($elem, ctx, layer);
	}
};

// Draw jCanvas layers
$.fn.drawLayers = function() {
	var $elems = this, $elem, e, ctx,
		layers, layer, i;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elem[0]);
		if (ctx) {
			
			// Clear canvas first
			ctx.clearRect(0, 0, $elem[0].width, $elem[0].height);
			// Get canvas layers
			layers = $elem.getLayers();
			// Draw layers from first to last (bottom to top)
			for (i=0; i<layers.length; i+=1) {
				layer = layers[i];
				drawLayer($elem, ctx, layer);
			}
		}
	}
	return $elems;
};

// Add a new jCanvas layer (internal)
function addLayer(elem, layer, method) {
	var $elem, layers, event, originalLayer;
	layer = layer || {};
	originalLayer = layer;
	
	// Only add layer if it hasn't been added before
	if (layer.layer && !layer._layer) {
		
		$elem = $(elem);
		layers = $elem.getLayers();
		
		// If layer is a function
		if (typeof layer === 'function') {
			// Clone function
			layer = function(ctx) {
				return originalLayer.call(this, ctx);
			};
			layer.method = $.fn.draw;
			// Ensure layer is visible unless otherwise specified
			if (layer.visible === UNDEFINED) {
				layer.visible = TRUE;
			}
		} else {
			// Ensure layers are unique across canvases
			layer = merge(new Prefs(), layer);
			layer.method = $.fn[layer.method] || method;
			// Ensure width/height of shapes (other than images) can be animated without specifying those properties initially
			if (layer.method !== $.fn.drawImage) {
				layer.width = layer.width || 0;
				layer.height = layer.height || 0;
			}
			// Check for any associated jCanvas events and enable them
			for (event in jCanvas.events) {
				if (jCanvas.events.hasOwnProperty(event) && layer[event]) {
					// Ensure canvas event is not bound more than once
					if (!$.data($elem[0], 'jCanvas-' + event)) {
						jCanvas.events[event].call(window, $elem);
					}
					layer._event = TRUE;
				}
			}
		}
		// Set layer properties and add to stack
		layer._layer = TRUE;
		layer.index = layers.length - 1;
		layers.push(layer);
	}
}

// Add jCanvas layer
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

// Remove all jCanvas layers
$.fn.removeLayers = function() {
	var $elems = this, layers, e;
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers();
		layers.length = 0;
	}
	return $elems;
};

// Remove a jCanvas layer
$.fn.removeLayer = function(name) {
	var $elems = this, e,
		layers, i;
	
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers();
		
		if (typeof name === 'string') {
		
			// Search layers array to find a matching name
			for (i=0; i<layers.length; i+=1) {
				// Check to see if name matches
				if (layers[i].name === name) {
					name = i;
					break;
				}
			}
			
		}
		
		// Remove layer from the layers array
		layers.splice(name, 1);
	}
};

// Define properties used in both CSS and jCanvas
cssProps = [
	'width',
	'height',
	'opacity'
];

// Hide/show jCanvas/CSS properties so they can be animated using jCanvas
function showProps(obj) {
	var i;
	for (i=0; i<cssProps.length; i+=1) {
		obj[cssProps[i]] = obj['_' + cssProps[i]];
	}
}
function hideProps(obj) {
	var i;
	for (i=0; i<cssProps.length; i+=1) {
		obj['_' + cssProps[i]] = obj[cssProps[i]];
	}
}

// Convert a color value to RGB
function toRgb(color) {
	var originalColor, elem,
		rgb = [],
		multiple = 1;
	
	// Deal with hexadecimal colors and color names
	if (color.match(/^#?[a-z0-9]+$/gi)) {
		elem = document.head;
		originalColor = elem.style.color;
		elem.style.color = color;
		color = $.css(elem, 'color');
		elem.style.color = originalColor;
	}
	// Parse RGB string
	if (color.match(/^rgb/gi)) {
		rgb = color.match(/[0-9]+/gi);
		// Deal with RGB percentages
		if (color.match(/%/gi)) {
			multiple = 2.55;
		}
		rgb[0] = rgb[0] * multiple;
		rgb[1] = rgb[1] * multiple;
		rgb[2] = rgb[2] * multiple;
	}
	return rgb;
}

// Animate a hex or RGB color
function animateColor(fx) {
	var i;
	if (typeof fx.start !== 'object') {
		fx.start = toRgb(fx.start);
		fx.end = toRgb(fx.end);
	}
	fx.now = [];
	// Calculate current frame for red, green, and blue
	for (i=0; i<3; i+=1) {
		fx.now[i] = round(fx.start[i] + (fx.end[i] - fx.start[i]) * fx.pos);
	}
	fx.now = 'rgb(' + fx.now.join(',') + ')';
	// Animate colors for both canvas layers and DOM elements
	if (fx.elem.style) {
		fx.elem.style[fx.prop] = fx.now;
	} else {
		fx.elem[fx.prop] = fx.now;
	}
}

// Animate jCanvas layer
$.fn.animateLayer = function() {
	var $elems = this, $elem, e, ctx,
		args = ([]).slice.call(arguments, 0),
		layer, eventCache;
		
	// Deal with all cases of argument placement
	
	if (typeof args[0] === 'object' && !args[0].layer) {
		// If layer name is omitted, Animate first layer by default
		args.unshift(0);
	}
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
	if (args[4] === UNDEFINED) {
		// If callback is ommitted
		args[4] = NULL;
	}

	// Run callback function when animation completes
	function complete($elem, layer) {
		return function() {
			showProps(layer);
			$elem.drawLayers();
			if (args[4]) {
				args[4].call($elem);
			}
		};
	}
	// Redraw layers on every frame of the animation
	function step($elem, layer) {
		return function() {
			showProps(layer);
			$elem.drawLayers();
		};
	}

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// If a layer object was passed, use it the layer to be animated
			if (args[0].layer) {
				layer = args[0];
			} else {
				layer = $elem.getLayer(args[0]);
			}
			// Ignore layers that are functions
			if (layer && layer.method !== $.fn.draw) {
				
				// Bypass jQuery CSS Hooks for CSS properties (width, opacity, etc.)
				hideProps(layer);
				hideProps(args[1]);
				
				// Reset event cache to prevent accidental queueing
				eventCache = getEventCache($elems[e]);
				eventCache.x = [];
				eventCache.y = [];
				
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

// Stop layer animation
$.fn.stopLayer = function(layer, clearQueue) {
	if (!layer.layer) {
		layer = $(this).getLayer(layer);
	}
	$(layer).stop(clearQueue);
	return this;
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
	'shadowColor',
]);

// Enable canvas feature detection with $.support
$.support.canvas = (document.createElement('canvas').getContext !== UNDEFINED);

// Export jCanvas functions
jCanvas.defaults = defaults;
jCanvas.prefs = prefs;
$.jCanvas = jCanvas;

}(jQuery, window, document, Image, Math, Function, parseFloat, true, false, null));