var gulp = require('gulp'),
  path = require('path');

var mocha = require('gulp-mocha');


gulp.task('test', function () {
  return gulp.src(['./test/allTests.js'], { read: false })
    .pipe(mocha({
      timeout: 60000,
      ui: 'exports',
      reporter: 'spec'
    }))
  ;
});


gulp.task('default', ['test']);




