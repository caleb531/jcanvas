module.exports = function (grunt) {
	'use strict';
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				// Strip all comments except the license comment
				preserveComments: 'some'
			},
			scripts: {
				cwd: 'dist',
				src: '*.js',
				dest: 'dist/min',
				expand: true,
				rename: function (dst, src) {
					return dst + '/' + src.replace('.js', '.min.js');
				}
			}
		},
		watch: {
			scripts: {
				files: [
					// Automatically reload Gruntfile if it changes
					'Gruntfile.js',
					'dist/*.js'
				],
				tasks: [
					'uglify'
				]
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.registerTask('build', [
		'uglify'
	]);
	grunt.registerTask('serve', [
		'build',
		'watch'
	]);
};
