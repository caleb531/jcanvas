// polyline for regular hexagon, flat side on bottom
function hexPolyline(ctx, cell_width, cell_height) {
	ctx.beginPath();
	ctx.moveTo(cell_width*1.5,  cell_height*0.5);
	ctx.lineTo(cell_width,      cell_height*0.5);
	ctx.lineTo(cell_width*0.75, cell_height-1);
	ctx.lineTo(cell_width*0.25, cell_height-1);
	ctx.lineTo(0,               cell_height*0.5);
	ctx.lineTo(cell_width*0.25, 0);
	ctx.lineTo(cell_width*0.75, 0);
	ctx.lineTo(cell_width,      cell_height*0.5);
	ctx.lineTo(cell_width*1.5,  cell_height*0.5);
	ctx.strokeStyle = "black";
	ctx.stroke();
}

function toRadians(degrees) {
	return degrees * (Math.PI/180);
}

function addGridOutline(ctx) {
	var hexw = 30;
	var hexh = hexw * Math.sin(toRadians(60));
	var patt = $("canvas").pattern({
		width: hexw*1.5, height: hexh,
		source: function(pctx) {
			hexPolyline(pctx, hexw, hexh);
		},
		repeat: "repeat"
	});
	$("canvas").addLayer({
		method: "drawRect", fillStyle: patt,
		x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height,
		fromCenter: false
	});
}
