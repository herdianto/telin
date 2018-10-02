var jwt = require('jwt-simple');
var config = require('../config/config.json');
var mysql = require('mysql');
var query = require('../helper/db_connection');
var waterfall = require('a-sync-waterfall');

module.exports = function(req, res, next) {
    var token = (req.body && req.body.token) || (req.query && req.query.token) || req.headers['x-token'];
    //var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];

    if(token){
        try {
            var decoded = jwt.decode(token, config.jwt_signature);
            if (decoded.exp <= Date.now()) {
                res.status(400);
                res.json({
                    "status": 400,
                    "message": "Token Expired"
                });
                return;
            } else {
                //console.log("validate request");
                //console.log();
                let params = [decoded.user, token];
                let query_cmd = "SELECT count(user_id) as no FROM admin WHERE user_id = ? AND token = ? limit 1;"
                query(mysql.format(query_cmd, params)).then(function(result){
                    if(result[0].no == 1){
                        next();
                    }else{
                        res.status(400);
                        res.json({
                            "status": 400,
                            "message": "Invalid Token!"
                        });
                return;
                    }
                }).catch(function(err){
                    console.log(error);
                    res.status(500);
                    res.json({
                        "status": 500,
                        "message": "Oops something went wrong",
                        "error": error
                    });
                });
            }
        }catch (error) {
                console.log(error);
                res.status(500);
                res.json({
                    "status": 500,
                    "message": "Oops something went wrong",
                    "error": error
                });
            }
    } else {
        res.status(401);
        res.json({
            "status": 401,
            "message": "Invalid Token or Key"
        });
        return;
    }
};