function addRadial(ctx) {
	var radial = $("canvas").gradient({
		x1: ctx.canvas.width/2, y1: ctx.canvas.height/2,
		x2: ctx.canvas.width/2, y2: ctx.canvas.height/2,
		r1: 0, r2: ctx.canvas.height,
		c1: "#f9fbfe", c2: "#bfcfe2", c3: "#86a9bb"
	});
	$("canvas").addLayer({
		method: "drawRect", fillStyle: radial,
		x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height,
		fromCenter: false
	});
}
