/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require("mongoose").Mongoose,
    db = mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('App', {
  properties: ['name', 'clientid', 'secret', 'desc', { 'owners' : [] }],
  indexes:    ['name', 'clientid', 'owners']
});
var App = db.model('App');

exports.getAllByUser = function (username, callback) {
  App.find({ owners: username }).all(function (arr) {
    callback(true, arr.map(function (app) { return app.toObject(); }));
  });
};

exports.checkByName = function (appname, callback) {
  App.count({ name: appname }, function (count) {
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

