/*!
jCanvas v4.1
Copyright 2011, Caleb Evans
Licensed under the MIT license
http://bit.ly/nMsxhR
*/
(function($, document, Math, Image, undefined) {

// Define local variables for better compression
var defaults, prefs, layers,
	fn = $.fn,
	extend = $.extend,
	fix = $.event.fix,
	pi = Math.PI,
	round = Math.round,
	sin = Math.sin,
	cos = Math.cos;

// jCanvas function
function jC(args, setDefaults) {
	if (!args) {
		// Reset to defaults if nothing is passed
		prefs = extend({}, defaults);
	} else if (setDefaults) {
		// Merge arguments with defaults
		defaults = extend({}, defaults, args);
		prefs = extend({}, defaults);
	} else {
		// Merge arguments with preferences
		prefs = extend({}, prefs, args);
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
	mask: false,
	x: 0, y: 0,
	x1: 0, y1: 0,
	x2: 0, y2: 0,
	radius: 0,
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
// Merge defaults with preferences
prefs = extend({}, defaults);

// Set global properties
function setGlobals(ctx, params) {
	ctx.fillStyle = params.fillStyle;
	ctx.strokeStyle = params.strokeStyle;
	ctx.lineWidth = params.strokeWidth;
	ctx.lineCap = params.strokeCap;
	ctx.lineJoin = params.strokeJoin;
	// Set rounded corners for paths
	if (params.rounded) {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
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
function rotate(ctx, params, width, height) {
	
	var toRad = convertAngles(params);
	ctx.save();
		
	// Always rotate from center
	if (!params.fromCenter) {
		params.x += width/2;
		params.y += height/2;
	}
	
	// Rotate only if needed
	if (params.angle) {
		ctx.translate(params.x, params.y);
		ctx.rotate(params.angle*toRad);
		ctx.translate(-params.x, -params.y);
	}
	return toRad;
}

// Make jCanvas function "chainable"
fn.jCanvas = jC;

// Load canvas
fn.loadCanvas = function(ctx) {
	return this[0].getContext(ctx || '2d');
};

// Draw on canvas manually
fn.draw = function(callback) {
	var $elems = this, e;
	for (e=0; e<$elems.length; e+=1) {
		callback.call($elems[e], $elems[e].getContext('2d'));
	}
	return this;
};

// Create gradient
fn.gradient = function(args) {
	var ctx = this[0].getContext('2d'),
		params = extend({}, prefs, args),
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
fn.pattern = function(args) {
	var ctx = this[0].getContext('2d'),
		params = extend({}, prefs, args),
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
fn.clearCanvas = function(args) {
	var ctx, e,
		params = extend({}, prefs, args);

	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');

		rotate(ctx, params, params.width, params.height);
		
		// Clear entire canvas
		if (!args) {
			ctx.clearRect(0, 0, this[e].width, this[e].height);
		} else {
			ctx.clearRect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
		}
	}
	return this;
};

// Save canvas
fn.saveCanvas = function() {
	for (var e=0; e<this.length; e+=1) {
		this[e].getContext('2d').save();
	}
	return this;
};

// Restore canvas
fn.restoreCanvas = function() {
	for (var e=0; e<this.length; e+=1) {
		this[e].getContext('2d').restore();
	}
	return this;
};

// Scale canvas
fn.scaleCanvas = function(args) {
	var ctx, e,
		params = extend({}, prefs, args);
		
	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');

		ctx.save();
		ctx.translate(params.x, params.y);
		ctx.scale(params.width, params.height);
		ctx.translate(-params.x, -params.y);
	}
	return this;
};

// Translate canvas
fn.translateCanvas = function(args) {
	var ctx, e,
		params = extend({}, prefs, args);

	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		ctx.save();
		ctx.translate(params.x, params.y);
	}
	return this;
};

// Rotate canvas
fn.rotateCanvas = function(args) {
	var ctx, e,
		params = extend({}, prefs, args);
	
	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		rotate(ctx, params, 0, 0);
	}
	return this;
};

// Draw rectangle
fn.drawRect = function(args) {
	var ctx, e,
		params = extend({}, prefs, args),
		x1, y1, x2, y2, r;

	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		rotate(ctx, params, params.width, params.height);
			
		// Draw a rounded rectangle if chosen
		if (params.cornerRadius) {
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
			ctx.beginPath();
			ctx.moveTo(x1+r,y1);
			ctx.lineTo(x2-r,y1);
			ctx.arc(x2-r, y1+r, r, 3*pi/2, pi*2);
			ctx.lineTo(x2,y2-r);
			ctx.arc(x2-r, y2-r, r, 0, pi/2);
			ctx.lineTo(x1+r,y2);
			ctx.arc(x1+r, y2-r, r, pi/2, pi);
			ctx.lineTo(x1,y1+r);
			ctx.arc(x1+r, y1+r, r, pi, 3*pi/2);
		} else {
			ctx.beginPath();
			ctx.rect(params.x-params.width/2, params.y-params.height/2, params.width, params.height);
			ctx.restore();
		}
		closePath(ctx, params);
	}
	return this;
};

// Draw arc
fn.drawArc = function(args) {
	var ctx, e, toRad,
		params = extend({}, prefs, args);
	
	// Change default end angle to radians if needed
	if (!params.inDegrees && params.end === 360) {
		params.end = pi * 2;
	}
		
	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		toRad = rotate(ctx, params, params.radius, params.radius);
		
		// Draw arc
		ctx.beginPath();
		ctx.arc(params.x, params.y, params.radius, (params.start*toRad)-(pi/2), (params.end*toRad)-(pi/2), params.ccw);
		// Close path if chosen
		ctx.restore();
		closePath(ctx, params);
	}
	return this;
};

// Draw ellipse
fn.drawEllipse = function(args) {
	var ctx, e,
		params = extend({}, prefs, args),
		controlW = params.width * (4/3);
		
	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		rotate(ctx, params, params.width, params.height);
		
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
fn.drawLine = function(args) {
	var ctx, e,
		params = extend({}, prefs, args),
		l = 2, lx, ly;

	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		
		// Draw each point
		ctx.beginPath();
		ctx.moveTo(params.x1, params.y1);
		while (1) {
			lx = params['x' + l];
			ly = params['y' + l];
			if (lx !== undefined && ly !== undefined) {
				ctx.lineTo(lx, ly);
			} else {
				break;
			}
			l += 1;
		}
		// Close path if chosen
		closePath(ctx, params);
	}
	return this;
};

// Draw quadratic curve
fn.drawQuad = function(args) {
	var ctx, e,
		params = extend({}, prefs, args),
		l = 2,
		lx, ly,
		lcx, lcy;

	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
			
		// Draw each point
		ctx.beginPath();
		ctx.moveTo(params.x1, params.y1);
		while (1) {
			lx = params['x' + l];
			ly = params['y' + l];
			lcx = params['cx' + (l-1)];
			lcy = params['cy' + (l-1)];
			if (lx !== undefined && ly !== undefined && lcx !== undefined && lcy !== undefined) {
				ctx.quadraticCurveTo(lcx, lcy, lx, ly);
			} else {
				break;
			}
			l += 1;
		}
		// Close path if chosen
		closePath(ctx, params);
	}
	return this;
};

// Draw Bezier curve
fn.drawBezier = function(args) {
	var ctx, e,
		params = extend({}, prefs, args),
		l = 2, lc = 1,
		lx, ly,
		lcx1, lcy1,
		lcx2, lcy2;

	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
	
		// Draw each point
		ctx.beginPath();
		ctx.moveTo(params.x1, params.y1);
		while (1) {
			lx = params['x' + l];
			ly = params['y' + l];
			lcx1 = params['cx' + lc];
			lcy1 = params['cy' + lc];
			lcx2 = params['cx' + (lc+1)];
			lcy2 = params['cy' + (lc+1)];
			if (lx !== undefined && ly !== undefined && lcx1 !== undefined && lcy1 !== undefined && lcx2 !== undefined && lcy2 !== undefined) {
				ctx.bezierCurveTo(lcx1, lcy1, lcx2, lcy2, lx, ly);
			} else {
				break;
			}
			l += 1;
			lc += 2;
		}
		// Close path if chosen
		closePath(ctx, params);
	}
	return this;
};

