/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require('mongoose');
var utils = require('./utils');
var util = require('util');

mongoose.connected = false;
mongoose.connection.on('open', function() {
  mongoose.connected = true;
});
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
var UserAppRelation = mongoose.model('UserAppRelation');

/*
- callback(err, apps, authapps)
*/
exports.getAllByUser = function (username, callback) {
  if (!mongoose.connected) {
    return callback('mongodb-not-connected');
  }
  App.find({ owners: username }, function (err, app_arr_raw) {
    if (err) {
      return callback(err);
    }
    var apps = app_arr_raw.map(function(app) {
      return app.toObject();
    });
    // Get authed apps
    UserAppRelation.find({ username:username }, function (err, authAppRaw) {
      if (err) {
        return callback(err, apps);
      }
      var authApps = [];
      if (authAppRaw.length == 0) {
        return callback(null, apps, authApps);
      }
      authAppRaw.forEach(function(item, index) {
        App.findOne({clientid: item.clientid}, function(err, auth_app) {
          if (err) {
            return callback(err, apps);
          }
          if (auth_app != null) {
            util.debug('sync:' + index);
            authApps.push(auth_app);
          }
          if (index == authAppRaw.length - 1) {
            callback(null, apps, authApps);
          }
        });
      });
    });
  });
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
  UserAppRelation.findOne({username:userid,clientid:appid},function(err,item){
    util.debug('check '+userid+' '+appid)
    if(err || item==null) return callback(false);
    else return callback(true)
  })
}
exports.markAuthorized = function(userid,appid) {
  relation = new  UserAppRelation({username:userid,clientid:appid});
  util.debug('saving uid:'+userid+' aid:'+appid)
  relation.save(function(err){
    util.debug('saved')
    if(err){
      util.debug(err)
    }
  })
}

exports.removeAuthorized = function(userid,appid){
  UserAppRelation.remove({username:userid,clientid:appid},function(err){}) 
}
