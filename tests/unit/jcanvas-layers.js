module("jCanvas Layers");

function AtomicCanvas() {
	// modeled after QUnit's "Keeping Tests Atomic" cookbook guidance:
	//    http://qunitjs.com/cookbook/#keeping_tests_atomic
	this.fixture = $("#qunit-fixture")
	this.fixture.append("<canvas id='atomic-canvas' width='50' height='50'></canvas>")
	this.canvas = document.getElementById('atomic-canvas')
}

test("addLayer, method drawRect", function () {
	var ac = new AtomicCanvas()
	$("#atomic-canvas").addLayer({method: "drawRect", fillStyle: "#0f0",
		x: 0, y: 0, width: 5, height: 5, fromCenter: false})
	.drawLayers()
	QUnit.pixelEqual(ac.canvas, 2, 2, 0, 255, 0, 255)
})

asyncTest("animateLayer, layer method drawRect", function () {
	var ac = new AtomicCanvas()

	$("#atomic-canvas").addLayer({method: "drawRect", name: "shift-box",
		strokeStyle: "#f00", fillStyle: "#f00", x: 0, y: 0, width: 10, height: 10,
		fromCenter: false, opacity: 0
	})
	.animateLayer("shift-box", {x: 40, opacity: 1}, 0,
		function () {
			QUnit.pixelEqual(ac.canvas, 45, 5, 255, 0, 0, 255)
			start()
		})
})
