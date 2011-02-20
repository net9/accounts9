/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require("mongoose");

mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('User', new mongoose.Schema({
  username: { type: String, index: true },
  password: String,
  bio: String
}));
var User = mongoose.model('User');

exports.checkUser = function (username, callback) {
  User.count({ username: username }, function (err, count) {
    callback(count !== 0);
  });
};

exports.create = function (userinfo, callback) {
  var newUser = new User(userinfo);
  newUser.save(function (err) {
    if (err) callback(false, err);
    else callback(true, newUser.toObject());
  });
};

exports.getByName = function (username, callback) {
  User.findOne({ username: username }, function (err, user) {
    if (user === null) {
      callback(false, 'no-such-user');
    } else {
      callback(true, user.toObject());
    }
  });
};

exports.authenticate = function (username, password, callback) {
  User.findOne({ username: username }, function (err, user) {
    if (user === null || user.password !== password) {
      callback(false, 'user-pass-no-match');
    } else {
      callback(true, user.toObject());
    }
  });
};

exports.update = function (userinfo, callback) {
  User.findOne({ username: userinfo.username }, function (err, user) {
    user.merge(userinfo).save(function (err) {
      if (err) callback(false, err);
      else callback(true, user.toObject());
    });
  });
};


