module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				// Strip all comments except the license comment
				preserveComments: 'some'
			},
			scripts: {
				cwd: '.',
				src: [
					'jcanvas.js',
					'plugins/jcanvas-*.js',
					'!plugins/jcanvas-*.min.js'
				],
				dest: '.',
				expand: true,
				rename: function (dst, src) {
					return dst + '/' + src.replace('.js', '.min.js');
				}
			}
		},
		watch: {
			scripts: {
				files: [
					'*.js',
					'plugins/jcanvas-*.js',
					'!plugins/jcanvas-*.min.js'
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
