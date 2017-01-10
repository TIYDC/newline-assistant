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
            },
            vendor: {
                files: [
                    { expand: true, src: ['vendor/**'], dest: 'build/' }
                ]
            },
            meta: {
                files: [
                    { expand: true, src: ['manifest.json', 'LICENSE', 'README.md'], dest: 'build/' },
                    { src: ['TIY-logo-thumb.jpg'], dest: 'build/' }
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
                src: ['src/scripts/client/main.js', 'src/scripts/client/**/*.js'],
                dest: 'build/tiyo-assistant.js',
                options: {
                    sourceMap: true
                }
            },
            worker: {
                src: ['src/scripts/worker/worker.js', 'src/scripts/worker/**/*.js'],
                dest: 'build/tiyo-assistant-worker.js',
                options: {
                    sourceMap: true
                }
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
