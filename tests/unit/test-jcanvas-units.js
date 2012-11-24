/* this file intended to facilitate manual & auto testing*/
function addLayer_drawRect(canvasName) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#0f0",
		x: 50, y: 50, width: 40, height: 40, fromCenter: false})
	.drawLayers()
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
	.addLayer({method: "drawArc", fillStyle: "#f00", name: "theC",
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
	.addLayer({method: "drawArc", fillStyle: "#f00", group: "circleAndRect",
		opacity: 0.1, x: 125, y: 50, radius: 20})
	.drawLayers()
	.animateLayerGroup("circleAndRect", {y: 100, opacity: 1,
		fillStyle: "#0f0"},	msecShift, afterFn)
}