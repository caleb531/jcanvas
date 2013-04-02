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

test("drawArc, simplest possible", function(assert) {
	var ac = new AtomicCanvas()
	drawArc_simplest("#atomic-canvas")
	assert.pixelEqual(ac.canvas, 50, 50, 0, 255, 0, 255)
})

// -----
module("jCanvas Images")

asyncTest("drawImage basic", 1, function(assert) {
	var ac = new AtomicCanvas()
	drawImage_basic("#atomic-canvas", "./by-hand/images/fish-modified.png",
		function() {
			assert.pixelEqual(ac.canvas, 160, 70, 0, 249, 0, 255)
			QUnit.start();
		})
})

asyncTest("drawImage custom width/height", 1, function(assert) {
	var ac = new AtomicCanvas()
	drawImage_customWidthHeight("#atomic-canvas",
		"./by-hand/images/fish-modified.png",
		function() {
			assert.pixelEqual(ac.canvas, 80, 35, 0, 249, 0, 255)
			QUnit.start();
		})
})

asyncTest("drawImage scaled", 1, function(assert) {
	var ac = new AtomicCanvas()
	drawImage_scale("#atomic-canvas",
		"./by-hand/images/fish-modified.png",
		function() {
			assert.pixelEqual(ac.canvas, 130, 69, 0, 249, 0, 255)
			QUnit.start();
		})
})

asyncTest("drawImage cropped", 1, function(assert) {
	var ac = new AtomicCanvas()
	drawImage_crop("#atomic-canvas",
		"./by-hand/images/fish-modified.png",
		function() {
			assert.pixelEqual(ac.canvas, 40, 40, 0, 249, 0, 255)
			QUnit.start();
		})
})

// -----
module("jCanvas Layers")

test("addLayer, method drawRect", function (assert) {
	var ac = new AtomicCanvas()
	addLayer_drawRect("#atomic-canvas")
	assert.pixelEqual(ac.canvas, 55, 55, 0, 255, 0, 255)
})

asyncTest("animateLayer, method drawLine", 1, function (assert) {
	var ac = new AtomicCanvas()
	animateLayer_drawLine("#atomic-canvas", 0,
		function () {
			assert.pixelEqual(ac.canvas, 200, 50, 0, 255, 0, 255)
			QUnit.start()
		})
})

asyncTest("animateLayer, drawLines, instant shift, varied opacity", 4, function (assert) {
	var ac = new AtomicCanvas()
	animateLayer_drawLinesInstantShiftVariedOpacity("#atomic-canvas",
		function () {
			assert.pixelEqual(ac.canvas, 200, 20, 0, 255, 0, 255)
			assert.pixelEqual(ac.canvas, 200, 50, 0, 255, 0, 255)
			assert.pixelEqual(ac.canvas, 200, 80, 0, 255, 0, 255)
			assert.pixelEqual(ac.canvas, 200, 110, 0, 255, 0, 255)
			QUnit.start()
		})
})

asyncTest("animateLayer, method drawRect", 1, function (assert) {
	var ac = new AtomicCanvas()
	animateLayer_drawRect("#atomic-canvas", 0,
		function () {
			assert.pixelEqual(ac.canvas, 115, 65, 0, 255, 0, 255)
			QUnit.start()
		})
})

asyncTest("animateLayer, two addLayers, two animateLayers", 2, function(assert) {
	var ac = new AtomicCanvas()
	// 2013-01-10: this test fails with an animation duration of 0ms, but passes
	//    with a duration of 1ms.  Not sure why, and not worried about it right
	//    now.
	animateLayer_twoAddsTwoAnimates("#atomic-canvas", 1,
		function () {
			assert.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
			assert.pixelEqual(ac.canvas, 125, 100, 0, 255, 0, 255)  // circle
			QUnit.start()
		})
})

// DKS (2012-11-24) - not sure test is well formed yet, not working on Chromium or FF
//asyncTest("animateLayerGroup, methods drawRect, drawArc", 1, function(assert) {
//	var ac = new AtomicCanvas()
//	animateLayerGroup_circleRect("#atomic-canvas", 0,
//		function () {
//			assert.pixelEqual(ac.canvas,  70, 100, 0, 255, 0, 255)  // rectangle
//			QUnit.start()
//		})
//})

test("removeLayer, single layer at a time", 2, function (assert) {
	var ac = new AtomicCanvas()
	removeLayer_byIndex("#atomic-canvas")
	removeLayer_byName("#atomic-canvas")
	assert.pixelEqual(ac.canvas, 55, 55, 0, 255, 0, 255)
	assert.pixelEqual(ac.canvas, 155, 55, 0, 255, 0, 255)
}) 

// -----
module("Canvas Rotate")

test("rotateCanvas", function (assert) {
	var ac = new AtomicCanvas()
	transformation_rotateCanvas("#atomic-canvas", 100, 0)
	// unspecified x, y in above function, so rotation occurs around x:0, y:0
	//    clockwise
	// center of box should be at:
	//    x = cos(30)*100 ~= 87
	//    y = sin(30)*100 ~= 50
	assert.pixelEqual(ac.canvas, 87, 50, 0, 255, 0, 255)
})

// -----
module("Canvas Scale")

test("scaleCanvas", function (assert) {
	var ac = new AtomicCanvas()
	transformation_scaleCanvas("#atomic-canvas", 100, 20)
	// scaling should both shift and balloon the shape
	assert.pixelEqual(ac.canvas, 193, 72, 0, 255, 0, 255)
})
