/* this file intended to facilitate manual & auto testing*/
function addLayer_drawRect(canvasName) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#0f0",
		x: 50, y: 50, width: 40, height: 40, fromCenter: false})
	.drawLayers()
}

function animateLayer_drawLine(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawLine", name: "vertical-beam",
		strokeStyle: "#f00", strokeWidth: 8, x1: 20, y1: 10, x2: 20, y2: 200,
		opacity: 0
	})
	.animateLayer("vertical-beam", {x1: 200, x2: 200, opacity: 1,
		strokeStyle: "#0f0"}, msecShift, afterFn)
}

function animateLayer_drawLinesInstantShiftVariedOpacity(canvasName, afterFn) {
	$(canvasName).addLayer({method: "drawRect", name: "context-box",
		strokeStyle: "#00f", fillStyle: "#00f", x: 0, y: 0,
		width: 250, height: 200, fromCenter: false, opacity: 1
	})
	$(canvasName).addLayer({method: "drawLine", name: "vertical-beamA",
		strokeStyle: "#f00", strokeWidth: 8, x1: 20, y1: 5, x2: 20, y2: 30,
		opacity: 1
	})
	.addLayer({method: "drawLine", name: "vertical-beamB",
		strokeStyle: "#f00", strokeWidth: 8, x1: 20, y1: 35, x2: 20, y2: 60,
		opacity: 0.8
	})
	.addLayer({method: "drawLine", name: "vertical-beamC",
		strokeStyle: "#f00", strokeWidth: 8, x1: 20, y1: 65, x2: 20, y2: 90,
		opacity: 0.6
	})
	.addLayer({method: "drawLine", name: "vertical-beamD",
		strokeStyle: "#f00", strokeWidth: 8, x1: 20, y1: 95, x2: 20, y2: 120,
		opacity: 0.4
	})
	.animateLayer("vertical-beamA", {x1: 200, x2: 200, opacity: 1,
		strokeStyle: "#0f0"}, 0)
	.animateLayer("vertical-beamB", {x1: 200, x2: 200, opacity: 1,
		strokeStyle: "#0f0"}, 0)
	.animateLayer("vertical-beamC", {x1: 200, x2: 200, opacity: 1,
		strokeStyle: "#0f0"}, 0)
	.animateLayer("vertical-beamD", {x1: 200, x2: 200, opacity: 1,
		strokeStyle: "#0f0"}, 0, afterFn)
}
function animateLayer_drawRect(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawRect", name: "shift-box",
		strokeStyle: "#f00", fillStyle: "#f00", x: 50, y: 50,
		width: 40, height: 40, fromCenter: false, opacity: 0
	})
	.animateLayer("shift-box", {x: 100, opacity: 1,
		strokeStyle: "#0f0", fillStyle: "#0f0"}, msecShift, afterFn)
}

function animateLayer_twoAddsTwoAnimates(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#f00", name: "theR",
		opacity: 0.1, x: 70, y: 10, width: 40.0, height: 20})
	// use a workaround for the Linux Chromium bug underlying issue #44
	.addLayer({method: "drawArc", fillStyle: "#f00", name: "theC",
		start: -Math.PI+0.01, end: 3*Math.PI/2+0.01, inDegrees: false,
		opacity: 0.1, x: 125, y: 50, radius: 20})
	.animateLayer("theR", {y: 100, opacity: 1, fillStyle: "#0f0"}, msecShift,
		function () {
			$(canvasName).animateLayer("theC", {y: 100, opacity: 1,
				fillStyle: "#0f0"}, msecShift, afterFn)
		})
}

function animateLayerGroup_circleRect(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#f00",
		group: "circleAndRect", opacity: 0.1, x: 70, y: 10,
		width: 40.0, height: 20})
	// use a workaround for the Linux Chromium bug underlying issue #44
	.addLayer({method: "drawArc", fillStyle: "#f00", group: "circleAndRect",
		start: -Math.PI+0.01, end: 3*Math.PI/2+0.01, inDegrees: false,
		opacity: 0.1, x: 125, y: 50, radius: 20})
	.animateLayerGroup("circleAndRect", {y: 100, opacity: 1,
		fillStyle: "#0f0"}, msecShift, afterFn)
}

