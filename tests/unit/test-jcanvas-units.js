/* this file intended to facilitate manual & auto testing*/
function addLayer_DrawRect(canvasName) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#0f0",
		x: 0, y: 0, width: 5, height: 5, fromCenter: false})
	.drawLayers()
}

function animateLayer_DrawRect(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawRect", name: "shift-box",
		strokeStyle: "#f00", fillStyle: "#f00", x: 0, y: 0,
		width: 10, height: 10, fromCenter: false, opacity: 0
	})
	.animateLayer("shift-box", {x: 40, opacity: 1,
		strokeStyle: "#0f0", fillStyle: "#0f0"}, msecShift, afterFn)
}

function animateLayer_TwoAddLayers(canvasName, msecShift, afterFn) {
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

function animateLayerGroup_CircleRect(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#f00",
		group: "circleAndRect", opacity: 0.1, x: 70, y: 10,
		width: 40.0, height: 20})
	.addLayer({method: "drawArc", fillStyle: "#f00", group: "circleAndRect",
		opacity: 0.1, x: 125, y: 50, radius: 20})
	.drawLayers()
	.animateLayerGroup("circleAndRect", {y: 100, opacity: 1,
		fillStyle: "#0f0"},	msecShift, afterFn)
}