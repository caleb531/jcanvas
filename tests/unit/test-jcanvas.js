/* Internal helpers */
function AtomicCanvas() {
	// modeled after QUnit's "Keeping Tests Atomic" cookbook guidance:
	//    http://qunitjs.com/cookbook/#keeping_tests_atomic
	this.fixture = $("#qunit-fixture")
	this.fixture.append("<canvas id='atomic-canvas' width='250' height='250'></canvas>")
	this.canvas = document.getElementById('atomic-canvas')
}

/* jCanvas tests */
module("jCanvas Arcs");

test("drawArc, simplest possible", function() {
	var ac = new AtomicCanvas()
	drawArc_simplest("#atomic-canvas")
	QUnit.pixelEqual(ac.canvas, 50, 50, 0, 255, 0, 255)
})

module("jCanvas Layers");

test("addLayer, method drawRect", function () {
	var ac = new AtomicCanvas()
	addLayer_drawRect("#atomic-canvas")
	QUnit.pixelEqual(ac.canvas, 55, 55, 0, 255, 0, 255)
})

asyncTest("animateLayer, method drawLine", 1, function () {
	var ac = new AtomicCanvas()
	animateLayer_drawLine("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas, 200, 50, 0, 255, 0, 255)
			QUnit.start()
		})
})

asyncTest("animateLayer, method drawRect", 1, function () {
	var ac = new AtomicCanvas()
	animateLayer_drawRect("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas, 115, 65, 0, 255, 0, 255)
			QUnit.start()
		})
})

// DKS (2012-11-24) - not working on Chromium, but simpler tests are also failing
//asyncTest("animateLayer, two addLayers & two animateLayers", 2, function() {
//	var ac = new AtomicCanvas()
//	animateLayer_twoAddsTwoAnimates("#atomic-canvas", 0,
//		function () {
//			QUnit.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
//			QUnit.pixelEqual(ac.canvas, 125, 100, 0, 255, 0, 255)  // circle
//			QUnit.start()
//		})
//})

// DKS (2012-11-24) - not sure test is well formed yet, not working on Chromium or FF
//asyncTest("animateLayerGroup, methods drawRect, drawArc", 1, function() {
//	var ac = new AtomicCanvas()
//	animateLayerGroup_circleRect("#atomic-canvas", 0,
//		function () {
//			QUnit.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
//			QUnit.start()
//		})
//})
