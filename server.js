var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var config = require('./config/config.json');

app.use(logger('dev'));
app.use(bodyParser.json());
 
 app.all('/*', function(req, res, next) {
   // CORS headers
   console.log(req.method);
   res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
   // Set custom headers for CORS
   res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,x-token');
   if (req.method == 'OPTIONS') {
     res.status(200).end();
   } else {
     next();
   }
 });
 
app.all('/admin/*', [require('./middlewares/validateRequest')]);
app.use('/images/banner', express.static('static/images/banner'));

// Auth Middleware - This will check if the token is valid
// Only the requests that start with /api/v1/* will be checked for the token.
// Any URL's that do not follow the below pattern should be avoided unless you 
// are sure that authentication is not needed
//app.all('/api/*', [require('./middlewares/validateRequest')]);
// to serve static images and create virtual directory
//app.use('/product_images', express.static('static/product_images/'));
//app.use('/api/images/payment', express.static('static/payment_images/'));
//app.use('/api/images/user', express.static('static/profile_images/'));
// API Routes
app.use('/', require('./routes/index'));
 
// If no route is matched by now, it must be a 404  (not found)
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
  res.json({
    "status": 404,
    "message": "API not found"
  });
});

// Start the server
app.set('port', process.env.PORT || config.server.port);   
  var server = app.listen(app.get('port'), function() {
     console.log('Express server listening on port ' + server.address().port);
  })