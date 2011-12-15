/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require("mongoose"), utils = require("./utils");
var sys = require('sys');
mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('App', new mongoose.Schema({
  name:     { type: String, index: true },
  clientid: { type: String, index: true },
  secret:   String,
  desc:     String,
  owners:   [String]
}));

mongoose.model('UserAppRelation',new mongoose.Schema({
  username: { type: String, index:true },
  clientid: { type: String, index:true },
}));
 
var App = mongoose.model('App');
var UserAppRelation = mongoose.model('UserAppRelation')

exports.getAllByUser = function (username, callback) {
  App.find({ owners: username }, function (err, app_arr_raw) {
    UserAppRelation.find({ username:username },function (err,auth_app_arr_raw){
      var auth_app_arr = new Array()
      if(!err){
        if(auth_app_arr_raw.length==0){
          callback(true,app_arr_raw.map(function (app) { return app.toObject(); }),[])
          return;
        }
        for(var i=0;i<auth_app_arr_raw.length;++i){
          item=auth_app_arr_raw[i]
          sys.debug(username+' '+item.clientid)
          App.findOne( {clientid:item.clientid},function (err,auth_app){
            if(!err && auth_app!=null) {
              sys.debug("sync:"+i)
              auth_app_arr.push(auth_app)
              if(auth_app_arr.length == auth_app_arr_raw.length)
                callback(true,app_arr_raw.map(function (app) { return app.toObject(); }),auth_app_arr)
            }
        })
        }
       
      }   
  })})
};

exports.checkByName = function (appname, callback) {
  App.count({ name: appname }, function (err, count) {
    callback(count !== 0);
  });
};

exports.create = function (appinfo, callback) {
  var newApp = new App(appinfo);
  newApp.save(function (err) {
    if (err) callback(false, err);
    else callback(true, newApp.toObject());
  });
};

exports.getByID = function (clientid, callback) {
  App.findOne({ clientid: clientid }, function (err, app) {
    if (app === null) callback(false, 'app-not-found');
    else callback(true, app.toObject());
  });
};

exports.deleteByID = function (clientid, callback) {
  App.remove({ clientid: clientid }, function (err) {
    callback(err ? false : true, err);
  });
};

exports.authenticate = function (clientid, secret, callback) {
  App.findOne({ clientid: clientid }, function (err, app) {
    if (app === null) callback(false, 'no-such-app-clientid');
    else if (app.secret !== secret) callback(false, 'wrong-secret');
    else callback(true, app.toObject());
  });
};

exports.update = function (appinfo, callback) {
  App.findOne({ clientid: appinfo.clientid }, function (err, app) {
    utils.merge(app, appinfo).save(function (err) {
      if (err) callback(false, err);
      else callback(true, app.toObject());
    });
  });
};

exports.checkAuthorized = function(userid,appid,callback){
  UserAppRelation.findOne({userid:userid,appid:appid},function(err,item){
    sys.debug("check "+userid+" "+appid)
    if(err || item==null) return callback(false);
    else return callback(true)
  })
}
exports.markAuthorized = function(userid,appid) {
  relation = new  UserAppRelation({username:userid,clientid:appid});
  sys.debug("saving uid:"+userid+" aid:"+appid)
  relation.save(function(err){
    sys.debug("saved")
    if(err){
      sys.debug(err)
    }
  })
}

exports.removeAuthorized = function(userid,appid){
  UserAppRelation.remove({username:userid,clientid:appid},function(err){}) 
}
