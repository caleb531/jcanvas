( function( $ ) {
/* global module, test, asyncTest, expect, start, ok, strictEqual, notStrictEqual, deepEqual */

var $fixture = $( '#qunit-fixture' );
var $canvas;
var firedEvents;

// Remove all whitespace from string
function removeWhitespace( str ) {
	str = str.replace( /\s/gi, '' );
	return str;
}

// Event callbacks

function layerEventCallback() {
	firedEvents.layer += 1;
}
function canvasEventHook() {
	firedEvents.canvas += 1;
}
function globalEventHook() {
	firedEvents.global += 1;
}

// Bind event callbacks for the given event type
function bindEventCallbacks( eventType ) {
	var eventHooks = {};
	eventHooks[ eventType ] = layerEventCallback;
	eventHooks[ eventType ] = canvasEventHook;
	$canvas.setEventHooks( eventHooks );
	$.jCanvas.eventHooks[ eventType ] = globalEventHook;
}

// Test if the bound event callbacks triggered
function testEventCallbacks( n ) {
	strictEqual( firedEvents.layer, n, 'Triggers layer event callbacks' );
	strictEqual( firedEvents.canvas, n, 'Triggers canvas event hooks' );
	strictEqual( firedEvents.global, n, 'Triggers global event hooks' );
}

// Setup test
function setup() {
	$canvas = $( '<canvas width="500" height="500"></canvas>' );
}

// Teardown test
function teardown() {
	// Reset map of event callbacks that fired
	firedEvents = {
		layer: 0,
		canvas: 0,
		global: 0
	};
	// Clear jCanvas cache
	$.jCanvas.clearCache();
	// Remove all global event hooks
	$.jCanvas.eventHooks = {};
}

teardown();

module( 'Core API', {
	setup: setup,
	teardown: teardown
} );

test( '$.support.canvas', function() {
	strictEqual( $.support.canvas, true, 'Detects canvas support' );
} );

test( 'saveCanvas()', function() {
	var data;
	$canvas.saveCanvas();
	data = $.data( $canvas[ 0 ], 'jCanvas' );
	strictEqual( data.savedTransforms.length, 1, 'Pushes transformation state to stack' );
} );

test( 'restoreCanvas()', function() {
	var data;
	$canvas.saveCanvas();
	data = $.data( $canvas[ 0 ], 'jCanvas' );
	$canvas.restoreCanvas();
	strictEqual( data.savedTransforms.length, 0, 'Pops transformation state from stack' );
} );

test( 'rotateCanvas()', function() {
	var data;
	$canvas.rotateCanvas( {
		rotate: 180
	} );
	data = $.data( $canvas[ 0 ], 'jCanvas' );
	strictEqual( data.savedTransforms.length, 1, 'Pushes transformation state to stack' );
	strictEqual( data.transforms.rotate, Math.PI, 'Updates rotate property' );
} );

test( 'scaleCanvas()', function() {
	var data;
	$canvas.scaleCanvas( {
		scale: 2
	} );
	data = $.data( $canvas[ 0 ], 'jCanvas' );
	strictEqual( data.savedTransforms.length, 1, 'Pushes transformation state to stack' );
	strictEqual( data.transforms.scaleX, 2, 'Updates scaleX property' );
	strictEqual( data.transforms.scaleY, 2, 'Updates scaleY property' );
} );

test( 'translateCanvas()', function() {
	var data;
	$canvas.translateCanvas( {
		translate: 2
	} );
	data = $.data( $canvas[ 0 ], 'jCanvas' );
	strictEqual( data.savedTransforms.length, 1, 'Pushes transformation state to stack' );
	strictEqual( data.transforms.translateX, 2, 'Updates translateX property' );
	strictEqual( data.transforms.translateY, 2, 'Updates translateY property' );
} );

module( 'Layer API', {
	setup: setup,
	teardown: teardown
} );

test( 'getLayers()', function() {
	var layers;
	deepEqual( $().getLayers(), [], 'Returns array for empty collection' );
	deepEqual( $fixture.getLayers(), [], 'Returns array for non-canvas' );
	layers = $canvas.getLayers();
	deepEqual( layers, [], 'Returns empty array for initial canvas' );
	strictEqual( $canvas.getLayers(), layers, 'Returns a reference to the layers array' );
} );

test( 'getLayer()', function() {
	var square, obj;
	// Test values returned for non-existant layers
	obj = {layer: true};
	strictEqual( $().getLayer( 'square' ), undefined, 'Returns undefined for empty collection' );
	strictEqual( $fixture.getLayer( 'square' ), undefined, 'Returns undefined for non-canvas' );
	strictEqual( $canvas.getLayer( 'square' ), undefined, 'Returns undefined for non-existent layer' );
	strictEqual( $canvas.getLayer( obj ), obj, 'Returns the given object' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square'
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle'
	} );
	// Test values returned for existing layes
	square = $canvas.getLayer( 0 );
	ok( typeof square === 'object' && $.isArray( square ) === false, 'Layer can be retrieved by positive index' );
	strictEqual( $canvas.getLayer( -2 ), square, 'Layer can be retrieved by negative index' );
	strictEqual( $canvas.getLayer( 'square' ), square, 'Layer can be retrieved by name' );
	strictEqual( $canvas.getLayer( /^square$/gi ), square, 'Layer can be retrieved by regex' );
	strictEqual( $canvas.getLayer( square ), square, 'Layer can be retrieved by object' );
} );

test( 'getLayerGroup()', function() {
	var squares;
	// Test values returned for non-existant layer groups
	strictEqual( $().getLayerGroup( 'squares' ), undefined, 'Returns undefined for empty collection' );
	strictEqual( $fixture.getLayerGroup( 'squares' ), undefined, 'Returns undefined for non-canvas' );
	strictEqual( $canvas.getLayerGroup( 'squares' ), undefined, 'Returns undefined for non-existent group' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		groups: [ 'squares' ]
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		groups: [ 'ovals' ]
	} );
	// Test values returned for existing layer groups
	squares = $canvas.getLayerGroup( 'squares' );
	ok( $.isArray( squares ), 'Group can be retrieved by index' );
	strictEqual( $canvas.getLayerGroup( /^squares$/gi ), squares, 'Group can be retrieved by regex' );
	strictEqual( $canvas.getLayerGroup( squares ), squares, 'Group can be retrieved by object' );
	strictEqual( squares.length, 1, 'Group contains the proper number of layers' );
	strictEqual( squares[ 0 ], $canvas.getLayer( 'square' ), 'Group contains the proper layer' );
} );

