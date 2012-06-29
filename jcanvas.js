/** @license jCanvas v5.5
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
		jCanvas.prefs = prefs = Prefs.prototype = merge({}, defaults);
	}
	return this;
}
// Make jCanvas function "chainable"
$.fn.jCanvas = jCanvas;

jCanvas.version = '5.5';
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
	// Mask shape/path if chosen
	if (params.mask) {
		if (params.autosave) {ctx.save();}
		ctx.clip();
	}
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
	if (!params.closed) {
		ctx.closePath();
	}
}

// Translate canvas (internal)
function translateCanvas(ctx, params) {

	/* Compatibility check: START */
	// Maintain compatibility for 'x' and 'y' properties
	if ((!params.translateX && !params.translateY) && (params.x || params.y)) {
		params.translateX = params.x;
		params.translateY = params.y;
	}
	/* Compatibility check: END */
	
	// Translate both the x- and y-axis using the 'translate' property
	if (params.translate) {
		params.translateX = params.translateY = params.translate;
	}
	// Translate shape
	ctx.translate(params.translateX, params.translateY);
}

// Scale canvas (internal)
function scaleCanvas(ctx, params) {
	// Scale both the x- and y- axis using the 'scale' property
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
	
	/* Compatibility fix: START */
	// Maintain compatibility for 'angle' property
	params.rotate = params.rotate || params.angle;
	/* Compatibility fix: END */

	ctx.translate(params.x, params.y);
	ctx.rotate(params.rotate*params.toRad);
	ctx.translate(-params.x, -params.y);
}

