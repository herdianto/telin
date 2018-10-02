var express = require('express');
var router = express.Router();
var config = require('../config/config.json');

var user_services = require('./user_services');

//favicon.ico request
router.post('/favicon.ico', function(req, res) {
    res.status(204);
    // to do: enhance to display website icon
    //res.status(config.http_code.ok);
    //res.res.sendFile('../favicon.png');
});

//admin services
router.post('/email', user_services.email1); //done
router.post('/login_user', user_services.login2); //done
router.post('/validate_otp', user_services.login3); //done

module.exports = router;