/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require("mongoose"), utils = require("./utils");

mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('App', new mongoose.Schema({
  name:     { type: String, index: true },
  clientid: { type: String, index: true },
  secret:   String,
  desc:     String,
  owners:   [String]
}));
var App = mongoose.model('App');

exports.getAllByUser = function (username, callback) {
  App.find({ owners: username }, function (err, arr) {
    callback(true, arr.map(function (app) { return app.toObject(); }));
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

