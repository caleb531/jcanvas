#!/bin/bash

# Make all strings case-insensitive
shopt -s nocasematch

# Ask before running program
echo -n "Ready to start? "
read CONFIRM_RUN
# Confirmation must begin with "y"
if [[ $CONFIRM_RUN =~ ^y ]]
then

	# Switch to parent directory
	cd "$(dirname "$0")"
	cd ../

	# Retrieve name of current branch
	BRANCH="$(git rev-parse --abbrev-ref HEAD)"

	# Define file paths
	SOURCE=jcanvas.js
	MINIFIED=jcanvas.min.js
	MANIFEST=jcanvas.jquery.json
	BOWER=bower.json
	PACKAGE=package.json
	README=README.md
	LICENSE=LICENSE.txt
	COMPILER=build/compiler.jar

	# Derive this jCanvas version from the date
	VERSION="$(date +"%g.%m.%d")"
	YEAR="$(date +"%Y")"

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
		replace $VERSION_PATT $VERSION $PACKAGE
		replace $VERSION_PATT $VERSION $BOWER

		# Update copyright year in all files
		YEAR_PATT="([0-9]{4})"
		replace $YEAR_PATT $YEAR $SOURCE
		replace $YEAR_PATT $YEAR $README
		replace $YEAR_PATT $YEAR $LICENSE

		# Compress jCanvas using Google Closure Compiler
		closure-compiler --js $SOURCE --js_output_file $MINIFIED

	else

		echo "jCanvas has not changed since last release"

	fi

	# Stage all files
	git add -A

	# Display status of repository
	git status

	# If there are changes to be committed
	if [[ $(git diff 2> /dev/null) != 0 ]]
	then

		# Ask to commit changes
		echo -n "Commit changes? "
		read CONFIRM_COMMIT
		if [[ $CONFIRM_COMMIT =~ ^y ]]
		then

			# Enter a message to commit
			git commit
			echo
			# If jCanvas was built
			if [[ $CONFIRM_BUILD =~ ^y ]]
			then
				# If tag already exists
				if [[ $(git show-ref --tags --quiet --verify -- "refs/tags/$TAG") ]]
				then
					# Delete tag
					git tag -d $VERSION
				fi
				# Tag commit with the version
				git tag $VERSION
			fi
			# Ask before pushing to GitHub
			echo -n "Push changes to GitHub? "
			read PUSH_CONFIRM
			if [[ $PUSH_CONFIRM =~ ^y ]]
			then
				# Push commit to GitHub
				git push origin $BRANCH
				# Push all tags to GitHub
				git push --tags origin
				echo
				npm publish
			else
				echo "Commit not pushed to GitHub."
			fi

		else

			git reset
			echo "Stage has been reset"

		fi

	fi

fi

# Signify end of script
echo
echo "Done."