// Rotate/scale individual shape and/or position it correctly
function transformShape(e, ctx, params, width, height) {
	
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

/* Plugin API */

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

// Draw on canvas using a function
$.fn.draw = function self(args) {
	var $elems = this, e, ctx, params;
	
	// Convert single function argument to object
	if (args && !args.fn) {
		args = {fn: args};
	}
	params = merge(new Prefs(), args);
	
	for (e=0; e<$elems.length; e+=1) {
		ctx = getContext($elems[e]);
		if (ctx) {
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
			
			transformShape(e, ctx, params, params.width, params.height);
			
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

/* Transformation API */

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
			
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			transformShape(e, ctx, params, params.radius*2);
	
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
function measureText(elem, ctx, params) {
	var originalSize, sizeMatch,
		sizeExp = /\b(\d*\.?\d*)\w\w\b/gi;
	
	// Used cached width/height if possible
	if (cache.text === params.text && cache.font === params.font) {
		
		params.width = cache.width;
		params.height = cache.height;
		
	} else {
		
		// Calculate text width
		params.width = ctx.measureText(params.text).width;
		
		// Save original font size
		originalSize = elem.style.fontSize;
		// Get specified font size
		sizeMatch = params.font.match(sizeExp);
		if (sizeMatch) {
			elem.style.fontSize = params.font.match(sizeExp)[0];
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
		ctx = getContext($elems[e]);
		if (ctx) {
			
			addLayer($elems[e], args, self);
			setGlobalProps(ctx, params);
			
			// Set text-specific properties
			ctx.textBaseline = params.baseline;
			ctx.textAlign = params.align;
			ctx.font = params.font;
			
			// Retrieve text's width and height
			measureText($elems[e], ctx, params);
			transformShape(e, ctx, params, params.width, params.height);
			
			ctx.fillText(params.text, params.x, params.y);
			// Prevent extra shadow created by stroke (but only when fill is present)
			if (params.fillStyle !== 'transparent') {
				ctx.shadowColor = 'transparent';
			}
			ctx.strokeText(params.text, params.x, params.y);
			
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
	
		// Only calculate image width/height once
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
					// Image onload fix for IE9
					img.src = img.src;
				}
			}
				
		}
	}
	return $elems;
};

// Create canvas pattern
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

// Get canvas image as data URL
$.fn.getCanvasImage = function(type, quality) {
	var elem = this[0];
	return (elem && elem.toDataURL) ?
		elem.toDataURL('image/' + type, quality) :
		NULL;
};

/* Layer API: START */

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
$.fn.getLayer = function(id) {
	var layers = this.getLayers(), layer, l;
	
	if (id && id.layer) {
		// Return the layer if passed into the method
		layer = id;
	} else {
		if (typeof id === 'string') {
			for (l=0; l<layers.length; l+=1) {
				// Check if layer matches name
				if (layers[l].name === id) {
					id = l;
					break;
				}
			}
		}
		// layer index defaults to 0
		id = id || 0;
		layer = layers[id];
	}
	return layer;
};

// Set properties of a layer
$.fn.setLayer = function(id, props) {
	var $elems = this, e,
		layers, l;
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers();
		
		if (typeof id === 'string') {
			for (l=0; l<layers.length; l+=1) {
				if (layers[l].name === id) {
					id = l;
				}
			}
		}
		id = id || 0;
		// Merge properties with layer
		merge(layers[id], props);
		
	}
	return $elems;
};

// Get all layers in the given group
$.fn.getLayerGroup = function(name) {
	var layers = this.getLayers(),
		group = [], l;
	
	for (l=0; l<layers.length; l+=1) {
		// Include layer if apart of group
		if (layers[l].group === name) {
			group.push(layers[l]);
		}
	}
	return group;
};

// Set properties of all layers in the given group
$.fn.setLayerGroup = function(name, props) {
	var $elems = this, e,
		layers, l;
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers();
		
		// Find layers in group
		for (l=0; l<layers.length; l+=1) {
			if (layers[l].group === name) {
				// Merge properties with layer
				merge(layers[l], props);
			}
		}
		
	}
	return $elems;
};

// Remove all layers within a specific group
$.fn.removeLayerGroup = function(name) {
	var $elems = this, e,
		layers, l;
	
	for (e=0; e<$elems.length; e+=1) {
		// Get layers array for each element
		layers = $($elems[e]).getLayers();
	
		// Loop through layers array for each element
		for (l=0; l<layers.length; l+=1) {
			// Remove layer if group name matches
			if (layers[l].group === name) {
				layers.splice(l, 1);
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
		layers, layer, l;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// Clear canvas first
			ctx.clearRect(0, 0, $elems[e].width, $elems[e].height);
			// Get canvas layers
			layers = $elem.getLayers();
			// Draw layers from first to last (bottom to top)
			for (l=0; l<layers.length; l+=1) {
				layer = layers[l];

				// Prevent any one event from firing excessively
				if (resetFire) {
					layer._fired = FALSE;
				}
				
				drawLayer($elem, ctx, layer);
			}
		}
	}
	return $elems;
};

// Add a jCanvas layer (internal)
function addLayer(elem, layer, method) {
	var $elem, layers, event, layerFn,
		isFn = (typeof layer === 'function');
	layer = layer || {};
	
	// Only add layer if it hasn't been added before
	if (layer.layer && !layer._layer) {
		
		$elem = $(elem);
		layers = $elem.getLayers();
		
		// If layer is a function
		if (isFn) {
			layerFn = layer;
			// Wrap function within object
			layer = {
				method: $.fn.draw,
				fn: layerFn,
				name: layerFn.name,
				group: layerFn.group,
				visible: layerFn.visible
			};
		}
		
		// Ensure layers are unique across canvases by cloning them
		layer = merge(new Prefs(), layer);
		
		// If layer is a regular object
		if (!isFn) {
			layer.method = $.fn[layer.method] || method;
			// Check for any associated jCanvas events and enable them
			for (event in jCanvas.events) {
				if (jCanvas.events.hasOwnProperty(event) && layer[event]) {
					// Ensure canvas event is not bound more than once
					if (!$.data(elem, 'jCanvas-' + event)) {
						jCanvas.events[event]($elem);
					}
					layer._event = TRUE;
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
$.fn.removeLayer = function(id) {
	var $elems = this, e,
		layers, i;
	
	for (e=0; e<$elems.length; e+=1) {
		layers = $($elems[e]).getLayers();
		// Search layers array if layer name is given
		if (typeof id === 'string') {
		
			// Search layers array to find a matching name
			for (i=0; i<layers.length; i+=1) {
				// Check to see if name matches
				if (layers[i].name === id) {
					id = i;
					break;
				}
			}
			
		}
		// Remove layer from the layers array
		layers.splice(id, 1);
	}
	return $elems;
};

/* Animation API: START */

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
	if (color.match(/^#?[a-z0-9]+$/i)) {
		elem = document.head;
		originalColor = elem.style.color;
		elem.style.color = color;
		color = $.css(elem, 'color');
		elem.style.color = originalColor;
	}
	// Parse RGB string
	if (color.match(/^rgb/i)) {
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
				args[4].call($elem[0]);
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
				args[5].call($elem[0], now, fx);
			}
		};
	}

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		ctx = getContext($elems[e]);
		if (ctx) {
			
			// If a layer object was passed, use it the layer to be animated
			layer = $elem.getLayer(args[0]);
			
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

// Delay layer animation by a given number of milliseconds
$.fn.delayLayer = function(name, duration) {
	var $elems = this, e, layer;
	duration = duration || 0;
	
	for (e=0; e<$elems.length; e+=1) {
		layer = $($elems[e]).getLayer(name);
		$(layer).delay(duration);
	}
	return $elems;
};

// Stop layer animation
$.fn.stopLayer = function(name, clearQueue) {
	var $elems = this, e, layer;
	for (e=0; e<$elems.length; e+=1) {
		layer = $($elems[e]).getLayer(name);
		$(layer).stop(clearQueue);
	}
	return $elems;
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

/* Animation API: END */

/* Event API: START */

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
	
		// Both mouseover/mouseout events will be managed by a single mousemove event
		var helperEventName = (name === 'mouseover' || name === 'mouseout') ? 'mousemove' : name,
			// Retrieve or create canvas's event cache
			eventCache = getEventCache($elem[0]);
		
		// Bind one canvas event which handles all layer events of that type
		$elem.bind(helperEventName + '.jCanvas', function(event) {
			// Cache current mouse position and redraw layers
			eventCache.x[1] = eventCache.x[0];
			eventCache.y[1] = eventCache.y[0];
			eventCache.x[0] = event.offsetX;
			eventCache.y[0] = event.offsetY;
			eventCache.type = helperEventName;
			$elem.drawLayers(TRUE);
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

// Check if event fires when a drawing is drawn
function checkEvents(elem, ctx, layer) {
	var eventCache = $.data(elem, 'eventCache'),
		callback, over, out;
	callback = layer[eventCache.type];
	over = ctx.isPointInPath(eventCache.x[0], eventCache.y[0]);
	out = ctx.isPointInPath(eventCache.x[1], eventCache.y[1]);
	
	// Allow callback functions to retrieve the mouse coordinates
	layer.mouseX = eventCache.x[0];
	layer.mouseY = eventCache.y[0];
	
	// Detect mouseover/mouseout events
	if (layer.mouseover || layer.mouseout) {
				
		// Mouseover
		if (over && !out && !layer._hovered && !layer._fired) {
			layer._fired = TRUE;
			layer._hovered = TRUE;
			if (layer.mouseover) {
				layer.mouseover.call(elem, layer);
				setGlobalProps(ctx, layer);
			}
		// Mouseout
		} else if (!over && layer._hovered && !layer._fired) {
			layer._fired = TRUE;
			layer._hovered = FALSE;
			if (layer.mouseout) {
				layer.mouseout.call(elem, layer);
				setGlobalProps(ctx, layer);
			}
		}
		
	}

	// Detect any other mouse event
	if (callback && over && !layer._fired) {
		callback.call(elem, layer);
		setGlobalProps(ctx, layer);
		layer._fired = TRUE;
	}
}

/* Event API: END */

/* Layer API: END */

// Normalize offsetX and offsetY for all browsers
$.event.fix = function(event) {
	var offset;
	event = originalEventFix.call($.event, event);
	
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

// Enable canvas feature detection with $.support
$.support.canvas = (document.createElement('canvas').getContext !== UNDEFINED);

// Export jCanvas functions
jCanvas.defaults = defaults;
$.jCanvas = jCanvas;

}(jQuery, document, Image, Math, parseFloat, true, false, null));