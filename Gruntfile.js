/* jshint camelcase:false */
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

var path = require('path');

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths for the application
  var appConfig = {
    server: 'server',
    app: require('./bower.json').appPath || 'app',
    dist: 'dist',
    bower: grunt.file.readJSON('./.bowerrc').directory || 'bower_components'
  };

  var configuration = require('./server/configuration');

  var pkg = grunt.file.readJSON('package.json');

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    yeoman: appConfig,
    pkg: pkg,

    // Application configuration
    env: {
      dist: {
        STATIC_PATH: './<%= yeoman.dist %>'
      }
    },

    paths: {
      dist: '<%= yeoman.dist %>',
      deb: {
        root: '.tmp/package/home/appuser/exchange',
        static: '.tmp/package/home/appuser/exchange/static',
        packageName: '<%= pkg.name %>_<%= pkg.version %>_all.deb',
        out: 'deb/<%= paths.deb.packageName %>',
        s3: 'packages/exchange/<%= pkg.version %>/<%= paths.deb.packageName %>'
      }
    },

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep']
      },
      js: {
        files: [
          '<%= yeoman.app %>/scripts/**/*.js',
          '<%= yeoman.server %>/**/*.js'
        ],
        tasks: ['newer:jshint:all', 'newer:jscs:all'],
        options: {
          livereload: {
            key: grunt.file.read('./dev/ssl/www-prototype.key'),
            cert: grunt.file.read('./dev/ssl/www-prototype.crt')
          }
        }
      },
      less: {
        files: ['<%= yeoman.app %>/**/*.less'],
        tasks: ['less:dist']
      },
      styles: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.css'],
        tasks: ['newer:copy:styles', 'autoprefixer']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: true
        },
        files: [
          '<%= yeoman.app %>/**/*.html',
          '.tmp/styles/{,*/}*.css',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // Execute shell commands
    shell: {
      fpm: {
        command: [
          // fpm seems to be strongly opinionated about the working directory
          'cd .tmp/package',
          'fpm -t deb -s dir -n <%= pkg.name %> -v <%= pkg.version %> -a all --deb-user root --deb-group root --no-depends ' +
            '--before-install ../../deb/control/preInst --after-install ../../deb/control/postInst --before-remove ../../deb/control/preRm --after-remove ../../deb/control/postRm ' +
            '--force --package ../../<%= paths.deb.out %> *',
          'cd ../..'
        ].join('&&')
      },
      // Get the SHA of HEAD
      gitsha: {
        command: 'git rev-parse HEAD',
        options: {
          callback: function (err, stdout, stderr, cb) {
            if (err || stderr) {
              return cb(err);
            }

            grunt.config('gitsha', stdout.replace('\n', ''));
            cb(null);
          }
        }
      }
    },

    // Run a server for karma
    connect: {
      test: {
        options: {
          port: 3001,
          middleware: function (connect) {
            return [
              connect.static('.tmp'),
              connect().use(
                '/bower_components',
                connect.static('./bower_components')
              ),
              connect.static(appConfig.app)
            ];
          }
        }
      }
    },

    // Run the server using nodemon so that it can be restarted when server files
    // change
    nodemon: {
      options: {
        watch: [
          '<%= yeoman.server %>/**/*',
          'dev/data/products.json',
          'dev/data/tocs.json',
          'package.json'
        ],
        ignore: ['node_modules/**', 'static/**']
      },
      server: {
        script: '<%= yeoman.server %>',
        options: {
          callback: function (nodemon) {
            nodemon.on('config:update', function () {
              setTimeout(function () {
                // Open a browser in a new tab
                require('open')('https://exchange.local.pearson.com');
              }, 1000);
            });
          }
        }
      }
    },

    // Detect errors or problems in the code
    jshint: {
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= yeoman.app %>/scripts/{,*/}*.js',
          '<%= yeoman.server %>/**/*.js'
        ]
      },
      test: {
        src: ['test/**/*.js']
      }
    },

    // Check code style
    jscs: {
      options: {
        config: '.jscsrc'
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= yeoman.app %>/scripts/**/*.js',
          '<%= yeoman.server %>/**/*.js'
        ]
      }
    },

    // Empty folders to start fresh
    clean: {
      // Remove all transient artifacts, including node_modules and bower_components
      clobber: {
        files: [{
          dot: true,
          src: [
            'node_modules',
            '<%= yeoman.bower %>',
            '.vagrant',
            '*.log'
          ]
        }]
      },
      // Build artifacts
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.dist %>/{,*/}*',
            '!<%= yeoman.dist %>/.git*'
          ]
        }]
      },
      server: '.tmp'
    },

    // Compile CSS
    less: {
      dist: {
        files: {
          '<%= yeoman.app %>/styles/app.css': '<%= yeoman.app %>/styles/app.less'
        }
      }
    },

    // Add vendor prefixed styles
    autoprefixer: {
      options: {
        browsers: ['last 1 version']
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      app: {
        src: ['<%= yeoman.app %>/index.html'],
        options: {
          ignorePath:  /\.\.\//,
          exclude: [
            'bower_components/bootstrap/dist/css/bootstrap.css',
            'bower_components/jquery-waypoints/waypoints.js',
            'bower_components/waypoints/waypoints.js',
            'bower_components/angular-feature-flags/dist/featureFlags.min.js',
            'bower_components/angulartics/src/angulartics-adobe.js',
            'bower_components/angulartics/src/angulartics-chartbeat.js',
            'bower_components/angulartics/src/angulartics-flurry.js',
            'bower_components/angulartics/src/angulartics-ga-cordova.js',
            'bower_components/angulartics/src/angulartics-gtm.js',
            'bower_components/angulartics/src/angulartics-kissmetrics.js',
            'bower_components/angulartics/src/angulartics-mixpanel.js',
            'bower_components/angulartics/src/angulartics-piwik.js',
            'bower_components/angulartics/src/angulartics-scroll.js',
            'bower_components/angulartics/src/angulartics-segmentio.js',
            'bower_components/angulartics/src/angulartics-splunk.js',
            'bower_components/angulartics/src/angulartics-woopra.js',
            'bower_components/angulartics/src/angulartics-marketo.js',
            'bower_components/angulartics/src/angulartics-intercom.js',
            'bower_components/angulartics/src/angulartics-cnzz.js',
            'bower_components/dom-delegate/lib/delegate.js',
            'bower_components/o-dropdown-menu/main.js',
            'bower_components/o-assets/main.js',
            'bower_components/o-header/main.js',
            'bower_components/o-app-header/main.js',
            'bower_components/o-weakmap/main.js',
            'bower_components/o-drawer/main.js',
            'bower_components/o-xhr/main.js',
            'bower_components/o-collapse/main.js',
            'bower_components/o-contextual-help/main.js'
          ]
        }
      }
    },

    // Renames files for browser caching purposes
    filerev: {
      dist: {
        src: [
          '<%= yeoman.dist %>/scripts/{,*/}*.js',
          '<%= yeoman.dist %>/styles/{,*/}*.css',
          '<%= yeoman.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
          '!<%= yeoman.dist %>/images/{,*/}placeholder-*.{png,jpg,jpeg,gif,webp,svg}', // Ignore placeholder images used for dev
          '<%= yeoman.dist %>/styles/fonts/*'
        ]
      }
    },

    // Minify, combine, and cache HTML templates with $templateCache
    ngtemplates: {
      exchangeApp: {
        cwd: '<%= yeoman.app %>',
        src: 'scripts/**/*.html',
        dest: '.tmp/concat/scripts/scripts.js',
        options: {
          append: true,
          usemin: 'scripts/scripts.js'
        }
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= yeoman.app %>/index.html',
      options: {
        dest: '<%= yeoman.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
      js: ['<%= yeoman.dist %>/{,*/}*.js'],
      options: {
        assetsDirs: ['<%= yeoman.dist %>','<%= yeoman.dist %>/images'],
        patterns: {
          js: [
            [
              /['"]\/images\/([^"']+)["']/gm,
              'Update the JS with the new img filenames'
            ]
          ]
        }
      }
    },

    // The following *-min tasks will produce minified files in the dist folder
    // By default, your `index.html`'s <!-- Usemin block --> will take care of
    // minification. These next options are pre-configured if you do not wish
    // to use the Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/styles/main.css': [
    //         '.tmp/styles/{,*/}*.css'
    //       ]
    //     }
    //   }
    // },
    // uglify: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/scripts/scripts.js': [
    //         '<%= yeoman.dist %>/scripts/scripts.js'
    //       ]
    //     }
    //   }
    // },
    // concat: {
    //   dist: {}
    // },

    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg,gif}',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },

    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },

    htmlmin: {
      dist: {
        options: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true,
          removeOptionalTags: true
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.dist %>',
          src: ['*.html', 'scripts/**/*.html'],
          dest: '<%= yeoman.dist %>'
        }]
      }
    },

    // Add, remove and rebuild AngularJS dependency injection annotations.
    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat/scripts',
          src: '*.js',
          dest: '.tmp/concat/scripts'
        }]
      }
    },

    // Replace Google CDN references
    cdnify: {
      dist: {
        html: ['<%= yeoman.dist %>/*.html']
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [
          {
            expand: true,
            dot: true,
            cwd: '<%= yeoman.app %>',
            dest: '<%= yeoman.dist %>',
            src: [
              '*.{ico,png,txt}',
              '.htaccess',
              '*.html',
              // Since we are caching the views using $templateCache, there is no
              // reason to include them in the distribution. Uncomment if no longer
              // using ngtemplates.
              // 'views/{,*/}*.html',
              'images/{,*/}*.{webp}',
              'fonts/*'
            ]
          },
          {
            expand: true,
            cwd: '.tmp/images',
            dest: '<%= yeoman.dist %>/images',
            src: ['generated/*']
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap/dist',
            src: 'fonts/*',
            dest: '<%= yeoman.dist %>'
          },
          {
            expand: true,
            cwd: 'bower_components/fontawesome',
            src: 'fonts/*',
            dest: '<%= yeoman.dist %>'
          }
        ]
      },

      // Copies stylesheets
      styles: {
        expand: true,
        cwd: '<%= yeoman.app %>/styles',
        dest: '.tmp/styles/',
        src: '{,*/}*.css'
      },

      // Copies files to be included in the deployment Debian package
      deb: {
        options: {
          // Preserve the existing permissions
          mode: true
        },
        files: [
          // Copy static files
          {
            expand: true,
            dot: true,
            cwd: '<%= yeoman.dist %>',
            src: ['**'],
            dest: '<%= paths.deb.static %>'
          },
          // Copy server files
          {
            expand: true,
            dot: true,
            src: [
              '*.json',
              'bin/**',
              'server/**',
              'bower_components/**',
              'node_modules/**',
              'test/server/smoke/**'
            ],
            dest: '<%= paths.deb.root %>'
          },
          // Copy the dev data
          {
            expand: true,
            dot: true,
            cwd: 'dev',
            src: ['data/**'],
            dest: '<%= paths.deb.root %>'
          },
          // Copy the upstart script and other supporting files
          {
            expand: true,
            dot: true,
            cwd: 'deb',
            src: ['etc/**'],
            dest: '.tmp/package'
          }
        ]
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      server: [
        'copy:styles'
      ],
      test: [
        'copy:styles'
      ],
      // Start the server using nodemon and run the watch task
      // for livereload, etc.
      dev: [
        'nodemon',
        'watch'
      ],
      dist: [
        'copy:styles',
        'imagemin',
        'svgmin'
      ]
    },

    // Static test settings (Karma)
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        singleRun: true
      }
    },

    // Server test settings (Mocha)
    mochacov: {
      options: {
        reporter: 'spec',
        require: ['should']
      },
      unit: ['server/test/unit/**/*.js'],
      acceptance: {
        options: {
          require: ['server/test/acceptance/support.js', 'should'],
          timeout: 10000,
          slow: 500
        },
        src: ['server/test/acceptance/spec/**/*.js']
      }
    },

    bump: {
      options: {
        commitMessage: 'Release version %VERSION%',
        tagName: '%VERSION%',
        pushTo: 'origin'
      }
    },

    // Additional test settings (Tape)
    tape: {
      options: {
        pretty: true,
        output: 'console'
      },
      files: ['server/test/smoke/*.js']
    },

    // Publish settings for AWS S3
    s3: {
      dist: {
        options: {
          key: process.env.AWS_ACCESS_KEY_ID || '',
          secret: process.env.AWS_SECRET_ACCESS_KEY || '',
          bucket: 'pearson-nibiru-02-exchange'
        },
        sync: [
          {
            src: '<%= paths.deb.out %>',
            dest: '<%= paths.deb.s3 %>',
            verify: true
          }
        ]
      }
    },

		origami: {
			dist: {
				js: '<%= yeoman.app %>/origami-modules/main.js',
				sass: '<%= yeoman.app %>/origami-modules/main.scss',
        buildFolder: '<%= yeoman.dist %>/origami-modules',
        buildJs: 'origami-main.js',
		    buildCss: 'origami-main.css',
			}
		}

  });

  grunt.registerTask('prepdevenv', function (target) {
    if (!grunt.file.exists('.git/hooks/prepare-commit-msg')) {
      grunt.file.copy('dev/hooks/prepare-commit-msg', '.git/hooks/prepare-commit-msg');
      require('fs').chmodSync('.git/hooks/prepare-commit-msg', '0755');
    }
  });

  grunt.registerTask('clobber', 'Remove all development and intermediate files/directories', function () {
    grunt.log.warn('Removing all development and intermediate files/directories, including node_modules and ' + appConfig.bower + '.');
    grunt.log.warn('You will need to run \'npm install\' and \'bower install\' before running any additional grunt tasks.');

    return grunt.task.run(['clean:dist', 'clean:clobber']);
  });

  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'env:dist', 'nodemon:server']);
    }

    grunt.task.run([
      'clean:server',
      'less:dist',
      'wiredep',
      'concurrent:server',
      'autoprefixer',
      'concurrent:dev'
    ]);
  });

  grunt.registerTask('server', 'DEPRECATED TASK. Use the "serve" task instead', function (target) {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve:' + target]);
  });

  grunt.registerTask('test', function (target) {

    if (target === 'server') {
      return grunt.task.run([
        'clean:server',
        'concurrent:test',
        'mochacov:unit'
      ]);
    }

    if (target === 'acceptance') {
      return grunt.task.run(['mochacov:acceptance']);
    }

    if (target === 'smoke') {
      return grunt.task.run(['tape']);
    }

    grunt.task.run([
      'clean:server',
      'concurrent:test',
      'mochacov:unit',
      'autoprefixer',
      'connect:test',
      'karma'
    ]);
  });

  grunt.registerTask('build', [
    'prepdevenv',
    'clean:dist',
    'shell:gitsha',
    'wiredep',
    'less:dist',
    'useminPrepare',
    'concurrent:dist',
    'autoprefixer',
    'concat',
    'ngtemplates',
    'ngAnnotate',
    'copy:dist',
    'cdnify',
    'cssmin',
    'uglify',
    'filerev',
    'usemin',
    'htmlmin',
    'origami'
  ]);

  grunt.registerTask('package', [
    'test',
    'build',
    'copy:deb',
    'shell:fpm'
  ]);

  grunt.registerTask('publish', [
    'package',
    's3:dist'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'jscs',
    'test',
    'build',
    'origami'
  ]);

  grunt.registerMultiTask('origami', function () {
		var done = this.async();

		function dataToArgs(task, data) {
			var args = [];

			args.push(task);

			Object.keys(data).forEach(function (key) {
				args.push('--' + key);
				args.push(data[key]);
			});

			return args;
		}

		var obtProcOptions = {
			cmd: 'obt',
			args: dataToArgs('build', this.data),
			opts: {
				stdio: 'inherit'
			}
		};

		grunt.util.spawn(obtProcOptions, done);
	});

  grunt.registerTask('default', ['qunit_junit', 'qunit']);
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-qunit-istanbul');
  pkg.qunit = {
    src: ['static/test/index.html'],
    options: {
      coverage: {
        src: ['server/**/**/*.js'],
        instrumentedFiles: 'temp/',
        htmlReport: 'report/coverage',
        coberturaReport: 'report/',
        linesThresholdPct: 20
      }
    }
  };
  grunt.loadNpmTasks('grunt-qunit-junit');
  pkg.qunit_junit = {
    options: {
      dest: 'report/'
    }
  };

};
