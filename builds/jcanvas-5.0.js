/*!
jCanvas v5.0
Copyright 2011, Caleb Evans
Licensed under the MIT license
*/

(function($, document, Math, Array, Image, parseFloat, parseInt, undefined) {

// Define local variables for better compression
var defaults, prefs,
	fn = $.fn,
	merge = $.extend,
	pi = Math.PI,
	round = Math.round,
	sin = Math.sin,
	cos = Math.cos,
	cssProps,
	colorProps;

// jCanvas function
function jCanvas(args) {
	if (!args) {
		// Reset to defaults if nothing is passed
		prefs = merge({}, defaults);
	} else {
		// Merge arguments with preferences
		prefs = merge({}, prefs, args);
	}
	return this;
}
// Set jCanvas default properties
defaults = {
	width: 0, height: 0,
	cornerRadius: 0,
	fillStyle: 'transparent',
	strokeStyle: 'transparent',
	strokeWidth: 1,
	strokeCap: 'butt',
	strokeJoin: 'miter',
	rounded: false,
	shadowX: 0, shadowY: 0,
	shadowBlur: 3,
	shadowColor: 'transparent',
	opacity: 1,
	compositing: 'source-over',
	x: 0, y: 0,
	x1: 0, y1: 0,
	scaleX: 1, scaleY: 1,
	start: 0, end: 360,
	ccw: false,
	inDegrees: true,
	fromCenter: true,
	closed: false,
	sides: 3,
	angle: 0,
	text: '',
	font: 'normal 12pt sans-serif',
	align: 'center',
	baseline: 'middle',
	source: '',
	repeat: 'repeat'
};
// Merge preferences with defaults
prefs = merge({}, defaults);

// Set global properties
function setGlobals(ctx, params) {
	ctx.fillStyle = params.fillStyle;
	ctx.strokeStyle = params.strokeStyle;
	ctx.lineWidth = params.strokeWidth;
	// Set rounded corners for paths
	if (params.rounded) {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	} else {
		ctx.lineCap = params.strokeCap;
		ctx.lineJoin = params.strokeJoin;
	}
	ctx.shadowOffsetX = params.shadowX;
	ctx.shadowOffsetY = params.shadowY;
	ctx.shadowBlur = params.shadowBlur;
	ctx.shadowColor = params.shadowColor;
	ctx.globalAlpha = params.opacity;
	ctx.globalCompositeOperation = params.compositing;
}

// Close path if chosen
function closePath(ctx, params) {
	// Mask if chosen
	if (params.mask) {
		ctx.save();
		ctx.clip();
	}
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

// Measure angles in chosen units
function convertAngles(params) {
	return params.inDegrees ? pi/180 : 1;
}

// Rotate individual shape
function positionShape(ctx, params, width, height) {
	
	params.toRad = convertAngles(params);
	ctx.save();
		
	// Always rotate from center
	if (!params.fromCenter) {
		params.x += width/2;
		params.y += height/2;
	}
	
	// Rotate only if specified
	if (params.angle) {
		ctx.translate(params.x, params.y);
		ctx.rotate(params.angle*params.toRad);
		ctx.translate(-params.x, -params.y);
	}
}

// Extend jCanvas
function extend(plugin) {

	// Merge properties with defaults
	plugin = plugin || {};
	defaults = merge(defaults, plugin.props || {});
	prefs = merge({}, defaults);

	// Create plugin
	if (plugin.name) {
		$.fn[plugin.name] = function(args) {
			var $elems = this, elem,
				ctx, e, params = merge({}, prefs, args);
			for (e=0; e<$elems.length; e+=1) {
				elem = $elems[e];
				if (!elem.getContext) {continue;}
				ctx = elem.getContext('2d');
				setGlobals(ctx, params);
				params.toRad = convertAngles(params);
				plugin.fn.call(elem, ctx, params);
			}
			return $elems;
		};
	}
	return $.fn[plugin.name];
}

// Make jCanvas function "chainable"
$.fn.jCanvas = jCanvas;

// Load canvas
$.fn.loadCanvas = function(ctx) {
	if (!this[0].getContext) {return null;}
	return this[0].getContext(ctx || '2d');
};

// Load canvas
$.fn.getCanvasImage = function(type) {
	if (!this[0].toDataURL) {return null;}
	if (type === undefined) {
		type = 'image/png';
	} else {
		type = type
			.replace(/^([a-z]+)$/gi, 'image/$1')
			.replace(/jpg/gi, 'jpeg');
	}
	return this[0].toDataURL(type);
};

// Draw on canvas manually
$.fn.draw = function(callback) {
	var $elems = this, e;
	for (e=0; e<$elems.length; e+=1) {
		if (!$elems[e].getContext) {continue;}
		callback.call($elems[e], $elems[e].getContext('2d'));
	}
	return this;
};

// Create gradient
$.fn.gradient = function(args) {
	if (!this[0].getContext) {return null;}
	var ctx = this[0].getContext('2d'),
		params = merge({}, prefs, args),
		gradient, percent,
		stops = 0,
		i = 1;
	
	// Create radial gradient if chosen
	if (params.r1 !== undefined || params.r2 !== undefined) {
		gradient = ctx.createRadialGradient(params.x1, params.y1, params.r1, params.x2, params.y2, params.r2);
	} else {
		gradient = ctx.createLinearGradient(params.x1, params.y1, params.x2, params.y2);
	}
	
	// Count number of color stops
	while (params['c' + i] !== undefined) {
		stops += 1;
		i += 1;
	}
		
	// Calculate color stop percentages if absent
	for (i=1; i<=stops; i+=1) {
		percent = round(100 / (stops-1) * (i-1)) / 100;
		if (params['s' + i] === undefined) {
			params['s' + i] = percent;
		}
		gradient.addColorStop(params['s' + i], params['c' + i]);
	}
	return gradient;
};

// Create pattern
$.fn.pattern = function(args) {
	if (!this[0].getContext) {return null;}
	var ctx = this[0].getContext('2d'),
		params = merge({}, prefs, args),
		img = new Image(),
		pattern;
	img.src = params.source;
	
	// Create pattern
	function create() {
		if (img.complete) {
			// Create pattern
			pattern = ctx.createPattern(img, params.repeat);
			return true;
		} else {
			return false;
		}
	}
	function onload() {
		create();
		// Run callback function
		if (params.load) {
			params.load.call(this[0], pattern);
		}
	}
	// Draw when image is loaded (if chosen)
	if (params.load) {
		img.onload = onload;
	} else {
		// Draw image if loaded
		if (!create()) {
			img.onload = onload;
		}
	}
	return pattern;
};

// Clear canvas
$.fn.clearCanvas = function(args) {
	var ctx, e, params = merge({}, prefs, args);

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');

		positionShape(ctx, params, params.width, params.height);
		
		// Clear entire canvas
		if (!params.width && !params.height) {
			ctx.clearRect(0, 0, this[e].width, this[e].height);
		} else {
			ctx.clearRect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
		}
	}
	return this;
};

// Save canvas
$.fn.saveCanvas = function() {
	var e;
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		this[e].getContext('2d').save();
	}
	return this;
};

// Restore canvas
$.fn.restoreCanvas = function() {
	var e;
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		this[e].getContext('2d').restore();
	}
	return this;
};