// Draw text
fn.drawText = function(args) {
	var ctx, e,
		params = extend({}, prefs, args);

	for (e=0; e<this.length; e+=1) {
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
fn.drawImage = function(args) {
	var ctx, elem, e,
		params = extend({}, prefs, args),
		// Define image source
		img = new Image(),
		scaleFac;
	img.src = params.source;

	// Draw image function
	function draw(ctx) {
		if (img.complete) {
			scaleFac = img.width / img.height;
			
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
			rotate(ctx, params, params.width, params.height);
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
fn.drawPolygon = function(args) {
	var ctx, e,
		params = extend({}, prefs, args),
		inner = pi / params.sides,
		theta = (pi/2) + inner,
		dtheta = (pi*2) / params.sides,
		apothem = cos(dtheta/2) * params.radius,
		x1, y1, x2, y2, i;
	params.closed = true;
	
	if (params.sides > 2) {
	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		setGlobals(ctx, params);
		
		// Calculate points and draw
		rotate(ctx, params, params.radius, params.radius);
		ctx.beginPath();
		for (i=0; i<params.sides; i+=1) {
			x1 = params.x + (params.radius * cos(theta));
			y1 = params.y + (params.radius * sin(theta));
			x2 = params.x + ((apothem+apothem*params.projection) * cos(theta+inner));
			y2 = params.y + ((apothem+apothem*params.projection) * sin(theta+inner));
			// Draw path
			if (i === 0) {
				ctx.moveTo(x1, y1);
			} else {
				ctx.lineTo(x1, y1);
			}
			// Project sides if chosen
			if (params.projection) {
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
fn.setPixels = function(args) {
	var ctx, elem, e, i,
		params = extend({}, prefs, args),
		imgData, data, len, px;
	
	for (e=0; e<this.length; e+=1) {
			elem = this[e];
			ctx = elem.getContext('2d');
			// Measure from center
			if (!params.x && !params.y && !params.width && !params.height) {
				params.width = elem.width;
				params.height = elem.height;
				params.x = params.width/2;
				params.y = params.height/2;
			}
			rotate(ctx, params, params.width, params.height);
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

// Create jCanvas layers array
layers = [];

// Create layer
function addLayer(args) {
	layers.push(args);
	return args;
}

// Draw jCanvas layers
fn.drawLayers = function(clear) {
	var ctx, params, e, i;
	for (e=0; e<this.length; e+=1) {
		ctx = this[e].getContext('2d');
		// Optionally clear canvas
		if (clear) {
			ctx.clearRect(0, 0, this[e].width, this[e].height);
		}
		// Draw items on queue
		for (i=0; i<layers.length; i+=1) {
			params = layers[i];
			if (params.fn) {
				fn[params.fn].call(this.eq(e), params);
			}
		}
	}
	return this;
};

// Normalize layerX/layerY for jQuery mouse events
$.event.fix = function(event) {
	event = fix.call($.event, event);
	if (event.layerX === undefined && event.layerY === undefined) {
		event.layerX = event.offsetX;
		event.layerY = event.offsetY;
	}
	return event;
};

// Enable backward compatibility
function retrofit() {
	jC.retro = true;
	jC.queue = layers;
	jC.create = addLayer;
	fn.drawQueue = fn.drawLayers;
	jC.checkUnits = jC.convertAngles;
	return jC;
}

// Export jCanvas functions
jC.defaults = defaults;
jC.prefs = prefs;
jC.setGlobals = setGlobals;
jC.convertAngles = convertAngles;
jC.rotate = rotate;
jC.layers = layers;
jC.addLayer = addLayer;
jC.retrofit = retrofit;
jC.retro = false;
$.jCanvas = jC;

}(jQuery, document, Math, Image));