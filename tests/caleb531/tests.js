(function($) {

var $fixture = $('#qunit-fixture');
var $canvas;
var firedEvents = {};

// Event callbacks

function layerEventCallback(layer) {
	firedEvents.layer = true;
}
function canvasEventHook(layer) {
	firedEvents.canvas = true;
}
function globalEventHook(layer) {
	firedEvents.global = true;
}

// Bind event callbacks for the given event type
function bindEventCallbacks(eventType) {
	var eventHooks = {};
	eventHooks[eventType] = layerEventCallback;
	$.jCanvas(eventHooks);
	eventHooks[eventType] = canvasEventHook;
	$canvas.setEventHooks(eventHooks);
	$.jCanvas.eventHooks[eventType] = globalEventHook;
}

// Test if the bound event callbacks triggered
function testEventCallbacks() {
	ok(firedEvents.layer, 'Triggers layer event callbacks');
	ok(firedEvents.canvas, 'Triggers canvas event hooks');
	ok(firedEvents.global, 'Triggers global event hooks');
}

// Setup test
function setup() {
	$canvas = $("<canvas width='500', height='500'></canvas>");
}

// Teardown test
function teardown() {
	// Reset map of event callbacks that fired
	firedEvents = {};
	// Clear jCanvas cache
	$.jCanvas.clearCache();
	// Remove all global event hooks
	$.jCanvas.eventHooks = {};
	// Reset jCanvas preferences
	$.jCanvas();
}

module('Core API', {
	setup: setup,
	teardown: teardown
});

test('jCanvas()', function(assert) {
	$canvas.jCanvas({
		fillStyle: 'green',
		strokeStyle: 'red'
	});
	notDeepEqual($.jCanvas.defaults, $.jCanvas.prefs, 'Modifies preferences');
	$canvas.jCanvas();
	deepEqual($.jCanvas.defaults, $.jCanvas.prefs, 'Restores preferences to defaults');
});

test('saveCanvas()', function() {
	var data;
	$canvas.saveCanvas();
	data = $.data($canvas[0], 'jCanvas');
	strictEqual(data.savedTransforms.length, 1, 'Pushes transformation state to stack');
});

test('restoreCanvas()', function() {
	var data;
	$canvas.saveCanvas();
	data = $.data($canvas[0], 'jCanvas');
	$canvas.restoreCanvas();
	strictEqual(data.savedTransforms.length, 0, 'Pops transformation state from stack');
});

test('rotateCanvas()', function() {
	var data;
	$canvas.rotateCanvas({
		rotate: 180
	});
	data = $.data($canvas[0], 'jCanvas');
	strictEqual(data.savedTransforms.length, 1, 'Pushes transformation state to stack');
	strictEqual(data.transforms.rotate, Math.PI, 'Updates rotate property');
});

test('scaleCanvas()', function() {
	var data;
	$canvas.scaleCanvas({
		scale: 2
	});
	data = $.data($canvas[0], 'jCanvas');
	strictEqual(data.savedTransforms.length, 1, 'Pushes transformation state to stack');
	strictEqual(data.transforms.scaleX, 2, 'Updates scaleX property');
	strictEqual(data.transforms.scaleY, 2, 'Updates scaleY property');
});

test('translateCanvas()', function() {
	var data;
	$canvas.translateCanvas({
		translate: 2
	});
	data = $.data($canvas[0], 'jCanvas');
	strictEqual(data.savedTransforms.length, 1, 'Pushes transformation state to stack');
	strictEqual(data.transforms.translateX, 2, 'Updates translateX property');
	strictEqual(data.transforms.translateY, 2, 'Updates translateY property');
});

module('Layer API', {
	setup: setup,
	teardown: teardown
});

test('getLayers()', function() {
	var layers;
	deepEqual($().getLayers(), [], 'Returns array for empty collection');	
	deepEqual($fixture.getLayers(), [], 'Returns array for non-canvas');
	layers = $canvas.getLayers();
	deepEqual(layers, [], 'Returns empty array for initial canvas');
	strictEqual($canvas.getLayers(), layers, 'Returns a reference to the layers array');
});

test('addLayer()', function() {
	$canvas.addLayer({
		type: 'rectangle'
	});
	var layers = $canvas.getLayers();
	strictEqual(layers.length, 1, 'Layers was added');
	strictEqual($.type(layers[0]), 'object', 'Layers is object');
});

test('getLayer()', function() {
	var square, circle;
	strictEqual($().getLayer('square'), undefined, 'Returns undefined for empty collection');
	strictEqual($fixture.getLayer('square'), undefined, 'Returns undefined for non-canvas');
	strictEqual($canvas.getLayer('square'), undefined, 'Returns undefined for non-existent layer');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle'
	});
	square = $canvas.getLayer(0);
	strictEqual($.type(square), 'object', 'Layer can be retrieved by positive index')
	strictEqual($canvas.getLayer(-2), square, 'Layer can be retrieved by negative index');
	strictEqual($canvas.getLayer('square'), square, 'Layer can be retrieved by name');
	strictEqual($canvas.getLayer(/^square$/gi), square, 'Layer can be retrieved by regex');
	strictEqual($canvas.getLayer(square), square, 'Layer can be retrieved by object');
});

