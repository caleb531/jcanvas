# This script supports Python 2 and 3

import datetime, sys, os, re

# Compress source file
def compress(source):
	# Create path to minified file from source path
	minified = re.sub('(\.\w+)$', '.min\\1', source)
		
	# Compress source file using Google Closure Compiler
	os.system('java -jar closurecompiler.jar --js ' + source + ' --js_output_file ' + minified + ' --compilation_level SIMPLE_OPTIMIZATIONS')

# Update version in given source file
def update_version(source, version):
	# Open source file for reading and writing
	f = open(source, 'r+')
	# Read contents from source file
	contents = f.read()
	f.close()
		
	# Update source version
	contents = re.sub(' v([\d\.]+)', (' v' + version), contents, 1)
	
	# Write updated source to source file
	f = open(source, 'w+')
	f.write(contents)
	f.close()

# Main function
def main():
	
	# Inform user when build process has started
	print('Running...')
	
	# Get current date
	now = datetime.datetime.now()
	# Get jCanvas version from current date
	version = now.strftime('%y.%m.%d')
	
	source = '../jcanvas.js'
	readme = '../README.md'
	
	# Update version in source and readme files
	update_version(source, version)
	
	# Compress jCanvas source
	compress(source)

	# Inform user when build process has finished
	print('Done.')
	
# Initialize only when executed directly
if (__name__ == '__main__'):
	main()