#!/bin/bash

# Ask before running program
echo -n "Reday to start? "
read CONFIRM_RUN
# Confirmation must begin with "y"
if [[ $CONFIRM_RUN =~ ^y ]]
then
	
	# Make all strings case-insensitive
	shopt -s nocasematch
	# Switch to parent directory
	cd ../
	
	# Define file paths
	SOURCE=jcanvas.js
	MINIFIED=jcanvas.min.js
	MANIFEST=jcanvas.jquery.json
	README=README.md
	LICENSE=LICENSE.txt
	COMPILER=build/compiler.jar
	
	# Derive this jCanvas version from the date
	VERSION=$(date +"%g.%m.%d")
	YEAR=$(date +"%Y")
	
	# Ask before building jCanvas
	echo -n "Build jCanvas? "
	read CONFIRM_BUILD
	if [[ $CONFIRM_BUILD =~ ^y ]]
	then
		
		echo "Building jCanvas v$VERSION..."
		
		# Function to replace within file using pattern
		replace() {
			EXT=.bak
			sed -i$EXT -E s/$1/$2/g $3
			rm $3$EXT
		}
		
		# Update version in all files 
		VERSION_PATT="([0-9]{2})\.([0-9]{2})\.([0-9]{2})"
		replace $VERSION_PATT $VERSION $SOURCE
		replace $VERSION_PATT $VERSION $MANIFEST
		
		# Update copyright year in all files
		YEAR_PATT="([0-9]{4})"
		replace $YEAR_PATT $YEAR $SOURCE
		replace $YEAR_PATT $YEAR $README
		replace $YEAR_PATT $YEAR $LICENSE
		
		# Compress jCanvas using Google Closure Compiler
		java -jar $COMPILER --js $SOURCE --js_output_file $MINIFIED
		
	fi
	
	# Ask to commit changes
	echo -n "Commit changes? "
	read CONFIRM_COMMIT
	if [[ $CONFIRM_COMMIT =~ ^y ]]
	then
		
		# If current branch is not master
		if [[ $(git rev-parse --abbrev-ref HEAD) != master ]]
		then
			# Switch to master branch
			git checkout master
		fi
		
		# Stage all files
		git add -A
		
		# As long as user confirms choices
		CONFIRM_MESSAGE="n"
		while [[ !($CONFIRM_MESSAGE =~ ^y) && ($CONFIRM_MESSAGE != "exit") ]]
		do
			
			# Prompt for commit message
			echo -n "Enter commit message: "
			read MESSAGE
			
			# Confirm commit message
			echo -n "Commit with this message? "
			read CONFIRM_MESSAGE
			if [[ $CONFIRM_MESSAGE =~ ^y ]]
			then
				# Commit with message if confirmed
				git commit -m "$MESSAGE"
				echo
				# If jCanvas was built and version does not already exist
				if [[ $CONFIRM_BUILD =~ ^y ]] 
				then
					# If tag already exists
					if (git show-ref --tags --quiet --verify -- "refs/tags/$TAG")
					then
						# Delete tag
						git tag -d $VERSION
					fi
					# Tag commit with the version
					git tag $VERSION
				fi
				echo "Changes successfully committed."
				# Ask before pushing to GitHub
				echo -n "Push changes to GitHub? ";
				read PUSH_CONFIRM
				if [[ $PUSH_CONFIRM =~ ^y ]]
				then
					# Push commit to GitHub
					git push origin
					# Push all tags to GitHub
					git push --tags origin
					echo
					echo "Commit successfully pushed to GitHub."
				else
					echo "Commit not pushed to GitHub."
				fi
			fi
		
		done
	
	fi
	
fi

# Signify end of script
echo
echo "Done."