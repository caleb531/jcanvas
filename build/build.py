#!/usr/bin/env python
# This script supports Python 2 and 3

import datetime, sys, os, re

# Update version in given source file
def replace_in_file(path, expression, version, count=0):
	# Open source file for reading and writing
	file = open(path, 'r+')
	# Read contents from source file
	contents = file.read()
	
	# Update source version
	new_contents = re.sub(expression, version, contents, count)
	
	# Write updated source to source file
	if (new_contents != contents):
		file.truncate(0)
		file.seek(0)
		file.write(new_contents)
		file.close()
	
# Main function
def main():
	
	# Get current date
	now = datetime.datetime.now()
	# Get current year for license
	year = now.strftime('%Y')
	# Get jCanvas version from current date
	version = now.strftime('%y.%m.%d')
	
	source = '../jcanvas.js'
	manifest = '../jcanvas.jquery.json'
	readme = '../README.md'
	license = '../LICENSE.txt'
	
	# Update version in source and readme files
	version_re = '\d{2}\.\d{2}\.\d{2}'
	replace_in_file(source, version_re, version, 1)
	replace_in_file(manifest, version_re, version, 1)
	
	# Update year in copyright license
	year_re = '\d{4}'
	replace_in_file(source, year_re, year)
	replace_in_file(readme, year_re, year)
	replace_in_file(license, year_re, year)
		
# Initialize only when executed directly
if (__name__ == '__main__'):
	main()