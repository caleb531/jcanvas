/**
 * @license jCanvas Handles
 * Copyright 2015-2024 Caleb Evans
 * Released under the MIT license
 */
import $ from "jquery";

interface JCanvasLayerWithHandles extends JCanvasLayer {
	handlePlacement?: "sides" | "corners" | "both";
	aspectRatio?: number | null;
	handle?: JCanvasLayer | null;
	guide?: JCanvasLayer | null;
}

// Add a 'resizeFromCenter' property for rectangles
$.extend($.jCanvas.defaults, {
	handle: null,
	guide: null,
	aspectRatio: null,
	resizeFromCenter: true,
	constrainProportions: false,
	handlePlacement: "corners",
	minWidth: 0,
	minHeight: 0,
} as Partial<JCanvasLayerWithHandles>);

// Determines if the given layer is a rectangular layer
function isRectLayer(layer: JCanvasLayerWithHandles) {
	const method = layer._method;
	return (
		method === $.fn.drawRect ||
		method === $.fn.drawEllipse ||
		method === $.fn.drawImage
	);
}

// Determines if the given layer is a rectangular layer
function isPathLayer(layer: JCanvasLayerWithHandles) {
	const method = layer._method;
	return (
		method === $.fn.drawLine ||
		method === $.fn.drawQuadratic ||
		method === $.fn.drawBezier
	);
}

// Add a single handle to line path
function addPathHandle(
	$canvas: JQuery<HTMLCanvasElement>,
	parent: JCanvasLayerWithHandles,
	xProp: `x${number}` | `cx${number}`,
	yProp: `y${number}` | `cy${number}`
) {
	const handle = $.extend(
		{
			cursors: {
				mouseover: "grab",
				mousedown: "grabbing",
				mouseup: "grab",
			},
		},
		parent.handle,
		{
			// Define constant properties for handle
			layer: true,
			draggable: true,
			x: parent[xProp],
			y: parent[yProp],
			_parent: parent,
			_xProp: xProp,
			_yProp: yProp,
			fromCenter: true,
			// Adjust line path when dragging a handle
			dragstart: function (layer) {
				$(this).triggerLayerEvent(layer._parent, "handlestart");
			},
			drag: function (layer) {
				const parent = layer._parent;
				parent[layer._xProp] = layer.x - parent.x;
				parent[layer._yProp] = layer.y - parent.y;
				updatePathGuides(parent);
				$(this).triggerLayerEvent(parent, "handlemove");
			},
			dragstop: function (layer) {
				$(this).triggerLayerEvent(layer._parent, "handlestop");
			},
			dragcancel: function (layer) {
				$(this).triggerLayerEvent(layer._parent, "handlecancel");
			},
		} as Partial<JCanvasLayerWithHandles>
	);
	$canvas.draw(handle);
	// Add handle to parent layer's list of handles
	parent._handles.push($canvas.getLayer(-1));
}

