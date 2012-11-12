/* this file intended to facilitate manual & auto testing*/
function addLayerDrawRect(canvasName) {
	$(canvasName).addLayer({method: "drawRect", fillStyle: "#0f0",
		x: 0, y: 0, width: 5, height: 5, fromCenter: false})
	.drawLayers()
}

function animateLayerDrawRect(canvasName, msecShift, afterFn) {
	$(canvasName).addLayer({method: "drawRect", name: "shift-box",
		strokeStyle: "#f00", fillStyle: "#f00", x: 0, y: 0,
		width: 10, height: 10, fromCenter: false, opacity: 0
	})
	.animateLayer("shift-box", {x: 40, opacity: 1,
		strokeStyle: "#0f0", fillStyle: "#0f0"}, msecShift, afterFn)
}