test('getLayerGroup()', function() {
	var squares;
	strictEqual($().getLayerGroup('squares'), undefined, 'Returns undefined for empty collection');
	strictEqual($fixture.getLayerGroup('squares'), undefined, 'Returns undefined for non-canvas');
	strictEqual($canvas.getLayerGroup('squares'), undefined, 'Returns undefined for non-existent group');	
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square',
		groups: ['squares']
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle',
		groups: ['ovals']
	});
	squares = $canvas.getLayerGroup('squares');
	strictEqual($.type(squares), 'array', 'Group can be retrieved by index');
	strictEqual($canvas.getLayerGroup(/^squares$/gi), squares, 'Group can be retrieved by regex');
	strictEqual($canvas.getLayerGroup(squares), squares, 'Group can be retrieved by object');
	strictEqual(squares.length, 1, 'Group contains the proper number of layers');
	strictEqual(squares[0], $canvas.getLayer('square'), 'Group contains the proper layer');
});

test('getLayerIndex()', function() {
	strictEqual($().getLayerIndex('foo'), -1, 'Returns -1 for empty collection');
	strictEqual($fixture.getLayerIndex('foo'), -1, 'Returns -1 for non-canvases');
	strictEqual($canvas.getLayerIndex('foo'), -1, 'Returns -1 for non-existent layer');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle'
	});
	strictEqual($canvas.getLayerIndex('square'), 0, 'Returns index of first layer');
	strictEqual($canvas.getLayerIndex('circle'), 1, 'Returns index of second layer');
});

test('setLayer()', function() {
	var square;
	bindEventCallbacks('change');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square',
		fillStyle: 'black'
	});
	square = $canvas.getLayer('square');
	$canvas.setLayer(square, {
		fillStyle: 'green',
		name: 'box'
	});
	strictEqual(square.fillStyle, 'green', 'Sets fillStyle of layer');
	strictEqual($canvas.getLayer('box'), square, 'Sets name of layer');
	testEventCallbacks();
});

test('setLayers()', function() {
	var square, circle;
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square',
		fillStyle: 'black'
	});
	$canvas.addLayer({
		type: 'rectangle',
		name: 'circle',
		fillStyle: 'red'
	});
	square = $canvas.getLayer('square');
	circle = $canvas.getLayer('circle');
	$canvas.setLayers({
		fillStyle: 'green'
	});
	strictEqual(square.fillStyle, 'green', 'Sets fillStyle of first layer');
	strictEqual(circle.fillStyle, 'green', 'Sets fillStyle of second layer');
});

test('setLayerGroup()', function() {
	var square, circle, oval, ovals;
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle',
		groups: ['ovals']
	});
	$canvas.addLayer({
		type: 'ellipse',
		name: 'oval',
		groups: ['ovals']
	});
	square = $canvas.getLayer('square');
	circle = $canvas.getLayer('circle');
	oval = $canvas.getLayer('oval');
	$canvas.setLayerGroup('ovals', {
		fillStyle: 'green'
	});
	strictEqual(circle.fillStyle, 'green', 'Sets properties of first layer in group')
	strictEqual(oval.fillStyle, 'green', 'Sets properties of second layer in group');
	notStrictEqual(square.fillStyle, 'green', 'Does not set properties of layer outside of group');
});

test('moveLayer()', function() {
	bindEventCallbacks('move');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle'
	});
	$canvas.addLayer({
		type: 'ellipse',
		name: 'oval'
	});
	$canvas.jCanvas();
	$canvas.moveLayer('square', 1);
	strictEqual($canvas.getLayerIndex('square'), 1, 'Layer can be moved to positive index');
	$canvas.moveLayer('square', -1);
	strictEqual($canvas.getLayerIndex('square'), 1, 'Layer can be moved to negative index');
	testEventCallbacks();
});

