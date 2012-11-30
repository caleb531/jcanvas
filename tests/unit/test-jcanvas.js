/* Internal helpers */
function AtomicCanvas() {
	// modeled after QUnit's "Keeping Tests Atomic" cookbook guidance:
	//    http://qunitjs.com/cookbook/#keeping_tests_atomic
	this.fixture = $("#qunit-fixture")
	this.fixture.append("<canvas id='atomic-canvas' width='250' height='250'></canvas>")
	this.canvas = document.getElementById('atomic-canvas')
}

/* jCanvas tests */
module("jCanvas Arcs")

test("drawArc, simplest possible", function() {
	var ac = new AtomicCanvas()
	drawArc_simplest("#atomic-canvas")
	QUnit.pixelEqual(ac.canvas, 50, 50, 0, 255, 0, 255)
})

module("jCanvas Layers")

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

asyncTest("animateLayer, two addLayers & two animateLayers", 2, function() {
	var ac = new AtomicCanvas()
	animateLayer_twoAddsTwoAnimates("#atomic-canvas", 0,
		function () {
			QUnit.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
			QUnit.pixelEqual(ac.canvas, 125, 100, 0, 255, 0, 255)  // circle
			QUnit.start()
		})
})

// DKS (2012-11-24) - not sure test is well formed yet, not working on Chromium or FF
//asyncTest("animateLayerGroup, methods drawRect, drawArc", 1, function() {
//	var ac = new AtomicCanvas()
//	animateLayerGroup_circleRect("#atomic-canvas", 0,
//		function () {
//			QUnit.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
//			QUnit.start()
//		})
//})

module("jCanvas Transformation")

test("transformation, rotateCanvas", function () {
	var ac = new AtomicCanvas()
	transformation_rotateCanvas("#atomic-canvas", 100, 0)
	// unspecified x, y in above function, so rotation occurs around x:0, y:0
	//    clockwise
	// center of box should be at:
	//    x = cos(30)*100 ~= 87
	//    y = sin(30)*100 ~= 50
	QUnit.pixelEqual(ac.canvas, 87, 50, 0, 255, 0, 255)
})

test("transformation, scaleCanvas", function () {
	var ac = new AtomicCanvas()
	transformation_scaleCanvas("#atomic-canvas", 100, 20)
	// scaling should both shift and balloon the shape
	QUnit.pixelEqual(ac.canvas, 193, 72, 0, 255, 0, 255)
})
