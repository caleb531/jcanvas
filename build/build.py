#!/usr/bin/env python
# The following script supports Python 2 and 3

import datetime, sys, os, re

# Compress source file
def compress(source):
	# Create path to minified file from source path
	minified = re.sub('(\.\w+)$', '.min\\1', source)
		
	# Compress source file
	os.system('java -jar closurecompiler.jar --js=' + source + ' --js_output_file ' + minified)

# Main function
def main():
	
	print('Running...')
	
	# Get jCanvas source file
	source = '../jcanvas.js'
	f = open(source, 'r+')
	# Read contents of source file
	contents = f.read()
	f.close()
	
	# Get current date
	now = datetime.datetime.now()
		
	# Get jCanvas version from current date
	version = now.strftime('%y.%m.%d')
	
	# Update source version
	contents = re.sub(' v(\d+\.\d+\.\d+)', (' v' + version), contents, 1)
	
	# Write updated source to source file
	f = open(source, 'w+')
	f.write(contents)
	f.close()
	
	# Compress jCanvas source
	compress(source)

	print('Done.')
	
# Initialize only when executed directly
if (__name__ == '__main__'):
	main()