// Scale canvas
$.fn.scaleCanvas = function(args) {
	var ctx, e, params = merge({}, prefs, args);
		
	params.width = params.width || 1;
	params.height = params.height || 1;
		
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');

		ctx.save();
		ctx.translate(params.x, params.y);
		ctx.scale(params.scaleX, params.scaleY);
		ctx.translate(-params.x, -params.y);
	}
	return this;
};

// Translate canvas
$.fn.translateCanvas = function(args) {
	var ctx, e, params = merge({}, prefs, args);

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		ctx.save();
		ctx.translate(params.x, params.y);
	}
	return this;
};

// Rotate canvas
$.fn.rotateCanvas = function(args) {
	var ctx, e, params = merge({}, prefs, args);
	
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		positionShape(ctx, params, 0, 0);
	}
	return this;
};

// Draw rectangle
$.fn.drawRect = function(args) {
	var ctx, e, params = merge({}, prefs, args),
		x1, y1, x2, y2, r;

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		positionShape(ctx, params, params.width, params.height);
		ctx.beginPath();
		
		// Draw a rounded rectangle if chosen
		if (params.cornerRadius) {
			params.closed = true;
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
			ctx.arc(x2-r, y1+r, r, 3*pi/2, pi*2, false);
			ctx.lineTo(x2,y2-r);
			ctx.arc(x2-r, y2-r, r, 0, pi/2, false);
			ctx.lineTo(x1+r,y2);
			ctx.arc(x1+r, y2-r, r, pi/2, pi, false);
			ctx.lineTo(x1,y1+r);
			ctx.arc(x1+r, y1+r, r, pi, 3*pi/2, false);
		} else {
			ctx.rect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
		}
		ctx.restore();
		closePath(ctx, params);
	}
	return this;
};

