/* vim: set sw=2 ts=2 nocin si: */

var appbase = require('./appbase-mongo.js'),
    crypto = require('crypto');

exports.getAllByUser = function (username, callback) {
  appbase.getAllByUser(username, function (success, appsOrErr) {
    if (success) callback({ success: true, apps: appsOrErr });
    else callback({ success: false, error: appsOrErr });
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
        secret: appinfo.secret
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