// Add a single handle to rectangle
function addRectHandle(
	$canvas: JQuery<HTMLCanvasElement>,
	parent: JCanvasLayerWithHandles,
	px: number,
	py: number
) {
	let cursor;

	// Determine cursor to use depending on handle's placement
	if ((px === -1 && py === -1) || (px === 1 && py === 1)) {
		cursor = "nwse-resize";
	} else if (px === 0 && (py === -1 || py === 1)) {
		cursor = "ns-resize";
	} else if ((px === -1 || px === 1) && py === 0) {
		cursor = "ew-resize";
	} else if ((px === 1 && py === -1) || (px === -1 && py === 1)) {
		cursor = "nesw-resize";
	}

	const nonNullWidth = parent.width || 0;
	const nonNullHeight = parent.height || 0;
	const handle = $.extend(
		{
			// Set cursors for handle
			cursors: {
				mouseover: cursor,
			},
		},
		parent.handle,
		{
			// Define constant properties for handle
			layer: true,
			draggable: true,
			x:
				parent.x +
				((px * nonNullWidth) / 2 + (parent.fromCenter ? 0 : nonNullWidth / 2)),
			y:
				parent.y +
				((py * nonNullHeight) / 2 +
					(parent.fromCenter ? 0 : nonNullHeight / 2)),
			_parent: parent,
			_px: px,
			_py: py,
			fromCenter: true,
			dragstart: function (layer) {
				$(this).triggerLayerEvent(layer._parent, "handlestart");
			},
			// Resize rectangle when dragging a handle
			drag: function (layer) {
				const parent = layer._parent;

				if (parent.width + layer.dx * layer._px < parent.minWidth) {
					parent.width = parent.minWidth;
					layer.dx = 0;
				}
				if (parent.height + layer.dy * layer._py < parent.minHeight) {
					parent.height = parent.minHeight;
					layer.dy = 0;
				}

				if (!parent.resizeFromCenter) {
					// Optionally constrain proportions
					if (parent.constrainProportions) {
						if (layer._py === 0) {
							// Manage handles whose y is at layer's center
							parent.height = parent.width / parent.aspectRatio;
						} else {
							// Manage every other handle
							parent.width = parent.height * parent.aspectRatio;
							layer.dx = layer.dy * parent.aspectRatio * layer._py * layer._px;
						}
					}
					// Optionally resize rectangle from corner
					if (parent.fromCenter) {
						parent.width += layer.dx * layer._px;
						parent.height += layer.dy * layer._py;
					} else {
						// This is simplified version based on math. Also you can write this using an if statement for each handle
						parent.width += layer.dx * layer._px;
						if (layer._px !== 0) {
							parent.x +=
								layer.dx *
								(1 - layer._px && (1 - layer._px) / Math.abs(1 - layer._px));
						}
						parent.height += layer.dy * layer._py;
						if (layer._py !== 0) {
							parent.y +=
								layer.dy *
								(1 - layer._py && (1 - layer._py) / Math.abs(1 - layer._py));
						}
					}
					// Ensure diagonal handle does not move
					if (parent.fromCenter) {
						if (layer._px !== 0) {
							parent.x += layer.dx / 2;
						}
						if (layer._py !== 0) {
							parent.y += layer.dy / 2;
						}
					}
				} else {
					// Otherwise, resize rectangle from center
					parent.width += layer.dx * layer._px * 2;
					parent.height += layer.dy * layer._py * 2;
					// Optionally constrain proportions
					if (parent.constrainProportions) {
						if (layer._py === 0) {
							// Manage handles whose y is at layer's center
							parent.height = parent.width / parent.aspectRatio;
						} else {
							// Manage every other handle
							parent.width = parent.height * parent.aspectRatio;
						}
					}
				}
				updateRectHandles(parent);
				$(this).triggerLayerEvent(parent, "handlemove");
			},
			dragstop: function (layer) {
				const parent = layer._parent;
				$(this).triggerLayerEvent(parent, "handlestop");
			},
			dragcancel: function (layer) {
				const parent = layer._parent;
				$(this).triggerLayerEvent(parent, "handlecancel");
			},
		} as Partial<JCanvasLayerWithHandles>
	);
	$canvas.draw(handle);
	// Add handle to parent layer's list of handles
	parent._handles.push($canvas.getLayer(-1));
}

// Add all handles to rectangle
function addRectHandles(
	$canvas: JQuery<HTMLCanvasElement>,
	parent: JCanvasLayerWithHandles
) {
	const handlePlacement = parent.handlePlacement;
	const nonNullWidth = parent.width || 0;
	const nonNullHeight = parent.height || 0;
	// Store current width-to-height ratio
	if (parent.aspectRatio === null && parent.height !== 0) {
		parent.aspectRatio = nonNullWidth / nonNullHeight;
	}
	// Optionally add handles to corners
	if (handlePlacement === "corners" || handlePlacement === "both") {
		addRectHandle($canvas, parent, -1, -1);
		addRectHandle($canvas, parent, 1, -1);
		addRectHandle($canvas, parent, 1, 1);
		addRectHandle($canvas, parent, -1, 1);
	}
	// Optionally add handles to sides
	if (handlePlacement === "sides" || handlePlacement === "both") {
		addRectHandle($canvas, parent, 0, -1);
		addRectHandle($canvas, parent, 1, 0);
		addRectHandle($canvas, parent, 0, 1);
		addRectHandle($canvas, parent, -1, 0);
	}
	// Optionally add handle guides
	if (parent.guide) {
		addRectGuides($canvas, parent);
	}
}

// Update handle guides for rectangular layer
function updateRectGuides(parent: JCanvasLayerWithHandles) {
	const guide = parent._guide;
	if (guide) {
		guide.x = parent.x;
		guide.y = parent.y;
		guide.width = parent.width;
		guide.height = parent.height;
		guide.fromCenter = parent.fromCenter;
	}
}