test('removeLayer()', function() {
	bindEventCallbacks('remove');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle'
	});
	$canvas.removeLayer('square');
	strictEqual($canvas.getLayers().length, 1, undefined, 'Removes layer from layers array');
	strictEqual($canvas.getLayer('square'), undefined, 'Layer is no longer retrievable');
	testEventCallbacks();
});

test('removeLayers()', function() {
	bindEventCallbacks('remove');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle'
	});
	$canvas.removeLayers();
	strictEqual($canvas.getLayers().length, 0, 'Removes all layers from layers array');
	strictEqual($canvas.getLayer('square'), undefined, 'First layer is no longer retrievable');
	strictEqual($canvas.getLayer('circle'), undefined, 'Second layer is no longer retrievable');
	testEventCallbacks();
});

test('removeLayerGroup()', function() {
	bindEventCallbacks('remove');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle',
		groups: ['ovals']
	});
	$canvas.addLayer({
		type: 'ellipse',
		name: 'oval',
		groups: ['ovals']
	});
	$canvas.removeLayerGroup('ovals');
	strictEqual($canvas.getLayers().length, 1, 'Removes layer group from layers array');
	strictEqual($canvas.getLayerGroup('ovals'), undefined, 'Layer group is no longer retrievable');
	testEventCallbacks();
});

test('addLayerToGroup()', function() {
	var squares, ovals;
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square',
		groups: ['quadrilaterals']
	});
	$canvas.addLayer({
		type: 'arc',
		name: 'circle'
	});
	$canvas.addLayer({
		type: 'ellipse',
		name: 'oval',
		groups: []
	});
	$canvas.addLayerToGroup('square', 'squares');
	$canvas.addLayerToGroup('circle', 'ovals');
	$canvas.addLayerToGroup('oval', 'ovals');
	squares = $canvas.getLayerGroup('squares');
	ovals = $canvas.getLayerGroup('ovals');
	strictEqual(squares.length, 1, 'Adds layer to group if layer is associated with at least one group');
	strictEqual(ovals.length, 2, 'Adds layer to group if layer is not associated with any groups');
});

test('removeLayerFromGroup()', function() {
	var shapes, squares;
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square',
		groups: ['shapes', 'squares']
	});
	$canvas.removeLayerFromGroup('square', 'squares');
	shapes = $canvas.getLayerGroup('shapes');
	squares = $canvas.getLayerGroup('squares');
	strictEqual(squares, undefined, 'Removes layer from group');
	strictEqual(shapes.length, 1, 'Layer remains in other groups');
});

module('Event API', {
	setup: setup,
	teardown: teardown
});

test('getEventHooks()', function() {
	deepEqual($().getEventHooks(), {}, 'Returns object for empty collecion');
	deepEqual($fixture.getEventHooks(), {}, 'Returns object for non-canvas');
	deepEqual($canvas.getEventHooks(), {}, 'Returns object for canvas');
});

test('setEventHooks()', function() {
	$canvas.setEventHooks({
		add: $.noop
	});
	strictEqual($canvas.getEventHooks().add, $.noop, 'Sets event hooks for canvas');
});

test('triggerLayerEvent()', function() {
	bindEventCallbacks('mousedown');
	$canvas.addLayer({
		type: 'rectangle',
		name: 'square'
	});
	$canvas.triggerLayerEvent('square', 'mousedown');
	testEventCallbacks();
});

module('Drawing API', {
	setup: setup,
	teardown: teardown
});

asyncTest('drawImage()', function() {
	var timesLoaded = 0;
	expect(4);
	$canvas.drawImage({
		layer: true,
		name: 'fish',
		source: 'fish.jpg',
		load: function(layer) {
			timesLoaded += 1;
			if (timesLoaded === 1) {
				// Run tests when image loads for first time
				strictEqual($canvas.getLayer('fish'), layer, 'Layer is passed to callback initially');
				strictEqual(layer.width, 220, 'Width is calculated');
				strictEqual(layer.height, 138, 'Height is calculated');
			} else if (timesLoaded === 2) {
				// Run tests when image loads for second time
				strictEqual($canvas.getLayer('fish'), layer, 'Layer is passed to callback on redraw');
				start();
			}
		}
	});
	$canvas.drawLayers();
});

test('drawText()', function() {
	var text;
	$canvas.drawText({
		layer: true,
		name: 'text',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: 'Hello'
	});
	text = $canvas.getLayer('text');
	ok(text.width, 'Width is calculated');
	ok(text.height, 'Height is calculated');
});

test('measureText()', function() {
	text = $canvas.measureText({
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: 'Hello'
	});
	ok(text.width, 'Width is calculated');
	ok(text.height, 'Height is calculated');
});

}(jQuery));