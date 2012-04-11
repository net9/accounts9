var assert = require("assert");
var ldap = require("./ldap");
var config = require("../config").ldap;
var crypto = require("crypto");
var utils = require("../utils");

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

    lconn.authenticate(options.dn, options.secret, function (err) {
      if (!err) {
        callback(null, lconn);
      } else {
        lconn.close();
        callback(err);
      }
    });

  }, function (err) {
    lconn.close();
    // Error callback
    callback(err);
  });
};

exports.checkUser = function (username, callback) {
  if (username === '') {
    callback(true);
    return;
  }
  connect(function (err, lconn) {
    // If an error occurred during the connection, just temporarily
    // say that the username is occupied. XXX
    if (err) {
      callback(true);
    } else {
      lconn.search(config.user_base_dn, "(uid=" + username + ")", function (err, result) {
        lconn.close();
        callback(!result || result.length !== 0);
      });
    }
  });
};

var getByName = function (lconn, username, callback) {
  lconn.search(config.user_base_dn, "(uid=" + username + ")", function (err, result) {
    lconn.close();
    if (result == null || result.length == 0) {
      callback(false, 'no-such-user');
    } else {
      var f = function (field) {
        return result[0][field] ? result[0][field] : '';
      };
      callback(true, {
        username: f("uid"),
        uid: f("uidNumber"),
        nickname: f("displayName"),
        surname: f("sn"),
        givenname: f("givenName"),
        fullname: f("cn"),
        email: f("mail"),
        mobile: f("mobile"),
        website: f("labeledURI"),
        address: f("registeredAddress"),
        bio: f("description"),
        birthdate: f("birthdate"),
        nextNameChangeDate: +f("usernameNextChange")    // Should be a number
      });
    }
  }, function (err) {
    lconn.close();
    callback(false, err);
  });
};

exports.getByName = function (username, callback) {
  connect(function (err, lconn) {
    if (err) {
      callback(false, err);
    } else {
      getByName(lconn, username, callback);
    }
  });
};

exports.authenticate = function (username, password, callback) {
  // This is just about the same as exports.getByName, you just have to
  // authenticate as the real authenticating user instead of the master.
  connect({
    dn: "uid=" + username + "," + config.user_base_dn,
    secret: password
  }, function (err, lconn) {
    if (err) {
      callback(false, err);
    } else {
      getByName(lconn, username, callback);
    }
  });
};

var genPassword = function (rawpass) {
  // Generate SSHA password.
  var hash = crypto.createHash('sha1');
  hash.update(rawpass);
  hash.update('salt');

  // Hey, don't use too long a password... XXX
  var buf = new Buffer(256);
  var len = buf.write(hash.digest() + 'salt', 0, 'ascii');
  return '{SSHA}' + buf.toString('base64', 0, len);
};

exports.create = function (userinfo, callback) {
  connect(function (err, lconn) {
    if (err) callback(false, err);
    else {
      // First find a suitable uidNumber for our little guest.
      lconn.search(config.user_base_dn, "(objectClass=posixAccount)", function (err, result) {
        // The new uidNumber should be one greater than the current greatest.
        var newUid = result.reduce(function (house, guest) {
          uid = parseInt(guest.uidNumber);
          return house < uid ? uid : house;
        }, 0) + 1;
        if (newUid <= config.min_uid)
          newUid = config.min_uid + 1;
        userinfo.uidNumber = newUid;

        // Now prepare the attrs.
        var attrs = {
          uid: userinfo.username,
          sn: userinfo.username,
          cn: userinfo.username,
          objectClass: ['person', 'top', 'inetOrgPerson', 'organizationalPerson', 'posixAccount', 'shadowAccount', 'net9Person' ],
          mail: userinfo.email,
          userPassword: genPassword(userinfo.password),
          gidNumber: config.default_gid,
          uidNumber: userinfo.uidNumber,
          homeDirectory: config.home_directory + userinfo.username
        };

        // Add the user.
        var user_dn = 'uid=' + userinfo.username + ',' + config.user_base_dn;
        lconn.add(user_dn, attrs, function (err) {
          if (!err) {
            // Add user to the default group.
          	mods = {
          	  memberUid: userinfo.uidNumber
          	};
            lconn.attr_add('cn=' + config.default_group + ',' + config.group_base_dn, mods, function (err) {
              if (!err)
                getByName(lconn, userinfo.username, callback);
              else {
                //Roll back when error occurred
                lconn.del(user_dn, function (err) {
                  lconn.close();
                  assert.ifError(err);
                });
                callback(false, err);
              }
            });
          } else {
            lconn.close();
            callback(false, err);
          }
        });
      });
    }
  });
};

exports.update = function (userinfo, callback) {
  connect(function (err, lconn) {
    if (err)
      callback(false, err);
    else {
      var mods = {
        displayName:          userinfo.nickname,
        sn:                   userinfo.surname,
        givenName:            userinfo.givenname,
        cn:                   userinfo.fullname,
        mobile:               userinfo.mobile,
        labeledURI:           userinfo.website,
        registeredAddress:    userinfo.address,
        mail:                 userinfo.email,
        description:          userinfo.bio,
        birthdate:            userinfo.birthdate,
      };

      if (userinfo.password) {
        mods.modification.userPassword = genPassword(userinfo.password);
      }
      
      lconn.attr_modify('uid=' + userinfo.username + ',' + config.user_base_dn, mods, function (err) {
        if (!err)
          getByName(lconn, userinfo.username, callback);
        else {
          lconn.close();
          callback(false, err);
        }
      });
    }
  });
};

//TODO implement rename better
exports.rename = function (oldname, newname, callback) {
  connect(function (err, lconn) {
    if (err)
      callback(false, err);
    else {
      // Do the renaming.
      lconn.rename('uid=' + oldname + ',' + config.user_base_dn, 'uid=' + newname, function (err) {
        if (!err) {
          // Now update the name change date. For 30 days you can't touch it!
          lconn.modify('uid=' + newname + ',' + config.user_base_dn, [
            { type: 'usernameLastChange', vals: [ Date.now() ] },
            { type: 'usernameNextChange', vals: [ Date.now() + 2592000000 ] }
          ], function (err) {
            // Finally return the result.
            if (!err)
              getByName(lconn, newname, callback);
            else {
              lconn.close();
              callback(false, err);
            }
          });
        } else {
          lconn.close();
          callback(false, err);
        }
      });
    }
  });
};