// Add handle guides to rectangular layer
function addRectGuides(
	$canvas: JQuery<HTMLCanvasElement>,
	parent: JCanvasLayerWithHandles
) {
	const guideProps = $.extend({}, parent.guide, {
		layer: true,
		draggable: false,
		type: "rectangle",
		handle: null,
	});
	$canvas.addLayer(guideProps);
	const guide = $canvas.getLayer(-1);
	parent._guide = guide;
	$canvas.moveLayer(guide, -parent._handles.length - 1);
	updateRectGuides(parent);
}

// Add handles to line path
function addPathHandles(
	$canvas: JQuery<HTMLCanvasElement>,
	parent: JCanvasLayerWithHandles
) {
	for (const key in parent) {
		if (Object.prototype.hasOwnProperty.call(parent, key)) {
			// If property is a control point
			if (key.match(/c?x(\d+)/gi) !== null) {
				// Get the x and y coordinates for that control point
				const xProp = key as `x${number}` | `cx${number}`;
				const yProp = key.replace("x", "y") as `y${number}` | `cy${number}`;
				// Add handle at control point
				addPathHandle($canvas, parent, xProp, yProp);
			}
		}
	}
	// Add guides connecting handles
	if (parent.guide) {
		addPathGuides($canvas, parent);
	}
}

// Update handle guides for line path
function updatePathGuides(parent: JCanvasLayerWithHandles) {
	let handles = parent._handles;
	const guides = parent._guides;

	if (parent._method === $.fn.drawQuadratic) {
		if (handles) {
			const guide = parent._guide;
			if (guide) {
				for (let h = 0; h < handles.length; h += 1) {
					const handle = parent._handles[h];
					guide["x" + (h + 1)] = handle.x;
					guide["y" + (h + 1)] = handle.y;
				}
			}
		}
	} else if (parent._method === $.fn.drawBezier) {
		if (guides) {
			for (let g = 0; g < guides.length; g += 1) {
				const guide = guides[g];
				handles = guide._handles;
				if (guide && handles) {
					for (let h = 0; h < handles.length; h += 1) {
						const handle = handles[h];
						guide["x" + (h + 1)] = handle.x;
						guide["y" + (h + 1)] = handle.y;
					}
				}
			}
		}
	}
}

// Add guides to path layer
function addPathGuides(
	$canvas: JQuery<HTMLCanvasElement>,
	parent: JCanvasLayerWithHandles
) {
	const handles = parent._handles;
	const guideProps = $.extend({}, parent.guide, {
		layer: true,
		draggable: false,
		type: "line",
	});
	if (parent._method === $.fn.drawQuadratic) {
		$canvas.addLayer(guideProps);
		parent._guide = $canvas.getLayer(-1);
		$canvas.moveLayer(parent._guide, -handles.length - 1);
	} else if (parent._method === $.fn.drawBezier) {
		parent._guides = [];
		for (let h = 0; h < handles.length; h += 1) {
			const handle = handles[h];
			const nextHandle = handles[h + 1];
			const prevHandle = handles[h - 1];
			let otherHandle = null;
			if (nextHandle !== undefined) {
				// If handle is a start/end point and next handle is a control point
				if (
					handle._xProp.indexOf("x") === 0 &&
					nextHandle._xProp.indexOf("cx") === 0
				) {
					otherHandle = nextHandle;
				}
			} else if (prevHandle !== undefined) {
				if (
					prevHandle._xProp.indexOf("cx") === 0 &&
					handle._xProp.indexOf("x") === 0
				) {
					otherHandle = prevHandle;
				}
			}
			if (otherHandle !== null) {
				$canvas.addLayer(guideProps);
				const guide = $canvas.getLayer(-1);
				if (guide) {
					guide._handles = [handle, otherHandle];
					parent._guides.push(guide);
					$canvas.moveLayer(guide, -handles.length - 1);
				}
			}
		}
	}
	updatePathGuides(parent);
}