// Draw arc
$.fn.drawArc = function(args) {
	var ctx, e, params = merge({}, prefs, args);
	
	// Change default end angle to radians if needed
	if (!params.inDegrees && params.end === 360) {
		params.end = pi * 2;
	}
		
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		positionShape(ctx, params, params.radius*2, params.radius*2);
		
		// Draw arc
		ctx.beginPath();
		ctx.arc(params.x, params.y, params.radius, (params.start*params.toRad)-(pi/2), (params.end*params.toRad)-(pi/2), params.ccw);
		// Close path if chosen
		ctx.restore();
		closePath(ctx, params);
	}
	return this;
};

// Draw ellipse
$.fn.drawEllipse = function(args) {
	var ctx, e, params = merge({}, prefs, args),
		controlW = params.width * 4/3;
		
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		positionShape(ctx, params, params.width, params.height);
		
		// Create ellipse
		ctx.beginPath();
		ctx.moveTo(params.x, params.y-params.height/2);
		// Left side
		ctx.bezierCurveTo(params.x-controlW/2, params.y-params.height/2, params.x-controlW/2, params.y+params.height/2, params.x, params.y+params.height/2);
		// Right side
		ctx.bezierCurveTo(params.x+controlW/2, params.y+params.height/2, params.x+controlW/2, params.y-params.height/2, params.x, params.y-params.height/2);
		ctx.restore();
		closePath(ctx, params);
	}
	return this;
};

// Draw line
$.fn.drawLine = function(args) {
	var ctx, e, params = merge({}, prefs, args),
		l = 2, lx=0, ly=0;

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		
		// Draw each point
		ctx.beginPath();
		ctx.moveTo(params.x1, params.y1);
		while (lx !== undefined && ly !== undefined) {
			lx = params['x' + l];
			ly = params['y' + l];
			ctx.lineTo(lx, ly);
			l += 1;
		}
		// Close path if chosen
		closePath(ctx, params);
	}
	return this;
};

// Draw quadratic curve
$.fn.drawQuad = function(args) {
	var ctx, e, params = merge({}, prefs, args),
		l = 2,
		lx=0, ly=0,
		lcx=0, lcy=0;

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
			
		// Draw each point
		ctx.beginPath();
		ctx.moveTo(params.x1, params.y1);
		while (lx !== undefined && ly !== undefined && lcx !== undefined && lcy !== undefined) {
			lx = params['x' + l];
			ly = params['y' + l];
			lcx = params['cx' + (l-1)];
			lcy = params['cy' + (l-1)];
			ctx.quadraticCurveTo(lcx, lcy, lx, ly);
			l += 1;
		}
		// Close path if chosen
		closePath(ctx, params);
	}
	return this;
};

