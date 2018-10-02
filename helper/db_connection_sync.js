var config = require('../config/config.json');
var mysql = require('mysql');
var Promise = require('bluebird');
var using = Promise.using;
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

var pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database
});

var getConnection = function () {
 return pool.getConnection(function(err, connection){
   if(!err){
     return connection;
   }else{
      console.log("error: "+err);
   }
 });
};

var query = function (command) {
  return getConnection(function(err, connection){
    return connection.query(command);
  });
};

module.exports = query;