test( 'getLayerIndex()', function() {
	// Test values returned for non-existant layers
	strictEqual( $().getLayerIndex( 'foo' ), -1, 'Returns -1 for empty collection' );
	strictEqual( $fixture.getLayerIndex( 'foo' ), -1, 'Returns -1 for non-canvases' );
	strictEqual( $canvas.getLayerIndex( 'foo' ), -1, 'Returns -1 for non-existent layer' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square'
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle'
	} );
	// Test values returned for existing layers
	strictEqual( $canvas.getLayerIndex( 'square' ), 0, 'Returns index of first layer' );
	strictEqual( $canvas.getLayerIndex( 'circle' ), 1, 'Returns index of second layer' );
} );

test( 'setLayer()', function() {
	var square, groups, data;
	bindEventCallbacks( 'change' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		fillStyle: 'black',
		width: 100, height: 100,
		change: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		change: layerEventCallback
	} );
	// Test how properties of a layer are set
	square = $canvas.getLayer( 'square' );
	groups = [ 'boxes' ];
	data = {};
	$canvas.setLayer( square, {
		fillStyle: 'green',
		opacity: 0.5,
		name: 'box',
		groups: groups,
		data: data,
		width: '+=10',
		height: '-=10',
		rotate: '30',
		translate: 0,
		text: ''
	} );
	strictEqual( square.fillStyle, 'green', 'Sets fillStyle of layer' );
	strictEqual( square.opacity, 0.5, 'Sets opacity of layer' );
	strictEqual( $canvas.getLayer( 'box' ), square, 'Sets name of layer' );
	notStrictEqual( square.groups, groups, 'Clones arrays in property map' );
	notStrictEqual( square.data, data, 'Clones objects in property map' );
	strictEqual( square.width, 110, 'Increments width by 10' );
	strictEqual( square.height, 90, 'Decrements width by 10' );
	strictEqual( square.rotate, 30, 'Coerces numeric strings to numbers' );
	strictEqual( square.translate, 0, 'Handles zero values correctly' );
	strictEqual( square.text, '', 'Does not coerce text property' );
	testEventCallbacks( 1 );
} );

