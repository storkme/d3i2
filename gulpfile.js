/**
 * Created by stork on 07/02/2015.
 */

var gulp = require('gulp'),
    mocha = require('gulp-mocha');

gulp.task('default', function () {
    require('./d3i2-bootstrap');
    return gulp.src(['test/*-spec.js'], {read: false})
        .pipe(mocha({
            reporter: 'spec'
        }));
});

gulp.task('watch', function () {
    gulp.watch(['main.js', 'lib/**', 'test/**'], ['default']);
});