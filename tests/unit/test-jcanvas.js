/* Internal helpers */
function AtomicCanvas() {
	// modeled after QUnit's "Keeping Tests Atomic" cookbook guidance:
	//    http://qunitjs.com/cookbook/#keeping_tests_atomic
	this.fixture = $("#qunit-fixture")
	this.fixture.append("<canvas id='atomic-canvas' width='250' height='250'></canvas>")
	this.canvas = document.getElementById('atomic-canvas')
}

/* jCanvas tests */
module("jCanvas Layers");

test("addLayer, method drawRect", function () {
	var ac = new AtomicCanvas()
	addLayer_drawRect("#atomic-canvas")
	QUnit.pixelEqual(ac.canvas, 55, 55, 0, 255, 0, 255)
})

asyncTest("animateLayer, method drawRect", 1, function () {
	var ac = new AtomicCanvas()
	animateLayer_drawRect("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas, 115, 65, 0, 255, 0, 255)
			QUnit.start()
		})
})

asyncTest("animateLayer, methods drawRect, drawArc", 2, function() {
	var ac = new AtomicCanvas()
	animateLayer_TwoAddLayers("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
			QUnit.pixelEqual(ac.canvas, 125, 100, 0, 255, 0, 255)  // circle
			QUnit.start()
		})
})

asyncTest("animateLayerGroup, methods drawRect, drawArc", 1, function() {
	var ac = new AtomicCanvas()
	animateLayerGroup_circleRect("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
			QUnit.start()
		})
})