// Draw Bezier curve
$.fn.drawBezier = function(args) {
	var ctx, e, params = merge({}, prefs, args),
		l = 2, lc = 1,
		lx=0, ly=0,
		lcx1=0, lcy1=0,
		lcx2=0, lcy2=0;

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
	
		// Draw each point
		ctx.beginPath();
		ctx.moveTo(params.x1, params.y1);
		while (lx !== undefined && ly !== undefined && lcx1 !== undefined && lcy1 !== undefined && lcx2 !== undefined && lcy2 !== undefined) {
			lx = params['x' + l];
			ly = params['y' + l];
			lcx1 = params['cx' + lc];
			lcy1 = params['cy' + lc];
			lcx2 = params['cx' + (lc+1)];
			lcy2 = params['cy' + (lc+1)];
			ctx.bezierCurveTo(lcx1, lcy1, lcx2, lcy2, lx, ly);
			l += 1;
			lc += 2;
		}
		// Close path if chosen
		closePath(ctx, params);
	}
	return this;
};

// Draw text
$.fn.drawText = function(args) {
	var ctx, e, params = merge({}, prefs, args);

	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
	
		// Set text-specific properties
		ctx.textBaseline = params.baseline;
		ctx.textAlign = params.align;
		ctx.font = params.font;
		
		ctx.strokeText(params.text, params.x, params.y);
		ctx.fillText(params.text, params.x, params.y);
	}
	return this;
};

// Draw image
$.fn.drawImage = function(args) {
	var ctx, elem, e, params = merge({}, prefs, args),
		// Define image source
		img = new Image(),
		scaleFac;
	img.src = params.source;

	// Draw image function
	function draw(ctx) {
		if (img.complete) {
			scaleFac = (img.width / img.height);
			
			// Crop image
			if (params.sx === undefined) {
				params.sx = img.width / 2;
			}
			if (params.sy === undefined) {
				params.sy = img.height / 2;
			}
			params.sWidth = params.sWidth || img.width;
			params.sHeight = params.sHeight || img.height;
			
			// If only width is present
			if (params.width && !params.height) {
				params.height = params.width / scaleFac;
			// If only height is present
			} else if (!params.width && params.height) {
				params.width = params.height * scaleFac;
			// If width and height are both absent
			} else if (!params.width && !params.height) {
				params.width = img.width;
				params.height = img.height;
			}
			
			// Draw image
			positionShape(ctx, params, params.width, params.height);
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
			ctx.restore();
			return true;
		} else {
			return false;
		}
	}
	// On load function
	function onload() {
		draw(ctx);
		// Run callback function
		if (params.load) {
			params.load.call(elem);
		}
	}
	// Draw image if already loaded
	for (e=0; e<this.length; e+=1) {
		elem = this[e];
		if (!elem.getContext) {continue;}
		ctx = elem.getContext('2d');
		setGlobals(ctx, params);
		
		// Draw when image is loaded (if chosen)
		if (params.load) {
			img.onload = onload;
		} else {
			// Draw image if loaded
			if (!draw(ctx)) {
				img.onload = onload;
			}
		}
	}
	return this;
};

// Draw polygon
$.fn.drawPolygon = function(args) {
	var ctx, e, params = merge({}, prefs, args),
		inner = pi / params.sides,
		theta = (pi/2) + inner,
		dtheta = (pi*2) / params.sides,
		apothem = cos(dtheta/2) * params.radius,
		x1, y1, x2, y2, i;
	params.closed = true;
	
	if (params.sides > 2) {
	for (e=0; e<this.length; e+=1) {
		if (!this[e].getContext) {continue;}
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		
		// Calculate points and draw
		positionShape(ctx, params, params.radius, params.radius);
		ctx.beginPath();
		for (i=0; i<params.sides; i+=1) {
			x1 = params.x + round(params.radius * cos(theta));
			y1 = params.y + round(params.radius * sin(theta));
			// Draw path
			if (i === 0) {
				ctx.moveTo(x1, y1);
			} else {
				ctx.lineTo(x1, y1);
			}
			// Project sides if chosen
			if (params.projection) {
				x2 = params.x + round((apothem+apothem*params.projection) * cos(theta+inner));
				y2 = params.y + round((apothem+apothem*params.projection) * sin(theta+inner));
				ctx.lineTo(x2, y2);
			}
			theta += dtheta;
		}
		ctx.restore();
		closePath(ctx, params);
	}
	}
	return this;
};

