var gulp = require('gulp'),
    zip = require('gulp-zip'),
    sass = require('gulp-ruby-sass'),
    bower = require('gulp-bower'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    minify = require('gulp-minify-css'),
    prettify = require('gulp-jsbeautifier'),
    expressService = require('gulp-express-service');

var paths = {
    bower: './bower_components',
    js: './resources/js',
    sass: './resources/sass',
    direct: './resources/direct',
    static_webroot: './static/webroot',
    static_dynamic: './static/dynamic',
    static_library: './static/library'
};

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest(paths.bower));
});

gulp.task('bower-copy', ['bower'], function() {

    gulp.src(paths.bower + '/jquery/jquery.min.*')
        .pipe(gulp.dest(paths.static_library + '/js'));

    gulp.src(paths.bower + '/bootstrap/dist/css/*.min.css*')
        .pipe(gulp.dest(paths.static_library + '/css'));
    gulp.src(paths.bower + '/bootstrap/dist/js/*.min.js')
        .pipe(gulp.dest(paths.static_library + '/js'));
    gulp.src(paths.bower + '/bootstrap/dist/fonts/*.*')
        .pipe(gulp.dest(paths.static_library + '/fonts'));

    gulp.src(paths.bower + '/bootstrap-validator/dist/*.min.js')
        .pipe(rename({
            prefix: 'bootstrap-',
        }))
        .pipe(gulp.dest(paths.static_library + '/js'));

    gulp.src(paths.bower + '/font-awesome/css/*.min.css*')
        .pipe(gulp.dest(paths.static_library + '/css'));
    gulp.src(paths.bower + '/font-awesome/fonts/*.*')
        .pipe(gulp.dest(paths.static_library + '/fonts'));

    gulp.src(paths.bower + '/bootstrap-markdown/css/*.min.css*')
        .pipe(gulp.dest(paths.static_library + '/css'));
    gulp.src(paths.bower + '/bootstrap-markdown/js/*.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static_library + '/js'));
    gulp.src(paths.bower + '/bootstrap-markdown/locale/bootstrap-markdown.zh.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static_library + '/js'));

    gulp.src(paths.bower + '/marked/marked.min.js')
        .pipe(gulp.dest(paths.static_library + '/js'));

    gulp.src(paths.bower + '/highlightjs/highlight.pack.min.js')
        .pipe(gulp.dest(paths.static_library + '/js'));
    gulp.src(paths.bower + '/highlightjs/styles/tomorrow.css')
        .pipe(minify())
        .pipe(rename({
            prefix: 'highlight-',
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static_library + '/css'));
});

gulp.task('direct', function() {
    gulp.src(paths.direct + '/**')
        .pipe(gulp.dest(paths.static_webroot));
});

gulp.task('js', function() {
    gulp.src(paths.js + '/*.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static_dynamic + '/js'));
});

gulp.task('css', function() {
    sass(paths.sass + '/style.scss', {
            style: 'compressed',
            loadPath: [paths.sass]
        })
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static_dynamic + '/css'));
});

gulp.task('service', ['bower-copy'], function() {
    gulp.src(['./server.js'])
        .pipe(expressService({
            file: './server.js'
        }))
        .on('error', function(e) {
            console.log(e.message, e.stack);
        });
});


gulp.task('watch', ['service'], function() {
    gulp.watch(paths.js + '/*.js', ['js']);
    gulp.watch(paths.sass + '/*.scss', ['css']);
    gulp.watch(paths.direct + '/**', ['direct']);
    gulp.watch([
        './server.js',
        './server/**/*.js',
        './server/**/*.json',
        './config/*.json'
    ], ['service']);
});

gulp.task('zip', ['bower-copy', 'direct', 'css'], function() {
    gulp.src([
            './server.js',
            './package.json',
            './server/**',
            './resources/mail/**',
            './resources/views/**',
            './static/**',
            './config/**', '!./config/local.json'
        ], {
            base: '.'
        })
        .pipe(zip('archive.zip'))
        .pipe(gulp.dest('./'));
});

gulp.task('format-js', function() {
    gulp.src('./server/**/*.js')
        .pipe(prettify({
            config: '.jsbeautifyrc',
            mode: 'VERIFY_AND_WRITE'
        }))
        .pipe(gulp.dest('./server'));
});

gulp.task('archive', ['bower', 'bower-copy', 'direct', 'js', 'css', 'zip']);
gulp.task('default', ['bower', 'bower-copy', 'direct', 'js', 'css', 'service', 'watch']);
