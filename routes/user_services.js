var path = require('path');
var mysql = require('mysql');
var query = require('../helper/db_connection');
var date = require('date-and-time');
var jwt = require('jwt-simple');
var config = require('../config/config.json');
var waterfall = require('a-sync-waterfall');
var moment = require('moment');
var randomstring = require("randomstring");
const request = require('request');

var user_services = {
  sendEmail: function(req, res){
  //const sendmail = require('sendmail')();
  let from = req.body.from;
  let sender = req.body.sender;
  let to = req.body.to;
  let cc = req.body.cc;
  let bcc = req.body.bcc;
  let replyTo = req.body.replyTo;
  let inReplyTo = req.body.inReplyTo;
  let subject = req.body.subject;
  let html = req.body.html;
  console.log(from+ " - "+ to +" - "+ html);
  const sendmail = require('sendmail')({
    logger: {
      debug: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    },
    silent: false
    //,devPort: 1025, // Default: False 
    //devHost: 'localhost' // Default: localhost 
  })
  sendmail({
      from: from,
      sender: sender,
      to: to,
      cc: cc,
      bcc: bcc,
      replyTo: replyTo,
      inReplyTo: inReplyTo,
      subject: subject,
      html: html,
    }, function(err, reply) {
      console.log(err && err.stack);
      console.dir(reply);
  });

    res.json({
      "status": "ok1",
      "message": "Sent Success"
    });
  },
  getVoteResult: function(req, res){
    let event_id = req.query.event;
    let query_cmd_select = "";
    let params_select = [];
    if(req.query.limit !== undefined){
      params_select = [event_id, event_id, req.query.limit * 1];
      query_cmd_select = "SELECT DISTINCT(booth.ID), booth.booth_name, booth.description, COUNT(vote1.user_id) as no FROM booth LEFT JOIN (SELECT * from vote WHERE vote_count = 0 AND vote.distance >=0 AND vote.distance <= (SELECT allowed_distance FROM event_s WHERE ID = ? )) vote1 ON vote1.booth_id = booth.ID WHERE booth.event_id = ? GROUP BY booth.ID ORDER BY no DESC limit ?";
    }else{
      params_select = [event_id, event_id];
      query_cmd_select = "SELECT DISTINCT(booth.ID), booth.booth_name, booth.description, COUNT(vote1.user_id) as no FROM booth LEFT JOIN (SELECT * from vote WHERE vote_count = 0 AND vote.distance >=0 AND vote.distance <= (SELECT allowed_distance FROM event_s WHERE ID = ? )) vote1 ON vote1.booth_id = booth.ID WHERE booth.event_id = ? GROUP BY booth.ID ORDER BY no DESC";
    }
    query_cmd_select_inv = "SELECT DISTINCT(booth.ID), booth.booth_name, booth.description, COUNT(vote1.user_id) as no FROM booth LEFT JOIN (SELECT * from vote WHERE vote_count > 0 OR vote.distance = -1 OR vote.distance > (SELECT allowed_distance FROM event_s WHERE ID = ? )) vote1 ON vote1.booth_id = booth.ID WHERE booth.event_id = ? GROUP BY booth.ID ORDER BY no DESC"
    params_select_inv = [event_id, event_id];
    let data = new Array();
    let data2 = new Array();
    let data3 = new Array();
    console.log(mysql.format(query_cmd_select, params_select) );
    query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
      for(let i=0; i<result_1.length; i++){
        let datum = new Object;
        datum.rank = i+1;
        datum.booth_id = result_1[i].ID;
        datum.booth_name = result_1[i].booth_name;
        datum.booth_description = result_1[i].booth_description;
        datum.vote_number = result_1[i].no;
        if(datum.vote_number == null){datum.vote_number = 0};
        data[i] = datum;
      }
      
      query(mysql.format(query_cmd_select_inv, params_select_inv)).then(function(result_2){
        for(let i=0; i<result_2.length; i++){
          let datum2 = new Object;
          datum2.rank = i+1;
          datum2.booth_id = result_2[i].ID;
          datum2.booth_name = result_2[i].booth_name;
          datum2.booth_description = result_2[i].booth_description;
          datum2.vote_inv = result_2[i].no;
          if(datum2.vote_inv == null){datum2.vote_inv = 0};
          data2[i] = datum2;
        }
        for(let i=0; i<data.length; i++){
          for(let j=0; j<data2.length; j++){
            if(data[i].booth_id == data[j].booth_id){
              let datum3 = new Object;
              datum3 = data[i];
              datum3.vote_invalid = data2[j].vote_inv;
              datum3.vote_total = data2[j].vote_inv + data[i].vote_number;
              data3[i] = datum3;
              //console.log(datum3);
              break;
            }
          }
        }
        
        res.json({
          "status": "ok1",
          "message": "Vote result extracted",
          "data": data3
        });  
      }); 
    }).catch(function(err){
        console.log(err);
        res.status(config.http_code.in_server_err);
        res.json({
          "status": "err1",
          "message": "Internal Server Error"
        });
    });
  },
  setParameter: function(req, res){
    let params_update =[req.body.value, req.body.parameter];
    let query_cmd_update = "UPDATE setting SET value = ? WHERE parameter = ?";
    query(mysql.format(query_cmd_update, params_update)).then(function(result_1){
      res.json({
        "status": "ok1",
        "message": "Update Success"
      });  
    });
  },
  randomDraw: function(req, res){
    let event_id = req.query.event;
    let params_select =[event_id, 'voted', event_id];
    let query_cmd_select = "SELECT user.user_id, user.Name, user.NPK, business_unit.initial_name FROM vote, users user, business_unit WHERE user.BU=business_unit.id AND user.user_id = vote.user_id AND user.winner IS NULL AND user.event_id = ? AND user.status = ? AND vote.vote_count=0 AND vote.distance<=(SELECT allowed_distance FROM event_s WHERE id = ?) ORDER BY RAND() LIMIT 1";
    console.log(mysql.format(query_cmd_select, params_select));
    query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
      if(result_1.length > 0){
        let user = new Object();
        user.name = result_1[0].Name;
        user.npk = result_1[0].NPK;
        user.bu = result_1[0].initial_name;
        let param_update = [result_1[0].user_id, event_id];
        let query_cmd_update = "UPDATE users SET winner = 1 WHERE user_id = ? AND event_id = ?";
        query(mysql.format(query_cmd_update, param_update));
        res.status(config.http_code.ok);
        res.json({
          "status": "ok1",
          "message": "Winner selected",
          "data": user
        });
      }else{
        res.status(config.http_code.ok);
        res.json({
          "status": "ok2",
          "message": "No Winner selected",
          "data": ""
        });   
      }
    });
  },
  vote: function(req, res){
    let event_id = req.query.event;
    let user = jwt.decode(req.body.token, config.jwt_signature).user;
    waterfall([
      function check(isauth){
        let params_select =[req.body.token];
        let query_cmd_select = "SELECT user_id, SUBSTRING(user.CheckedIn_at,1,4) as checkedIn FROM users user WHERE token = ? limit 1";
        console.log(mysql.format(query_cmd_select, params_select));
        query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
          let isCheckedin = 0;
          //console.log(result_1.length+ " " +result_1[0].user_id + " "+ user + " " + req.body.userID);
          if(result_1.length>0 && result_1[0].user_id == user && req.body.userID == user){
            if(result_1[0].checkedIn > 0){
              isCheckedin = 1;
            }
            isauth(null, 1, isCheckedin);
          }else{
            isauth(null, 2, isCheckedin);
          }
        });
      },
      function isAlreadyVote(isauth, isCheckedin, isVote){
        let params_select =[req.body.userID, event_id];
        let query_cmd_select = "SELECT count(user_id) as no FROM vote, booth WHERE user_id = ? "+
        "AND booth.ID=vote.booth_id AND booth.event_id = ?";
        console.log(mysql.format(query_cmd_select, params_select));
        query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
          if(result_1[0].no == 1){
              isVote(null, isauth, isCheckedin, 1, "");
          }else{
            // console.log("aaa");
            if(req.body.status == "ok1"){
              admin_services.getLocation(req.body.coordinate, event_id, function(location){
                //console.log(JSON.stringify(location));
                isVote(null, isauth, isCheckedin, 2, location);
              });
            }else{
              let location = new Object(); 
              location.distance = -1;
              location.voteFrom = "user declined location service!";
              isVote(null, isauth, isCheckedin, 2, location);
            }
 
          }
        });
      },
      //function isCheckedIn(){},
      function vote(isauth, isCheckedin, isVote, location, result){;
        //isVote = 1 ==> already vote
        //isAuth = 1 ==> is authorized to vote
        if(isauth==1){
          if(isVote != 1){
            if(isCheckedin == 1){
              //vote
              let current_time = new Date();
              let params_select =[req.body.userID, req.body.boothID, req.body.coordinate, location.distance, location.voteFrom, req.body.noOfVote];
              let query_cmd_select = "INSERT INTO vote (user_id, booth_id, voted_from, distance, vote_address, vote_count) VALUES (?,?,?,?,?,?)";
              //console.log(mysql.format(query_cmd_select, params_select));
              query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
                if(result_1.affectedRows == 1){
                  let param_update = [current_time, 'voted', req.body.userID];
                  let query_cmd_update = "UPDATE users SET voted_at = ?, status = ? WHERE user_id = ?";
                  query(mysql.format(query_cmd_update, param_update));
                  result(null, 0);
                }else{
                  console.log("unknown error");
                  result(null, 3);
                }
              }).catch(function(err){
                console.log(err);
                result(null, 3);
              });
              
            }else{
              //belum checkedIn
              result(null, 4);
            }
          }else{
            result(null, 1);
          }
        }else{
          //unauthorized
          result(null, 2);
        }
      }
    ],function (err, result, token){
      if(result == 0){
        res.status(config.http_code.ok);
        res.json({
          "status": "ok1",
          "message": "Vote Success"
        });
      }else if(result == 1){
        res.status(config.http_code.ok);
        res.json({
          "status": "err1",
          "message": "already vote"
        });        
      }else if(result == 2){
        res.status(config.http_code.ok);
        res.json({
          "status": "err2",
          "message": "Not Authorized"
        });
      }else if(result == 4){
        res.status(config.http_code.ok);
        res.json({
          "status": "err3",
          "message": "Please Check in first"
        });
      }else{
        console.log(err);
        res.status(config.http_code.in_server_err);
        res.json({
          "status": "err4",
          "message": "Internal Server Error"
        });
      }
    }
  );
  },
  // private method
  genToken: function(user, booth_id, isCheckedin) {
    var expires = moment().add(config.token.duration, config.token.duration_unit).valueOf(); //20 seconds
    //var expires = moment().add(12,'hours').valueOf(); //12 hours
    var payload = { user: user, exp: expires };
    //payload.exp = expires;
    var token = jwt.encode(
        payload,
        //{exp: expires},
        config.jwt_signature
    );
    
    return {
        user_id: user,
        isCheckedIn: isCheckedin,
        vote_for_booth: booth_id,
        token: token
    };
  },
  email1: function(req, res){
    request.post('https://AC127ffd8a64100dc14dde4660bb5b9f9f:4b7a5bc000682b815e3f96a5835ab7f8@telin.restcomm.com/restcomm/2012-04-24/Accounts/AC127ffd8a64100dc14dde4660bb5b9f9f/Email/Messages', {
        form: {
          To: 'herdi.16@gmail.com',
          From: 'no_reply@telin.com',
          Body: 'login success',
          Subject: 'login notification'
        }})
  },
  login3: function(req,res){
    console.log(JSON.stringify(req.body));
    waterfall([
      function login1(isOk){
      let params_select =[req.body.username, req.body.token, req.body.otp];
      let query_cmd_select = "select * from telin_user where username=? and token = ? and otp = ?";
      console.log(mysql.format(query_cmd_select, params_select));
      query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
      if(result_1.length>0){
        console.log("a");
        var data2 = [];
        data2.email = result_1[0].email;
        isOk(null,"1", data2);
      }else{
        console.log("b");
        isOk(null, "0", null)
      }
        });
      },
    ],function (err, result, data2){
      if(result=="1"){
        console.log("here1");
        request.post('https://AC127ffd8a64100dc14dde4660bb5b9f9f:4b7a5bc000682b815e3f96a5835ab7f8@telin.restcomm.com/restcomm/2012-04-24/Accounts/AC127ffd8a64100dc14dde4660bb5b9f9f/Email/Messages', {
        form: {
          To: data2.email,
          From: 'no_reply@telin.com',
          Body: 'login success',
          Subject: 'login notification'
        }})
        res.json({
          "status": "ok1",
          "message": "Login Success, email sent"
        });
      }else{
        console.log("here2");
        res.json({
          "status": "fail1",
          "message": "Token or OTP not valid"
        });
      }
    });
    
  },
  login2: function(req,res){
    console.log(JSON.stringify(req.body));
    waterfall([
      function login1(isOk){
      let params_select =[req.body.username, req.body.password];
      let query_cmd_select = "select * from telin_user where username = ? and password = ?";
      console.log(mysql.format(query_cmd_select, params_select));
      query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
      if(result_1.length>0){
        var data= [];
        data.phone = result_1[0].phone;
        data.username = result_1[0].username;
        data.email =  result_1[0].email;
        //console.log(data.phone);
        isOk(null,"1", data);
      }else{
        //console.log("b", null);
        isOk(null, "0")
      }
        });
      },
    ],function (err, result, data){
      JSON.stringify(data);
      if(result=="1"){
        var otp = randomstring.generate({
          length: 5,
          charset: 'numeric'
        });
        var token = randomstring.generate({
          length: 12,
          charset: 'alphabetic'
        });
        let params_update =[token, otp, req.body.username];
        let query_cmd_update = "UPDATE telin_user SET token = ?, otp =? WHERE username=?";
        request.post('https://AC127ffd8a64100dc14dde4660bb5b9f9f:4b7a5bc000682b815e3f96a5835ab7f8@telin.restcomm.com/restcomm/2012-04-24/Accounts/AC127ffd8a64100dc14dde4660bb5b9f9f/SMS/Messages', {
        form: {
          To: data.phone,
          From: '+1234',
          Body: 'your otp code is: ' + otp
        }
      })
        query(mysql.format(query_cmd_update, params_update)).then(function(result_1){});
        res.json({
          "status": "ok1",
          "message": "Login Success",
          "token": token
        });
      }else{
        res.json({
          "status": "fail1",
          "message": "Login Failed"
        });
      }
    });
    
  },
  login: function(req, res){
    let event_id = req.query.event;
    waterfall([
      function check(isauth){
        let params_select =[event_id, req.body.bu, req.body.npk, req.body.pin, 1];
        let query_cmd_select = "select users.user_id, SUBSTRING(users.CheckedIn_at,1,4) as checkedIn, table1.booth_name from users LEFT JOIN "+
        "(select booth.ID as booth_id, booth.event_id, vote.user_id, booth.booth_name FROM vote LEFT JOIN "+
        "booth on vote.booth_id = booth.id "+
        "WHERE booth.event_id = ?) as table1 "+
        "on table1.user_id = users.user_id "+
        "WHERE bu = ? and npk = ? and pin = ? limit ?;"
        console.log(mysql.format(query_cmd_select, params_select));
        query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
          if(result_1.length>0 && result_1[0].user_id != ""){
            let isCheckedin = 0;
            if(result_1[0].checkedIn > 0){
              isCheckedin = 1;
            }
            isauth(null, 1, result_1[0].user_id, result_1[0].booth_name, isCheckedin);
          }else{
            isauth(null, 2, "", "", "");
          }
        });
      },
      function insertToken(isauth, user_id, booth_id, isCheckedin, result){
        let token = user_services.genToken(user_id, booth_id, isCheckedin);
        if(isauth == 1){
          let params_update =[token.token, req.body.npk, req.body.bu];
          let query_cmd_update = "UPDATE users SET token = ? WHERE NPK=? AND BU = ?";
          query(mysql.format(query_cmd_update, params_update)).then(function(result_1){
            if(result_1.affectedRows = 1){
              //console.log(isCheckedin);
              /*
              if(isCheckedin == 0){
                data = new Object();
                data.action = "checkIn";
                data.id = user_id;
                data.event_id = event_id;
                user_services.checkInOut(data);
              }
              */
              result(null, 0, token);
            }else{
              result(null, 1, "");
            }
          });
        }else{
          result(null, 2, "");
        }
      }
    ],function (err, result, token){
      if(result == 0){
        res.status(config.http_code.ok);
        res.json({
          "status": "ok1",
          "message": "Login Success",
          "data": token
        });
      }else if(result == 1){
        res.status(config.http_code.ok);
        res.json({
          "status": "err1",
          "message": "Login Failed"
        });        
      }else if(result == 2){
        res.status(config.http_code.ok);
        res.json({
          "status": "err2",
          "message": "Not Authorized"
        });
      }else{
        console.log(err);
        res.status(config.http_code.in_server_err);
        res.json({
          "status": "err3",
          "message": "Insert Failed"
        });
      }
    });
  },
  register: function(req, res){
    let event_id = req.query.event;
    waterfall([
      function check(auth){
        let params_select =[req.body.npk, req.body.bu, event_id, 1];
        let query_cmd_select = "SELECT COUNT(user_id) as no FROM users user WHERE NPK=? AND BU=? AND event_id = ? limit ?";
        query(mysql.format(query_cmd_select, params_select)).then(function(result_1){
          auth(null, result_1[0].no);
        });
      },
      function check2(auth, auth2){
        if(req.body.pin.length > 4){
          auth2(null, auth, "2");
        }else{
          let params_select2 =[event_id, 'active'];
          let query_cmd_select2 = "SELECT COUNT(ID) as no FROM event_s WHERE ID = ? AND status = ? limit 1";
          query(mysql.format(query_cmd_select2, params_select2)).then(function(result_2){
            console.log(JSON.stringify(result_2));
            if(result_2.length == 1 && result_2[0].no == 1){
              auth2(null, auth, "0");
            }else{
              auth2(null, auth, "1");
            }
          })
        }
      },
      function register(auth, auth2, result){
        if(auth == "0" && auth2 == "0"){
          let current_time = new Date();
          let params = new Array();
          let param_values = req.body;
          let params_insert = [param_values.name, param_values.npk, param_values.pin, current_time, "Registered", param_values.bu, param_values.phone, event_id];
          let query_cmd_insert = "INSERT INTO users (name, npk, pin, registered_at, status, bu, phone, event_id) "+
          "VALUES (?,?,?,?,?,?,?,?);";
          console.log(mysql.format(query_cmd_insert, params_insert));
          query(mysql.format(query_cmd_insert, params_insert))
          .then(function(results){
            if(results.affectedRows == 1){
              result(null, "success");
            }else{
              result(null, "fail");
            }
          }); 
        }else if(auth == "0" && auth2 == "1"){
          result(null, "inactive event");
        }else if(auth == "0" && auth2 == "2"){
          result(null, "pin2");
        }else{
          result(null, "already");
        }
      }
    ],
    function (err, result){
      if(result == "success"){
        res.status(config.http_code.ok);
        res.json({
          "status": "ok1",
          "message": "Successfully Registered"
        });
      }else if(result == "already"){
        res.status(config.http_code.ok);
        res.json({
          "status": "err1",
          "message": "Already registered"
        });        
      }else if(result == "pin2"){
        res.status(config.http_code.ok);
        res.json({
          "status": "err2",
          "message": "Max PIN length is 4 digits number"
        });
      }else if(result == "inactive event"){
        res.status(config.http_code.ok);
        res.json({
          "status": "err3",
          "message": "Cannot register, event is inactive"
        });
      }
      else{
        console.log(err);
        res.status(config.http_code.in_server_err);
        res.json({
          "status": "err4",
          "message": "Insert Failed"
        });
      }
    }
  );
  },
  getAllBu: function(req, res){
    let params_select =[];
    let query_cmd_select = "SELECT * FROM business_unit";
    let bus = new Array();
    query(mysql.format(query_cmd_select, params_select)).then(function(result){
      for(let i=0; i<result.length; i++){
        let bu = new Object();
        bu.id = result[i].ID;
        bu.shortName = result[i].initial_name;
        bu.longName = result[i].full_name;
        bus[i] = bu;
      }
      res.status(config.http_code.ok);
      res.json({
        "status": "ok1",
        "data": bus
      });
    }).catch(function(err){
      console.log(err);
      res.status(config.http_code.in_server_err);
      res.json({
        "status": "err1",
        "message": "Internal Server Error"
      });
    });
  },
  deleteBooth: function(req, res){
    let param_check = [req.body.boothID];
    let cmd_query_check = "DELETE FROM booth WHERE ID = ?";
    //console.log(mysql.format(cmd_query_check, param_check));
    query(mysql.format(cmd_query_check, param_check)).then(function(result){
      //console.log(JSON.stringify(bu));
      if(result.affectedRows == 1){
        res.status(config.http_code.ok);
        res.json({
          "status": "ok1",
          "message": "data deleted" 
        });
      }else{
        res.status(config.http_code.ok);
        res.json({
          "status": "err1",
          "message": "no data deleted" 
        });
      }
    }).catch(function(err){
      console.log(err);
      res.status(config.http_code.in_server_err);
      res.json({
        "status": "err2",
        "message": "Internal Server Error"
      });
    });
  },
  insertBooth: function(req, res){
    let event_id = req.query.event;   
    waterfall([
      function checkDuplicate(data){
        let names = "";
        let sparator = ",";
        for(let i=0; i<req.body.length; i++){
          if((i+1)==req.body.length){sparator="";}
          names =  names + "'"+req.body[i].booth_name+"'"+sparator;
          console.log(names);
        }
        let params = [event_id];
        let query_cmd = "SELECT * FROM booth WHERE EVENT_id = ? and booth_name in ("+names+")";
        let list_name =  new Array();
        console.log(mysql.format(query_cmd, params));
        query(mysql.format(query_cmd, params)).then(function(result){
          for(let i=0; i<result.length; i++){
            list_name[i] = result[i].booth_name;
          }
          data(null, list_name);
        });
      },
      function insertBooth(data, result){
        console.log(data.length);
        if(data.length > 0){
          console.log("duplicate");
          result(1, data);
        }else{
          console.log("no duplicate");
          for(let i=0; i<req.body.length; i++){
            let params = [req.body[i].event_id, req.body[i].booth_name, req.body[i].booth_desc];
            let query_cmd = "INSERT INTO booth (event_id, booth_name, description) values (?,?,?)";
            console.log(mysql.format(query_cmd, params));
            query(mysql.format(query_cmd, params)).then(function(result){
            });
          }
          result(null, data);
        }
      }
    ],function(err, result){
      if(err == 1){
        res.status(config.http_code.ok);
        res.json({
          "status": "err1",
          "message": "Booth names duplicate",
          "data": result
        });
      }else{
        res.status(config.http_code.ok);
        res.json({
          "status": "ok1",
          "message": "Booths inserted"
        });
      }
    }
    )
  },
  getAllBooth: function(req, res){
    let event_id = req.query.event;
    let params_select =[event_id];
    let query_cmd_select = "SELECT ID, booth_name, description FROM booth WHERE event_id = ?";
    let booths = new Array();
    query(mysql.format(query_cmd_select, params_select)).then(function(result){
      for(let i=0; i<result.length; i++){
        let booth = new Object();
        booth.boothID = result[i].ID;
        booth.boothName = result[i].booth_name;
        booth.description = result[i].description;
        booths[i] = booth;
      }
      res.status(config.http_code.ok);
      res.json({
        "status": "ok1",
        "data": booths
      });
    }).catch(function(err){
      console.log(err);
      res.status(config.http_code.in_server_err);
      res.json({
        "status": "err1",
        "message": "Internal Server Error"
      });
    });
  },
  getParticipantList: function(req, res){
    let status = req.query.status;
    let event_id = req.query.event;
    if(event_id == '' || event_id == 'all'){
      res.status(config.http_code.in_server_err);
      res.json({
        "status": "err1",
        "message": "Event ID is mandatory!"
      });
      return;
    }
    if(status == "all"){status = ""}
    if(event_id == "all"){event_id = ""}
    let params_select =[event_id, "%"+status+"%", event_id];
    let query_cmd_select = "SELECT table2.*, checkin.distance  as c_distance, checkin.voted_from as checkin_from FROM (SELECT table0.*, table1.vote_address, table1.distance, (table1.distance <= (SELECT allowed_distance FROM event_s WHERE id = ?) AND table1.distance > -1  AND table1.vote_count = 0) as isValid FROM (SELECT user.*, business_unit.initial_name FROM users user LEFT JOIN business_unit ON user.BU = business_unit.ID WHERE user.Status LIKE ? AND event_id = ?) as table0 LEFT JOIN (SELECT vote.*, event_s.id as e_id FROM vote, event_s, booth WHERE booth.event_id = event_s.ID AND booth.ID = vote.ID) table1 ON table0.user_id = table1.user_id AND table0.event_id = table1.e_id) as table2 LEFT JOIN checkin ON table2.user_id = checkin.user_id AND table2.event_id = checkin.event_id;";
    let users = new Array();
    console.log(mysql.format(query_cmd_select, params_select));
    query(mysql.format(query_cmd_select, params_select)).then(function(result){
      for(let i=0; i<result.length; i++){
        let user = new Object();
        user.id = result[i].user_id;
        user.Name = result[i].Name;
        user.NPK = result[i].NPK;
        user.register_date = result[i].Registered_at;
        user.checkin_date = result[i].CheckedIn_at;
        user.vote_date = result[i].voted_at;
        user.event_id = result[i].event_id;
        user.status = result[i].Status;
        //if(user.status == "registered"){
        //  user.status = false;
        //}else if(user.status == "checkedIn"){
        //  user.status = true;
        //}
        user.phone = result[i].Phone;
        user.bu = result[i].BU;
        user.initial_name = result[i].initial_name;
        user.isWinner = result[i].winner;
        user.vote_from = result[i].vote_address;
        user.vote_isValid = result[i].isValid;
        user.vote_distance_in_meter = result[i].distance;
        user.checkin_distance_in_meter = result[i].c_distance;
        user.checkin_from = result[i].checkin_from;
        users[i] = user;
      }
      res.status(config.http_code.ok);
      res.json({
        "status": "ok1",
        "data": users
      });
    }).catch(function(err){
      console.log(err);
      res.status(config.http_code.in_server_err);
      res.json({
        "status": "err1",
        "message": "Internal Server Error"
      });
    });
  },
  checkInOut_req: function(req, res){
    data = new Object();
    data.action = req.body.action;
    data.id = req.body.user_id;
    data.event_id = req.query.event;
    user_services.checkInOut(data);
  },
  checkInOut: function(req, res){
    waterfall([
      function checkDistance(distnce){
        let input = req.body;
        let input2 = req.query;
        if(input.coordinate == "" ){
          distnce("distnce",0)
        }else{
          let query_cmd = "SELECT allowed_distance FROM event_s WHERE ID=?";
          let query_params = [input2.event];
          //console.log(mysql.format(query_cmd, query_params));
          admin_services.getLocation(input.coordinate, input2.event, function(location){
            console.log(JSON.stringify(location));
            allowed_loc = location.distance;
            query(mysql.format(query_cmd, query_params)).then(function(result){
              console.log(result[0].allowed_distance + " - "+allowed_loc);
              if(allowed_loc == -1){
                distnce("distnce",-1);
              }else{
                if(result[0].allowed_distance < allowed_loc){
                  distnce("distnce",allowed_loc)
                }else{
                  distnce(null,result[0].allowed_distance);
                }
              }

            })
          });
        }
      },
      function checkRecord(distnce, status){
        let input = req.body;
        let input2 = req.query;
        let query_cmd = "SELECT count(ID) AS no FROM checkin WHERE user_id = (SELECT user_id FROM users WHERE NPK = ? AND BU = ? AND event_id = ?)  AND event_id = ?";
        let query_params = [input.npk, input.bu, input2.event, input2.event];
        //console.log(mysql.format(query_cmd, query_params));
        query(mysql.format(query_cmd, query_params)).then(function(result){
          admin_services.getLocation(input.coordinate, input2.event, function(location){
            //console.log(JSON.stringify(location));
            status(null, result[0].no, location);
          });
        }).catch(function(err){
            console.log("error:"+ err);
            status(err, "", "");
        });
      },
      function docheckinout(status, location, result){
        let input = req.body;
        let input2 = req.query;
        let query_cmd_update = "";
        let current_time = new Date();
        if(input.action == "checkIn"){
          console.log("status:" +status);
          if(status == 1){
            //update
            //console.log(location);
            query_cmd_update = "UPDATE users SET checkedIn_at = ?, Status =? WHERE NPK =? AND BU = ? AND event_id=?; "+
            "UPDATE checkin SET distance=?, voted_from=?, checkin_at=? WHERE user_id=(SELECT user_id FROM users WHERE NPK = ? AND BU = ? AND event_id = ?)";
            status = "checkedIn";
            params_update = [current_time, status, input.npk, input.bu, input2.event, location.distance, location.voteFrom, current_time, input.npk, input.bu, input2.event];
          }
          else{
            //insert
            query_userID = "SELECT user_id FROM users WHERE NPK = ? AND BU = ? AND event_id = ?";
            query_param_userID = [input.npk, input.bu, input2.event];

            query_cmd_update = "UPDATE users SET checkedIn_at = ?, Status =? WHERE NPK =? AND BU = ? AND event_id=?; "+
            "INSERT INTO checkin (distance, voted_from, user_id, checkin_at, event_id) values (?,?,("+mysql.format(query_userID, query_param_userID)+"),?,?);";
            status = "checkedIn";
            params_update = [current_time, status, input.npk, input.bu, input2.event, location.distance, location.voteFrom, current_time, input2.event];
          }
        }else{
          //delete
          query_cmd_update = "UPDATE users set checkedIn_at = ?, Registered_at = ?, Status =? WHERE NPK =? AND  BU = ? AND event_id=?;"+
          "DELETE FROM checkin where event_id=? AND user_id = (SELECT user_id FROM users WHERE NPK = ? AND BU = ? AND event_id = ?)";
          status = "registered";
          params_update = ['NULL', current_time, status, input.npk, input.bu, input2.event, input2.event, input.npk, input.bu, input2.event];
        }
        console.log(mysql.format(query_cmd_update, params_update));
        query(mysql.format(query_cmd_update, params_update)).then(function(data){
          if(data[0].affectedRows > 0){
            result(null, "ok");
          }
          else{
            result(null, "not ok");
          }
        }).catch(function(err){
          result(err, "");
        });
      }
    ],
    function (err, result){
      if(err!=null){
        console.log(err);
        //console.log(result);
        if(err == "distnce"){
          if(result == 0){
            res.status(config.http_code.ok);
            res.json({
              "status": "err2",
              "message": "Please enable location service!"
            });
          }else if(result == -1){
            res.status(config.http_code.ok);
            res.json({
              "status": "err3",
              "message": "Can not find location in map"
            });
          }else{
            res.status(config.http_code.ok);
            res.json({
              "status": "err4",
              "message": "You are to far from location, distance = "+result
            });
          }
        }else{
          res.status(config.http_code.in_server_err);
          res.json({
            "status": "err",
            "message": "Internal Server Error"
          });
      }
      }else{
        if(result == "ok"){
          res.status(config.http_code.ok);
          res.json({
            "status": "ok1",
            "message": "Successfully Updated"
          });
        }
        else{
          res.status(config.http_code.ok);
          res.json({
            "status": "ok2",
            "message": "No Record Updated"
          });
        }
      }
    }
    );
    /*
      let input = req.body;
      let input2 = req.query;
      let query_cmd_update = "";
      let status = "";
      let current_time = new Date();
      if(input.action == "checkIn"){
        query_cmd_update = "UPDATE users set checkedIn_at = ?, Status =? WHERE NPK =? AND BU = ? AND event_id=?";
        status = "checkedIn";
        params_update = [current_time, status, input.npk, input.bu, input2.event];
      }else{
        query_cmd_update = "UPDATE users set checkedIn_at = ?, Registered_at = ?, Status =? WHERE NPK =? AND  BU = ? AND event_id=?";
        status = "registered";
        params_update = ['NULL', current_time, status, input.npk, input.bu, input2.event];
      }
      console.log(mysql.format(query_cmd_update, params_update));
      query(mysql.format(query_cmd_update, params_update)).then(function(result){
        if(result.affectedRows == 1){
          res.status(config.http_code.ok);
          res.json({
            "status": "ok1",
            "message": "Successfully Updated"
          });
        }else{
          res.json({
            "status": "ok2",
            "message": "No Record Updated"
          });
        }
      }).catch(function(err){
        console.log(err);
        res.status(config.http_code.in_server_err);
        res.json({
          "status": "errq",
          "message": "Internal Server Error"
        });
      });
    */
  }
};
module.exports = user_services;