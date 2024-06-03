/**
 * @license jCanvas Crescents
 * Copyright 2013-2024 Caleb Evans
 * Released under the MIT license
 */
import $ from "jquery";

// Cache some functions and constants
const pow = Math.pow,
	sqrt = Math.sqrt,
	PI = Math.PI;

// Get the topmost intersection point of two circles
function getIntersection(
	x0: number,
	y0: number,
	r0: number,
	x1: number,
	y1: number,
	r1: number
): [number, number] | null {
	const dx = x1 - x0,
		dy = y1 - y0,
		d = sqrt(pow(dx, 2) + pow(dy, 2)),
		a = (pow(d, 2) + pow(r0, 2) - pow(r1, 2)) / (2 * d),
		x2 = x0 + (dx * a) / d,
		y2 = y0 + (dy * a) / d,
		h = sqrt(pow(r0, 2) - pow(a, 2)),
		rx = -dy * (h / d),
		ry = dx * (h / d),
		xi = x2 + rx,
		yi = y2 + ry;

	// Check if circles do not intersect or overlap completely
	if (d > r0 + r1 || d < Math.abs(r0 - r1)) {
		return null;
	}
	return [xi, yi];
}

$.jCanvas.extend({
	name: "drawCrescent",
	type: "crescent",
	props: {
		eclipse: 0.5,
	},
	fn: function (ctx, params) {
		const dist = 2 * params.radius * (1 - params.eclipse);
		const intersection = getIntersection(
			params.x,
			params.y,
			params.radius,
			params.x + dist,
			params.y,
			params.radius
		);
		if (!intersection) {
			return;
		}
		const x = intersection[0] - params.x;
		const y = intersection[1] - params.y;
		const t = Math.atan2(y, x);
		let start: number;
		let end: number;

		if (params.eclipse <= 0) {
			// Show full circle if circle is not eclipsed
			start = 0;
			end = 2 * PI;
		} else {
			// Otherwise, show eclipsed circle
			start = t;
			end = -t;
		}

		// If circle is not fully eclipsed
		if (params.eclipse < 1) {
			// Draw crescent shape

			// Enable shape transformation
			$.jCanvas.transformShape(this, ctx, params);

			ctx.beginPath();
			// Draw full circle
			ctx.arc(params.x, params.y, params.radius, start, end, false);
			// If circle is eclipsed to some degree
			if (params.eclipse > 0) {
				// Draw crescent region in circle
				ctx.arc(
					params.x + dist,
					params.y,
					params.radius,
					PI + start,
					PI + end,
					true
				);
			}
			// Enable jCanvas events
			$.jCanvas.detectEvents(this, ctx, params);
			// Always close path
			params.closed = true;
			$.jCanvas.closePath(this, ctx, params);
		}
	},
});