test( 'setLayers()', function() {
	var square, circle;
	bindEventCallbacks( 'change' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		fillStyle: 'black',
		change: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		fillStyle: 'red',
		change: layerEventCallback
	} );
	// Test how properties of all layers are set
	square = $canvas.getLayer( 'square' );
	circle = $canvas.getLayer( 'circle' );
	$canvas.setLayers( {
		fillStyle: 'green'
	} );
	strictEqual( square.fillStyle, 'green', 'Sets fillStyle of first layer' );
	strictEqual( circle.fillStyle, 'green', 'Sets fillStyle of second layer' );
	testEventCallbacks( 2 );
} );

test( 'setLayerGroup()', function() {
	var square, circle, oval;
	bindEventCallbacks( 'change' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		change: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		groups: [ 'ovals' ],
		change: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'ellipse',
		name: 'oval',
		groups: [ 'ovals' ],
		change: layerEventCallback
	} );
	// Test how the properties of the layers in a group are set
	square = $canvas.getLayer( 'square' );
	circle = $canvas.getLayer( 'circle' );
	oval = $canvas.getLayer( 'oval' );
	$canvas.setLayerGroup( 'ovals', {
		fillStyle: 'green'
	} );
	strictEqual( circle.fillStyle, 'green', 'Sets properties of first layer in group' );
	strictEqual( oval.fillStyle, 'green', 'Sets properties of second layer in group' );
	notStrictEqual( square.fillStyle, 'green', 'Does not set properties of layer outside of group' );
	testEventCallbacks( 2 );
} );

test( 'moveLayer()', function() {
	bindEventCallbacks( 'move' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		move: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle'
	} );
	$canvas.addLayer( {
		type: 'ellipse',
		name: 'oval'
	} );
	// Test how layers are moved
	$canvas.moveLayer( 'square', 1 );
	strictEqual( $canvas.getLayerIndex( 'square' ), 1, 'Layer can be moved to positive index' );
	$canvas.moveLayer( 'square', -1 );
	strictEqual( $canvas.getLayerIndex( 'square' ), 1, 'Layer can be moved to negative index' );
	testEventCallbacks( 2 );
} );

test( 'removeLayer()', function() {
	bindEventCallbacks( 'remove' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		remove: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle'
	} );
	var square = $canvas.getLayer( 'square' );
	// Test how layers are removed
	$canvas.removeLayer( 'square' );
	strictEqual( $canvas.getLayers().length, 1, undefined, 'Removes layer from layers array' );
	strictEqual( $canvas.getLayer( 'square' ), undefined, 'Layer is no longer retrievable' );
	strictEqual( square._layer, undefined );
	notStrictEqual( square._method, undefined );
	testEventCallbacks( 1 );
} );

test( 'removeLayers()', function() {
	bindEventCallbacks( 'remove' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		remove: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		remove: layerEventCallback
	} );
	// Test how all layers are removed
	$canvas.removeLayers();
	strictEqual( $canvas.getLayers().length, 0, 'Removes all layers from layers array' );
	strictEqual( $canvas.getLayer( 'square' ), undefined, 'First layer is no longer retrievable' );
	strictEqual( $canvas.getLayer( 'circle' ), undefined, 'Second layer is no longer retrievable' );
	testEventCallbacks( 2 );
} );

test( 'removeLayerGroup()', function() {
	bindEventCallbacks( 'remove' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square'
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		groups: [ 'ovals' ],
		remove: layerEventCallback
	} );
	$canvas.addLayer( {
		type: 'ellipse',
		name: 'oval',
		groups: [ 'ovals' ],
		remove: layerEventCallback
	} );
	// Test how layer groups are removed
	$canvas.removeLayerGroup( 'ovals' );
	strictEqual( $canvas.getLayers().length, 1, 'Removes layer group from layers array' );
	strictEqual( $canvas.getLayerGroup( 'ovals' ), undefined, 'Layer group is no longer retrievable' );
	testEventCallbacks( 2 );
} );