function drawArc_simplest(canvasName) {
	// draw a red circle behind to illustrate the GitHub issue #44 on Linux:
	//    https://github.com/caleb531/jcanvas/issues/44
	// 2012-11-26 - confirmed that this is not a jCanvas issue, submitted
	// Chromium issue, closed the jCanvas issue #44:
	//    http://code.google.com/p/chromium/issues/detail?id=162635
	$(canvasName).drawArc({fillStyle: "#f00", x: 50, y: 50, radius: 50,
		start: -Math.PI, end: 3*Math.PI/2, inDegrees: false})
	$(canvasName).drawArc({fillStyle: "#0f0", x: 50, y: 50, radius: 50})
}

function drawImage_basic(canvasName, imageSrc, onLoad) {
	$(canvasName).addLayer({
		method: "drawImage", source: imageSrc, x: 0, y: 0, fromCenter: false,
		load: onLoad})
	.drawLayers()
}

function drawImage_customWidthHeight(canvasName, imageSrc, onLoad) {
	$(canvasName).addLayer({
		method: "drawImage", source: imageSrc, x: 0, y: 0, width: 100,
		height: 67, fromCenter: false, load: onLoad})
	.drawLayers()
}

function drawImage_scale(canvasName, imageSrc, onLoad) {
	// fromCenter=false seems to apply to x, y, but NOT to scaling operation,
	//    which IS performed about the center.
	$(canvasName).addLayer({
		method: "drawImage", source: imageSrc, x: 0, y: 0, scale: 0.5,
		fromCenter: false, load: onLoad})
	.drawLayers()
}

function drawImage_crop(canvasName, imageSrc, onLoad) {
	// crop appears to happen BEFORE x, y placement
	$(canvasName).addLayer({
		method: "drawImage", source: imageSrc, x: 0, y: 0, fromCenter: false,
		sWidth: 50, sHeight: 55, cropFromCenter: false,
		sx: 130, sy: 50,
		load: onLoad})
	.drawLayers()
}

function removeLayer_byIndex(canvasName) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#0f0",
		x: 50, y: 50, width: 40, height: 40, fromCenter: false})
	.addLayer({method: "drawRect", fillStyle: "#f00",
		x: 50, y: 50, width: 40, height: 40, fromCenter: false})
	.removeLayer(1)
	.drawLayers()
}

function removeLayer_byName(canvasName) {
	$(canvasName).addLayer({method: "drawRect", name: "greenBox",
		fillStyle: "#0f0", x: 150, y: 50, width: 40, height: 40,
		fromCenter: false})
	.addLayer({method: "drawRect", name: "redBox", fillStyle: "#f00",
		x: 150, y: 50, width: 40, height: 40, fromCenter: false})
	.removeLayer("redBox")
	.drawLayers()
}

function transformation_rotateCanvas(canvasName, x, y) {
	$(canvasName).rotateCanvas({
		rotate: 30
	})
	transformation_contextBox(canvasName, x)
	transformation_simpleBox(canvasName, x, y)
}

function transformation_rotateScaleCanvas(canvasName, x, y) {
	$(canvasName).rotateCanvas({
		rotate: 10
	})
	.scaleCanvas({
		scaleX: 2, scaleY: 3
	})
	
	transformation_contextBox(canvasName, x)
	transformation_simpleBox(canvasName, x, y)
}

function transformation_scaleCanvas(canvasName, x, y) {
	$(canvasName).scaleCanvas({
		scaleX: 2, scaleY: 3
	})
	transformation_contextBox(canvasName, x)
	transformation_simpleBox(canvasName, x, y)
}

function transformation_scaleRotateCanvas(canvasName, x, y) {
	$(canvasName).scaleCanvas({
		scaleX: 2, scaleY: 3
	})
	.rotateCanvas({
		rotate: 10
	})
	transformation_contextBox(canvasName, x)
	transformation_simpleBox(canvasName, x, y)
}

function transformation_contextBox(canvasName, x) {
	$(canvasName).drawRect({
		fillStyle: '#f00',
		x: 0, y: 0,
		width: x, height: 20, fromCenter: false
	})
}

function transformation_simpleBox(canvasName, x, y) {
	$(canvasName).drawRect({
		fillStyle: '#0f0',
		x: x, y: y,
		width: 10, height: 10
	})
}
