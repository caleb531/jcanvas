/**
 * @license jCanvas Hearts
 * Copyright 2013-2024 Caleb Evans
 * Released under the MIT license
 */
import $ from "jquery";

const PI = Math.PI;

$.jCanvas.extend({
	name: "drawHeart",
	type: "heart",
	props: {
		size: 0,
	},
	fn: function (ctx, params) {
		const canvas = this,
			width = params.size,
			factor = 0.75,
			height = width * factor,
			angle = PI * (factor * (1 - factor));

		// Enable shape transformation
		$.jCanvas.transformShape(canvas, ctx, params, width, height);

		const x = params.x;
		const y = params.y + width / 8;

		ctx.beginPath();
		ctx.moveTo(x, y + height / 2);
		ctx.arc(x + width / 4, y - height / 2, width / 4, angle, PI, true);
		ctx.arc(x - width / 4, y - height / 2, width / 4, 0, PI - angle, true);
		params.closed = true;
		$.jCanvas.detectEvents(canvas, ctx, params);
		$.jCanvas.closePath(canvas, ctx, params);
	},
});