test( 'addLayerToGroup()', function() {
	var groups, squares, ovals;
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		groups: [ 'quadrilaterals' ]
	} );
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle'
	} );
	$canvas.addLayer( {
		type: 'ellipse',
		name: 'oval',
		groups: []
	} );
	// Test how layers are added to groups
	$canvas.addLayerToGroup( 'square', 'squares' );
	$canvas.addLayerToGroup( 'circle', 'ovals' );
	$canvas.addLayerToGroup( 'oval', 'ovals' );
	squares = $canvas.getLayerGroup( 'squares' );
	ovals = $canvas.getLayerGroup( 'ovals' );
	strictEqual( squares.length, 1, 'Adds layer to group if layer is associated with at least one group' );
	strictEqual( ovals.length, 2, 'Adds layer to group if layer is not associated with any groups' );
	$canvas.removeLayers();
	groups = [ 'ovals' ];
	$canvas.addLayer( {
		type: 'arc',
		name: 'circle',
		groups: groups
	} );
	$canvas.addLayer( {
		type: 'ellipse',
		name: 'oval',
		groups: groups
	} );
	$canvas.addLayerToGroup( 'oval', 'ellipses' );
	strictEqual( $canvas.getLayerGroup( 'ellipses' ).length, 1, 'Groups array is cloned upon layer creation' );
} );

test( 'removeLayerFromGroup()', function() {
	var shapes, squares;
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		groups: [ 'shapes', 'squares' ]
	} );
	// Test how layers are removed from groups
	$canvas.removeLayerFromGroup( 'square', 'squares' );
	shapes = $canvas.getLayerGroup( 'shapes' );
	squares = $canvas.getLayerGroup( 'squares' );
	strictEqual( squares, undefined, 'Removes layer from group' );
	strictEqual( shapes.length, 1, 'Layer remains in other groups' );
} );

module( 'Event API', {
	setup: setup,
	teardown: teardown
} );

test( 'getEventHooks()', function() {
	// Test how event hooks are retrieved
	deepEqual( $().getEventHooks(), {}, 'Returns object for empty collecion' );
	deepEqual( $fixture.getEventHooks(), {}, 'Returns object for non-canvas' );
	deepEqual( $canvas.getEventHooks(), {}, 'Returns object for canvas' );
} );

test( 'setEventHooks()', function() {
	// Test how event hooks are set
	$canvas.setEventHooks( {
		add: $.noop
	} );
	strictEqual( $canvas.getEventHooks().add, $.noop, 'Sets event hooks for canvas' );
} );

test( 'triggerLayerEvent()', function() {
	bindEventCallbacks( 'mousedown' );
	$canvas.addLayer( {
		type: 'rectangle',
		name: 'square',
		mousedown: layerEventCallback
	} );
	$canvas.triggerLayerEvent( 'square', 'mousedown' );
	testEventCallbacks( 1 );
} );

module( 'Animation API', {
	setup: setup,
	teardown: teardown
} );

asyncTest( 'animateLayer()', function() {
	expect( 8 );
	$canvas.addLayer( {
		type: 'path',
		opacity: 1,
		fillStyle: 'rgba(0, 0, 0)',
		strokeStyle: '#000',
		shadowColor: 'rgba(0, 0, 0, 1)',
		strokeWidth: 2,
		p1: {
			type: 'line',
			x1: 0, y1: 0,
			x2: 100, y2: 100
		}
	} );
	$canvas.animateLayer( 0, {
		fillStyle: '#f00',
		strokeStyle: 'rgb(255, 0, 0)',
		shadowColor: 'rgba(255, 0, 0, 0.5)',
		strokeWidth: 10,
		p1: {
			x1: 50
		}
	}, 10, function( layer ) {
		var testedStep;
		// Test general animation
		strictEqual( removeWhitespace( layer.fillStyle ), 'rgb(255,0,0)', 'Animates hexadecimal color' );
		strictEqual( removeWhitespace( layer.strokeStyle ), 'rgb(255,0,0)', 'Animates RGB color' );
		strictEqual( removeWhitespace( layer.shadowColor ), 'rgba(255,0,0,0.5)', 'Animates RGBA color' );
		strictEqual( layer.strokeWidth, 10, 'Animates strokeWidth property' );
		// Test sub-property animation
		strictEqual( layer.p1.x1, 50, 'Sub-property is animated' );
		strictEqual( layer[ 'p1.x1' ], undefined, 'Sub-property alias is deleted' );
		// Test another set of assertions using another animation
		testedStep = false;
		$canvas.animateLayer( 0, {
			opacity: 0.5
		}, {
			duration: 10,
			step: function( now, fx ) {
				// Run assertion once during animation
				if ( !testedStep ) {
					strictEqual( fx.prop, 'opacity', 'Hidden properties do not begin with underscore when step callback is running' );
					testedStep = true;
				}
			},
			complete: function( layer ) {
				// Continue other tests upon completion of animation
				strictEqual( layer, $canvas.getLayer( 0 ), 'Layer object is passed to complete callback' );
				start();
			}
		} );
	} );
} );

