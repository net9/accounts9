/* vim: set sw=2 ts=2 nocin si: */

var appbase = require('./base.js');
var crypto = require('crypto');

exports.getAllByUser = function (username, callback) {
  appbase.getAllByUser(username, function (err, apps, authapps) {
    if (!err) {
      callback({ success: true, apps: apps, authorizedapps: authapps});
    } else {
      callback({ success: false, error: err });
    }
  });
};

exports.checkByName = function (appname, callback) {
  appbase.checkByName(appname, function (occupied) {
    callback({ name: appname, occupied: occupied });
  });
};

exports.generateClientID = function (username, appname) {
  var hasher = crypto.createHash('sha1');
  hasher.update(username + '/' + appname);
  var digest = hasher.digest('base64');
  // In base64 notation the digest always ends with '='. So we lose that.
  // Also + and / might not be very URL-friendly. We replace those with - and _.
  return digest.slice(0, -1).replace(/\+/g, '-').replace(/\//g, '_');
};

function randomStr(l) {
  var x="123456789poiuytrewqasdfghjklmnbvcxzQWERTYUIPLKJHGFDSAZXCVBNM";
  var tmp="";
  for(var i=0;i< l;i++) {
  tmp += x.charAt(Math.ceil(Math.random()*100000000)%x.length);
  }
  return tmp;
}
exports.register = function (username, appinfo, callback) {
  // First make sure that no app by the same name exists.
  appbase.checkByName(appinfo.name, function (occupied) {
    if (occupied) callback({ success: false, appinfo: appinfo, error: 'app-name-taken' });
    else {
      appbase.create({
        name: appinfo.name,
        desc: appinfo.desc,
        owners: [username],
        clientid: exports.generateClientID(username, appinfo.name),
        secret: randomStr(20)
      }, function (success, appOrErr) {
        if (success) callback({ success: true, appinfo: appOrErr });
        else callback({ success: false, appinfo: appinfo, error: appOrErr });
      });
    }
  });
};

exports.getByID = function (clientid, callback) {
  appbase.getByID(clientid, function (success, appOrErr) {
    if (success) callback({ success: true, appinfo: appOrErr });
    else callback({ success: false, error: appOrErr });
  });
};

exports.deleteByID = function (clientid, callback) {
  appbase.deleteByID(clientid, function (success, err) {
    if (success) callback({ success: true });
    else callback({ success: false, error: err });
  });
};

exports.authenticate = function (appinfo, callback) {
  appbase.authenticate(appinfo.clientid, appinfo.secret, function (success, appOrErr) {
    if (success) callback({ success: true, appinfo: appOrErr });
    else callback({ success: false, error: appOrErr });
  });
};

exports.updateInfo = function (appinfo, callback) {
      appbase.update({
        clientid: appinfo.clientid,
        name: appinfo.name,
        desc: appinfo.desc
      }, function (success, appOrErr) {
        if (success) callback({ success: true, appinfo: appOrErr });
        else callback({ success: false, error: appOrErr });
      });
};

//
exports.checkAuthorized = function(userid,appid,callback){
  appbase.checkAuthorized(userid,appid,callback)
}
exports.markAuthorized = function(userid,appid) {
  appbase.markAuthorized(userid,appid)
}

exports.removeAuthorized = function(userid,appid){
  appbase.removeAuthorized(userid,appid)
}
