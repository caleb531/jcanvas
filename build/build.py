#!/usr/bin/env python
# This script supports Python 2 and 3

import datetime, sys, os, subprocess, re

# Run shell command
def run_cmd(cmd):
	process = subprocess.Popen(cmd.split(' '), stdout=subprocess.PIPE)
	out, err = process.communicate()
	return out.decode('utf-8')

# Compress source file
def compress_file(source):
	# Create path to minified file from source path
	compressed = re.sub('(\.\w+)$', '.min\\1', source)
	
	# Compress source file using Google Closure Compiler
	run_cmd('java -jar build/closure-compiler.jar --js ' + source + ' --js_output_file ' + compressed + ' --compilation_level SIMPLE_OPTIMIZATIONS')

# Update version in given source file
def replace_in_file(path, expression, version):
	# Open source file for reading and writing
	f = open(path, 'r')
	# Read contents from source file
	contents = f.read()
	f.close()
	
	# Update source version
	contents = re.sub(expression, version, contents, 1)
	
	# Write updated source to source file
	f = open(path, 'w')
	f.write(contents)
	f.close()
	
# Main function
def main():
	
	# Inform user when build process has started
	print('Building...')
	
	# Change directory to jcanvas/ directory
	os.chdir('../')
	
	# Get current date
	now = datetime.datetime.now()
	# Get current year for license
	year = now.strftime('%Y')
	# Get jCanvas version from current date
	version = now.strftime('%y.%m.%d')
	
	source = 'jcanvas.js'
	manifest = 'jcanvas.jquery.json'
	readme = 'README.md'
	license = 'LICENSE.txt'
	
	# Update version in source and readme files
	version_re = '\d{2}\.\d{2}\.\d{2}'
	replace_in_file(source, version_re, version)
	replace_in_file(manifest, version_re, version)
	
	# Update year in copyright license
	year_re = '\d{4}'
	replace_in_file(source, year_re, year)
	replace_in_file(readme, year_re, year)
	replace_in_file(license, year_re, year)
	
	# Compress jCanvas source
	compress_file(source)
		
	# Inform user when build process has finished
	print('Done.')
	
# Initialize only when executed directly
if (__name__ == '__main__'):
	main()