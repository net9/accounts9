/* vim: set sw=2 ts=2 nocin si: */

var userbase = require('./userbase-mongo');

exports.checkUser = function (username, callback) {
  userbase.checkUser(username, function (occupied) {
    callback({ username: username, occupied: occupied });
  });
};

exports.register = function (userinfo, callback) {
  // First make sure that the user doesn't exist.
  userbase.checkUser(userinfo.username, function (occupied) {
    if (occupied) {
      callback({ success: false, error: 'user-exists' });
      return;
    }

    // When everything looks good, insert the record.
    userbase.create(userinfo, function (result) {
      callback(result);
    });
  });
};

