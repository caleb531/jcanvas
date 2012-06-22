<?php

if (isset($_GET['v'])) {

	// Get specified jCanvas version
	$version = $_GET['v'];
	
	// Download minified version if specified
	if (isset($_GET['minified']) && $_GET['minified'] === '1') {
		$suffix = '.min';
	} else {
		$suffix = '';
	}
	
	// Create path to correct jCanvas build
	$path = "builds/$version/jcanvas{$suffix}.js";
		
	// Prompt to download script when finished
	header('Content-Type: text/javascript');
	header("Content-Disposition: attachment; filename=\"jcanvas{$suffix}.js\"");
	header('Expires: ' . gmdate('D, d M Y H:i:s', gmmktime() - 3600) . ' GMT');
	header('Content-Length: ' . filesize($path));
	
	// Write script to file
	echo file_get_contents($path);
	
}

?>