// Update position of handles according to
// size and dimensions of rectangular layer
function updateRectHandles(parent: JCanvasLayerWithHandles) {
	const nonNullWidth = parent.width || 0;
	const nonNullHeight = parent.height || 0;
	if (parent._handles) {
		// Move handles when dragging
		for (let h = 0; h < parent._handles.length; h += 1) {
			const handle = parent._handles[h];
			handle.x =
				parent.x +
				((nonNullWidth / 2) * handle._px +
					(parent.fromCenter ? 0 : nonNullWidth / 2));
			handle.y =
				parent.y +
				((nonNullHeight / 2) * handle._py +
					(parent.fromCenter ? 0 : nonNullHeight / 2));
		}
	}
	updateRectGuides(parent);
}

// Update position of handles according to
// coordinates and dimensions of path layer
function updatePathHandles(parent: JCanvasLayerWithHandles) {
	const handles = parent._handles;
	if (handles) {
		// Move handles when dragging
		for (let h = 0; h < handles.length; h += 1) {
			const handle = handles[h];
			handle.x = parent[handle._xProp] + parent.x;
			handle.y = parent[handle._yProp] + parent.y;
		}
	}
	updatePathGuides(parent);
}

// Add drag handles to all four corners of rectangle layer
function addHandles(parent: JCanvasLayerWithHandles) {
	const $canvas = $(parent.canvas);

	// If parent's list of handles doesn't exist
	if (parent._handles === undefined) {
		// Create list to store handles
		parent._handles = [];
	}

	if (isRectLayer(parent)) {
		// Add four handles to corners of a rectangle/ellipse/image
		addRectHandles($canvas, parent);
	} else if (isPathLayer(parent)) {
		// Add two or more handles to a line path
		addPathHandles($canvas, parent);
	}
}

// Remove handles if handle property was removed
function removeHandles(layer: JCanvasLayerWithHandles) {
	const $canvas = $(layer.canvas);
	if (layer._handles) {
		// Remove handles from layer
		for (let h = 0; h < layer._handles.length; h += 1) {
			const handle = layer._handles[h];
			$canvas.removeLayer(handle);
		}
		layer._handles.length = 0;
	}
}

function objectContainsPathCoords(obj: object) {
	for (const prop in obj) {
		if (
			Object.prototype.hasOwnProperty.call(obj, prop) &&
			prop.match(/^(x|y)\d+$/)
		) {
			return true;
		}
	}
	return false;
}

$.extend($.jCanvas.eventHooks, {
	// If necessary, add handles when layer is added
	add: function (layer: JCanvasLayerWithHandles) {
		if (layer.handle) {
			addHandles(layer);
		}
	},
	// Remove handles of layer is removed
	remove: function (layer) {
		if (layer._handles) {
			const $canvas = $(this);
			// Remove handles from layer
			for (let h = 0; h < layer._handles.length; h += 1) {
				const handle = layer._handles[h];
				$canvas.removeLayer(handle);
			}
			layer._handles.length = 0;
		}
	},
	// Update handle positions when changing parent layer's dimensions
	change: function (layer, props: Partial<JCanvasLayerWithHandles>) {
		if (props.handle || objectContainsPathCoords(props)) {
			// Add handles if handle property was added
			removeHandles(layer);
			addHandles(layer);
		} else if (props.handle === null) {
			removeHandles(layer);
		}
		if (isRectLayer(layer)) {
			// If width/height was changed
			if (
				props.width !== undefined ||
				props.height !== undefined ||
				props.x !== undefined ||
				props.y !== undefined
			) {
				// Update handle positions
				updateRectHandles(layer);
			}
		} else if (isPathLayer(layer)) {
			updatePathHandles(layer);
		}
	},
	// Update handle positions when animating parent layer
	animate: function (layer, fx: any) {
		// If layer is a rectangle or ellipse layer
		if (isRectLayer(layer)) {
			// If width or height are animated
			if (
				fx.prop === "width" ||
				fx.prop === "height" ||
				fx.prop === "x" ||
				fx.prop === "y"
			) {
				// Update rectangular handles
				updateRectHandles(layer);
			}
		} else if (isPathLayer(layer)) {
			// If coordinates are animated
			if (fx.prop.match(/^c?(x|y)(\d+)/gi) !== null) {
				// Update path handles
				updatePathHandles(layer);
			}
		}
	},
	// Update handle positions when dragging parent layer
	drag: function (layer) {
		if (isRectLayer(layer)) {
			updateRectHandles(layer);
		} else if (isPathLayer(layer)) {
			updatePathHandles(layer);
		}
	},
} as typeof $.jCanvas.eventHooks);
