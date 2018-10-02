// NOTE: I previously suggested doing this through Grunt, but had plenty of problems with
// my set up. Grunt did some weird things with scope, and I ended up using nodemon. This
// setup is now using Gulp. It works exactly how I expect it to and is WAY more concise.
var gulp = require('gulp'),
    spawn = require('child_process').spawn,
    node;

/**
 * $ gulp server
 * description: launch the server. If there's a server already running, kill it.
 */
gulp.task('server', function() {
  if (node) node.kill()
  node = spawn('node', ['server.js'], {stdio: 'inherit'})
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
})

gulp.task('copy_dev', function () {
  gulp.src('./config/dev/config.json')
      .pipe(gulp.dest('./config'));
});

gulp.task('copy_prod', function () {
  gulp.src('./config/prod/config.json')
      .pipe(gulp.dest('./config/'));
});
/**
 * $ gulp
 * description: start the development environment
 */
gulp.task('default', function() {
  gulp.run('server')

  gulp.watch(['./helper/*.js', './routes/*.js', './middlewares/*.js', './model/*.js'], function() {
    gulp.run('server')
  })
  
  // Need to watch for sass changes too? Just add another watch call!
  // no more messing around with grunt-concurrent or the like. Gulp is
  // async by default.
})

// clean up if an error goes unhandled.
process.on('exit', function() {
    if (node) node.kill()
})


gulp.task('run_dev', function() {
  gulp.run('server')
  gulp.run('copy_dev')
  gulp.watch(['./helper/*.js', './routes/*.js', './middlewares/*.js', './model/*.js'], function() {
    gulp.run('server')
  })
  
  // Need to watch for sass changes too? Just add another watch call!
  // no more messing around with grunt-concurrent or the like. Gulp is
  // async by default.
})

gulp.task('run_prod', function() {
  gulp.run('server')
  gulp.run('copy_prod')
  gulp.watch(['./helper/*.js', './routes/*.js', './middlewares/*.js', './model/*.js'], function() {
    gulp.run('server')
  })
  
  // Need to watch for sass changes too? Just add another watch call!
  // no more messing around with grunt-concurrent or the like. Gulp is
  // async by default.
})