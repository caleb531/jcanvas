#!/bin/bash

# Make all strings case-insensitive
shopt -s nocasematch

# Confirm that you want to commit
echo -n "Reday to build? "
read CONFIRM

# Confirmation must begin with "y"
if [[ $CONFIRM =~ ^y ]]
then

	# Build jCanvas using Python
	echo 'Building jCanvas...'
	python build.py
	
	# Compress jCanvas using Google Closure Compiler
	java -jar ./compiler.jar --js ../jcanvas.js --js_output_file ../jcanvas.min.js
	
	# Switch to parent directory
	cd ../
	
	# Stage all files
	git add -A

	# Show status for reference
	git status
	
	# Derive this jCanvas version from the date
	VERSION=$(date +"%g.%m.%d")
	echo "Preparing to release jCanvas v"$VERSION...
	
	# As long as user confirms choices
	CONFIRM='n'
	while [[ ! $CONFIRM =~ ^y && $CONFIRM != 'exit' ]]
	do
		
		# Prompt for commit message
		echo -n "Enter commit message: "
		read MESSAGE
		
		# Confirm that you want to commit
		echo -n "Commit with this message? "
		read CONFIRM

		# Confirmation must begin with "y"
		if [[ $CONFIRM =~ ^y ]]
		then
			# Commit with message if confirmed
			git commit -m MESSAGE
			# Tag commit with the version
			git tag $VERSION
			echo "Changes successfully committed."
			# Push commit to GitHub
			git push origin
			# Push all tags to GitHub
			git push --tags origin
			echo "Commit successfully pushed to GitHub."
		fi
	
	done
	
	echo -e "\nDone."
	
else
	# Otherwise, terminate program
	echo -e "\nGoodbye."
fi