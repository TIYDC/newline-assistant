module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({

        clean: {
            build: 'build/'
        },

        copy: {
            templates: {
                files: [
                    { expand: true, cwd: 'src/', src: ['templates/**'], dest: 'build/' }
                ]
            }
        },

        sass: {
            app: {
                files: {
                    'build/tiyo-assistant.css': 'src/styles/main.scss'
                }
            }
        },

        concat: {
            js: {
                src: ['src/scripts/main.js', 'src/scripts/**/*.js'],
                dest: 'build/tiyo-assistant.js'
            }
        },

        watch: {
            js: {
                files: ['src/scripts/**/*.js'],
                tasks: ['concat']
            },
            sass: {
                files: ['src/styles/**/*.scss'],
                tasks: ['sass']
            },
            templates: {
                files: ['src/templates/**'],
                tasks: ['copy:templates']
            }
        }

    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['clean', 'copy', 'concat', 'sass']);

};