// Get pixels on the canvas
$.fn.setPixels = function(args) {
	var ctx, elem, e, i,
		params = merge({}, prefs, args),
		imgData, data, len, px;
	
	for (e=0; e<this.length; e+=1) {
			elem = this[e];
			if (!elem.getContext) {continue;}
			ctx = elem.getContext('2d');
			// Measure from center
			if (!params.x && !params.y && !params.width && !params.height) {
				params.width = elem.width;
				params.height = elem.height;
				params.x = params.width/2;
				params.y = params.height/2;
			}
			positionShape(ctx, params, params.width, params.height);
			imgData = ctx.getImageData(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			data = imgData.data;
			len = data.length;
			px = [];
			
			// Loop through pixels with "each" method
			if (params.each !== undefined) {
				for (i=0; i<len; i+=4) {
					px = params.each.call(elem, data[i], data[i+1], data[i+2], data[i+3]);
					data[i] = px[0];
					data[i+1] = px[1];
					data[i+2] = px[2];
					data[i+3] = px[3];
				}
			}
			// Put pixels on canvas
			ctx.putImageData(imgData, params.x-params.width/2, params.y-params.height/2);
			ctx.restore();
	}
	return this;
};

// Show object properties
function showProps(props, obj) {
	var i;
	for (i=0; i<props.length; i+=1) {
		obj[props[i]] = obj['_' + props[i]];
	}
}

// Hide object properties
function hideProps(props, obj) {
	var i;
	for (i=0; i<props.length; i+=1) {
		obj['_' + props[i]] = obj[props[i]];
	}
}

cssProps = [
	'width',
	'height',
	'opacity'
];
colorProps = [
	'backgroundColor',
	'color',
	'borderColor',
	'borderTopColor',
	'borderRightColor',
	'borderBottomColor',
	'borderLeftColor',
	'fillStyle',
	'strokeStyle',
	'shadowColor'
];

// Convert a color value to RGBA
function toRgba(color) {
	var original, elem,
		rgb = [],
		multiple = 1;
	
	// If color is array already
	if (typeof color === 'object') {
		rgb = color;
	} else {
		
		// Deal with color names
		if (color.match(/^[a-z]+$/gi)) {
			// Deal with complete transparency
			if (color === 'transparent') {
				color = 'rgba(255, 255, 255, 0)';
			}
			elem = document.documentElement;
			original = elem.style.color;
			elem.style.color = color;
			color = $.css(elem, 'color');
			elem.style.color = original;
		}
		// Deal with hexadecimal
		if (color.match(/^\#/gi)) {
			// Deal with shorthand hex
			if (color.length === 4) {
				color = color.replace(/(\w)/gi, '$1$1')
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
			rgb[0] = parseFloat(rgb[0]) * multiple;
			rgb[1] = parseFloat(rgb[1]) * multiple;
			rgb[2] = parseFloat(rgb[2]) * multiple;
		}
		// Add alpha
		if (color.indexOf('rgba') !== -1) {
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
	// Don't round opacity
	if (i < 3) {fx.now[i] = round(fx.now[i]);}
}

// Animate a hex or RGB color
function animateColor(fx) {
	if (fx.pos === 0) {
		fx.start = toRgba(fx.start),
		fx.end = toRgba(fx.end);
	}
	fx.now = [];
	getFrame(fx, 0);
	getFrame(fx, 1);
	getFrame(fx, 2);
	getFrame(fx, 3);
	fx.now = 'rgba(' + fx.now.join(',') + ')';
	if (fx.elem.style) {
		fx.elem.style[fx.prop] = fx.now;
	} else {
		fx.elem[fx.prop] = fx.now;
	}
};

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
	if (!elem || !elem.getContext) {return [];}
	layers = $.data(elem, 'layers');
	// Create layers array if none exists
	if (layers === undefined) {
		layers = [];
		$.data(elem, 'layers', layers);
	}
	return layers;
};

// Get a single jCanvas layer
$.fn.getLayer = function(index) {
	index = index || 0;
	return this.getLayers()[index];
};

// Add a new jCanvas layer
$.fn.addLayer = function(args) {
	var $elems = this, $elem, layers, img, e;
	args = merge(args, prefs, $.extend({}, args));
	// Use the "fn" property if specified (for compatibility)
	args.method = args.fn || args.method;
	
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		if (!$elems[e].getContext) {continue;}
		layers = $elem.getLayers();
		// If layer is a function
		if (typeof args === 'function') {
			args.method = 'draw';
		}
		layers.push(args);
	}
	return $elems;
};

// Remove a jCanvas layer
$.fn.removeLayer = function(index) {
	index = index || 0;
	this.getLayers().splice(index, 1);
	return this;
};

// Draw jCanvas layers
$.fn.drawLayers = function() {
	var $elems = this, $elem,
		ctx, params, layers, e, i;
	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		if (!$elem[0].getContext) {continue;}
		ctx = $elem[0].getContext('2d');
		layers = $elem.getLayers();
		// Clear canvas first
		ctx.clearRect(0, 0, $elem[0].width, $elem[0].height);
		// Draw items on queue
		for (i=0; i<layers.length; i+=1) {
			params = layers[i];
			// If layer is a function
			if (params.method === 'draw') {
				params.call($elem[0], ctx);
			// If layer is an object
			} else {
				if (fn[params.method]) {
					fn[params.method].call($elem, params);
				}
			}
		}
	}
	return $elems;
};

// Animate jCanvas layer
$.fn.animateLayer = function() {
	// Setup
	var $elems = this,
		args = Array.prototype.slice.call(arguments, 0),
		$elem, layers, layer, e;
	
	// Deal with all cases of argument placement
	
	// If index is ommitted
	if (typeof args[0] === 'object') {
		args.unshift(0);
	}
	// If object is the last argument
	if (args[2] === undefined) {
		args.splice(2, 0, null);
		args.splice(3, 0, null);
		args.splice(4, 0, function() {});
	// If callback comes after object
	} else if (typeof args[2] === 'function') {
		args.splice(2, 0, null);
		args.splice(3, 0, null);
	}
	// If duration is the last argument
	if (args[3] === undefined) {
		args[3] = null;
		args.splice(4, 0, function() {});
	// If callback comes after duration
	} else if (typeof args[3] === 'function') {
		args.splice(3, 0, null);
	}
	// If callback is ommitted
	if (args[4] === undefined) {
		args[4] = function() {}
	}

	for (e=0; e<$elems.length; e+=1) {
		$elem = $($elems[e]);
		layers = $elem.getLayers();
		layer = layers[args[0]];
		// Merge properties so any property can be animated
		if (!layer || layer.method === 'draw') {
			continue;
		}
		layer = merge(layer, prefs, $.extend({}, layer));
		// Allow jQuery to animate CSS properties of regular objects
		hideProps(cssProps, layer);
		hideProps(cssProps, args[1]);
		// Animate layer
		$(layer).animate(args[1], {
			duration: args[2],
			easing: ($.easing[args[3]] ? args[3] : null),
			// When animation completes
			complete: (function($elem) {
				return function() {
					showProps(cssProps, layer);
					$elem.drawLayers(true);
					args[4].call($elem[0]);
				};
			}($elem)),
			// Redraw for every frame
			step: (function($elem, layer) {
				return function() {
					showProps(cssProps, layer);
					$elem.drawLayers(true);
				};
			}($elem, layer))
		});
	}
	return $elems;
};

// Enable animation for color properties
supportColorProps(colorProps);

// Export jCanvas functions
jCanvas.defaults = defaults;
jCanvas.prefs = prefs;
jCanvas.extend = extend;
$.jCanvas = jCanvas;

}(jQuery, document, Math, Array, Image, parseFloat, parseInt));