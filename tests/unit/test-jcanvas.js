/* Internal helpers */
function AtomicCanvas() {
	// modeled after QUnit's "Keeping Tests Atomic" cookbook guidance:
	//    http://qunitjs.com/cookbook/#keeping_tests_atomic
	this.fixture = $("#qunit-fixture")
	this.fixture.append("<canvas id='atomic-canvas' width='50' height='50'></canvas>")
	this.canvas = document.getElementById('atomic-canvas')
}

/* jCanvas tests */
module("jCanvas Layers");

test("addLayer, method drawRect", function () {
	var ac = new AtomicCanvas()
	addLayerDrawRect("#atomic-canvas")
	QUnit.pixelEqual(ac.canvas, 2, 2, 0, 255, 0, 255)
})

asyncTest("animateLayer, layer method drawRect", function () {
	var ac = new AtomicCanvas()
	animateLayerDrawRect("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas, 45, 5, 0, 255, 0, 255)
			start()
		})
})
