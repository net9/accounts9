/* vim: set sw=2 ts=2 nocin si: */

var ldap = require("./ldap"), config = require("./config").ldap;

// Connect to LDAP server, authenticate with master/given user, and return to
// the callback with the LDAP connection (or errors if present).
var connect = function (options, callback) {
  // "options" is optional (hey!)
  if (typeof options === "function") callback = options, options = {};

  // By default, we authenticate as the master user.
  options.dn = options.dn || config.master_dn;
  options.secret = options.secret || config.master_secret;

  // Open the connection and do the trick.
  var lconn = new ldap.Connection();
  lconn.open(config.server, function () {

    lconn.authenticate(options.dn, options.secret, function (success) {
      if (success) callback(null, lconn);
      else {
        // Hell. The module isn't even specifying *what* went wrong.
        // Rewrite later. XXX
        callback(1);
      }
    });

  }, function (err) {
    // Error callback
    callback(err);
  });
};

exports.checkUser = function (username, callback) {
  connect(function (err, lconn) {
    // If an error occurred during the connection, just temporarily
    // say that the username is occupied. XXX
    if (err) callback(true);
    lconn.search(config.user_base_dn, "uid=" + username, "*", function (result) {
      callback(result.length !== 0);
    });
  });
};

exports.create = function (userinfo, callback) {
  // Not implemented yet
  callback(false, 'not-implemented-yet');
};

var getByName = function (lconn, username, callback) {
  lconn.search(config.user_base_dn, "uid=" + username, config.fields, function (result) {
    if (result.length === 0) callback(false, 'no-such-user');
    else {
      callback(true, {
        username: result[0].uid[0],
        bio: result[0].cn[0]
      });
    }
  }, function (err) { callback(false, err); });
};

exports.getByName = function (username, callback) {
  connect(function (err, lconn) {
    if (err) callback(false, err);
    getByName(lconn, username, callback);
  });
};

exports.authenticate = function (username, password, callback) {
  // This is just about the same as exports.getByName, you just have to
  // authenticate as the real authenticating user instead of the master.
  console.log("trying auth with user:" + "uid=" + username + "," + config.user_base_dn + ";password is " + password);
  connect({
    dn: "uid=" + username + "," + config.user_base_dn,
    secret: password
  }, function (err, lconn) {
    if (err) callback(false, 'user-pass-no-match');
    else getByName(lconn, username, callback);
  });
};

exports.update = function (userinfo, callback) {
  // Not implemented yet
  callback(false, 'not-implemented-yet');
};

