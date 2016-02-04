var gulp = require('gulp'),
    sass = require('gulp-ruby-sass'),
    bower = require('gulp-bower'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    minify = require('gulp-minify-css'),
    expressService = require('gulp-express-service');

var paths = {
    bower: './bower_components',
    static: './webroot',
    sass: './resources/sass',
    images: './resources/images',
};

gulp.task('bower', function() {
    bower()
        .pipe(gulp.dest(paths.bower));

    gulp.src(paths.images + '/*')
        .pipe(gulp.dest(paths.static + '/images'));

    gulp.src(paths.bower + '/jquery/jquery.min.*')
        .pipe(gulp.dest(paths.static + '/js'));

    gulp.src(paths.bower + '/bootstrap/dist/css/*.min.css*')
        .pipe(gulp.dest(paths.static + '/css'));
    gulp.src(paths.bower + '/bootstrap/dist/js/*.min.js')
        .pipe(gulp.dest(paths.static + '/js'));
    gulp.src(paths.bower + '/bootstrap/dist/fonts/*.*')
        .pipe(gulp.dest(paths.static + '/fonts'));

    gulp.src(paths.bower + '/bootstrap-validator/dist/*.min.js')
        .pipe(gulp.dest(paths.static + '/js'));

    gulp.src(paths.bower + '/font-awesome/css/*.min.css*')
        .pipe(gulp.dest(paths.static + '/css'));
    gulp.src(paths.bower + '/font-awesome/fonts/*.*')
        .pipe(gulp.dest(paths.static + '/fonts'));

    gulp.src(paths.bower + '/bootstrap-markdown/css/*.min.css*')
        .pipe(gulp.dest(paths.static + '/css'));
    gulp.src(paths.bower + '/bootstrap-markdown/js/*.js*')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static + '/js'));
    gulp.src(paths.bower + '/bootstrap-markdown/locale/bootstrap-markdown.zh.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static + '/js'));

    gulp.src(paths.bower + '/marked/marked.min.js')
        .pipe(gulp.dest(paths.static + '/js'));

    gulp.src(paths.bower + '/highlightjs/highlight.pack.min.js')
        .pipe(gulp.dest(paths.static + '/js'));
    gulp.src(paths.bower + '/highlightjs/styles/monokai.css')
        .pipe(minify())
        .pipe(rename({
            prefix: 'highlight-',
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static + '/css'));
});

gulp.task('css', function() {
    sass(paths.sass + '/style.scss', {
            style: 'compressed',
            loadPath: [paths.sass]
        })
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.static + '/css'));
});

gulp.task('service', function() {
    gulp.src(['./server.js'])
        .pipe(expressService({
            file: './server.js'
        }))
        .on('error', function(e) {
            console.log(e.message, e.stack);
        });
});


gulp.task('watch', function() {
    gulp.watch(paths.sass + '/**/*.scss', ['css']);
    gulp.watch(['./server.js', './server/**/*.js', './server/**/*.json'], ['service']);
});

gulp.task('default', ['bower', 'css', 'service', 'watch']);