module( 'Text API', {
	setup: setup,
	teardown: teardown
} );

test( 'drawText()', function() {
	var text;
	$canvas.drawText( {
		layer: true,
		name: 'text1',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: 'Hello'
	} );
	// Test calculated dimensions of text layer
	text = $canvas.getLayer( 'text1' );
	ok( text.width, 'Width is calculated' );
	ok( text.height, 'Height is calculated' );
	ok( text.text, 'Text is defined' );
	$canvas.drawText( {
		layer: true,
		name: 'text2',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: 3
	} );
	text = $canvas.getLayer( 'text2' );
	strictEqual( text.text, '3', 'Number value for text is cast to string' );
	$canvas.drawText( {
		layer: true,
		name: 'text3',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: '3'
	} );
	text = $canvas.getLayer( 'text3' );
	strictEqual( text.text, '3', 'Numeric string value for text remains string' );
	$canvas.drawText( {
		layer: true,
		name: 'text4',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: '3.0'
	} );
	text = $canvas.getLayer( 'text4' );
	strictEqual( text.text, '3.0', 'Decimal string value for text remains string' );
	$canvas.drawText( {
		layer: true,
		name: 'text5',
		fontFamily: 'sans-serif',
		fontSize: '48pt',
		text: 'hello'
	} );
	text = $canvas.getLayer( 'text5' );
	strictEqual( text.fontSize, '48pt', 'Font sizes with units are not coerced to number literals' );
	$canvas.drawText( {
		layer: true,
		name: 'text6',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: ' '
	} );
	text = $canvas.getLayer( 'text6' );
	strictEqual( text.text, ' ', 'Whitespace string value for text remains string' );
} );

test( 'measureText()', function() {
	var props, text;
	props = {
		layer: true,
		type: 'text',
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: 'Hello'
	};
	text = $canvas.measureText( {
		fontFamily: 'sans-serif',
		fontSize: 36,
		text: 'Hello'
	} );
	// Test calculated dimensions of text object
	strictEqual( typeof text.width, 'number', 'Width is calculated for the given object' );
	strictEqual( typeof text.height, 'number', 'Height is calculated for the given object' );
	$canvas.addLayer( props );
	text = $canvas.measureText( 0 );
	strictEqual( typeof text.width, 'number', 'Width is calculated for the given layer' );
	strictEqual( typeof text.height, 'number', 'Height is calculated for the given layer' );
} );

module( 'Image API', {
	setup: setup,
	teardown: teardown
} );

asyncTest( 'drawImage()', function() {
	expect( 4 );
	var timesLoaded = 0;
	$canvas.drawImage( {
		layer: true,
		name: 'fish',
		source: 'images/fish.jpg',
		load: function( layer ) {
			timesLoaded += 1;
			if ( timesLoaded === 1 ) {
				// Run tests when image loads for first time
				strictEqual( $canvas.getLayer( 'fish' ), layer, 'Layer is passed to callback initially' );
				// Test dimensions of layer
				strictEqual( layer.width, 220, 'Width is calculated' );
				strictEqual( layer.height, 138, 'Height is calculated' );
			} else if ( timesLoaded === 2 ) {
				// Run tests when image loads for second time
				strictEqual( $canvas.getLayer( 'fish' ), layer, 'Layer is passed to callback on redraw' );
				start();
			}
		}
	} );
	$canvas.drawLayers();
} );

test( 'getCanvasImage()', function() {
	var url1, url2;
	// Test non-canvas elements
	url1 = $fixture.getCanvasImage();
	strictEqual( url1, null, 'Returns null for non-canvas elements' );
	// Test no arguments
	url1 = $canvas.getCanvasImage();
	strictEqual( url1.indexOf( 'data:image/png;base64,' ), 0, 'Returns data URL of type image/png by default' );
	// Test PNG images
	url1 = $canvas.getCanvasImage( 'png' );
	strictEqual( url1.indexOf( 'png' ), 11, 'Returns data URL of type image/png' );
	// Test JPEG images
	url1 = $canvas.getCanvasImage( 'jpeg' );
	strictEqual( url1.indexOf( 'jpeg' ), 11, 'Returns data URL of type image/jpeg' );
	// Test JPEG images with quality reduction
	url2 = $canvas.getCanvasImage( 'jpeg', 0.5 );
	notStrictEqual( url1, url2, 'Returns data URL of type image/jpeg with 50% compression' );
} );

}( jQuery ) );
