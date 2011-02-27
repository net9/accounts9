/* vim: set sw=2 ts=2 nocin si: */

var ldap = require("./ldap"), config = require("./config").ldap;
var crypto = require("crypto"), utils = require("./utils");

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
      if (!err) callback(null, lconn);
      else {
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
  if (username === '') { callback(true); return; }
  connect(function (err, lconn) {
    // If an error occurred during the connection, just temporarily
    // say that the username is occupied. XXX
    if (err) callback(true);
    else lconn.search(config.user_base_dn, "uid=" + username, "*", function (result) {
      lconn.close();
      callback(!result || result.length !== 0);
    });
  });
};

var getByName = function (lconn, username, callback) {
  lconn.search(config.user_base_dn, "uid=" + username, "*", function (result) {
    lconn.close();
    if (result.length === 0) callback(false, 'no-such-user');
    else {
      var f = function (field) {
        return result[0][field] ? result[0][field][0] : '';
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
        nextNameChangeDate: +f("businessCategory")    // Should be a number
      });
    }
  }, function (err) {
    lconn.close();
    callback(false, err);
  });
};

exports.getByName = function (username, callback) {
  connect(function (err, lconn) {
    if (err) callback(false, err);
    else getByName(lconn, username, callback);
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
      lconn.search(config.user_base_dn, "objectClass=posixAccount", "uidNumber", function (result) {
        // The new uidNumber should be one greater than the current greatest.
        var newUid = result.reduce(function (house, guest) {
          return house > +guest.uidNumber[0] ? house : +guest.uidNumber[0];
        }, 0) + 1;

        // Now prepare the mods.
        var mods = [
          { type: 'uid', vals: [ userinfo.username ] },
          { type: 'sn', vals: [ userinfo.username ] },
          { type: 'cn', vals: [ userinfo.username ] },
          { type: 'objectClass',
            vals: [ 'person', 'top', 'inetOrgPerson', 'organizationalPerson', 'posixAccount', 'shadowAccount' ] },
          { type: 'mail', vals: [ userinfo.email ] },
          { type: 'userPassword', vals: [ genPassword(userinfo.password) ] },
          { type: 'gidNumber', vals: [ 4999 ] },
          { type: 'uidNumber', vals: [ newUid ] },
          { type: 'homeDirectory', vals: [ '/home/' + userinfo.username ] }
        ];

        lconn.add('uid=' + userinfo.username + ',' + config.user_base_dn, mods, function (err) {
          if (!err) getByName(lconn, userinfo.username, callback);
          else {
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
    if (err) callback(false, err);
    else {
      var mods = [
        { type: 'displayName', vals: [ userinfo.nickname ] },
        { type: 'sn', vals: [ userinfo.surname ] },
        { type: 'givenName', vals: [ userinfo.givenname ] },
        { type: 'cn', vals: [ userinfo.fullname ] },
        { type: 'mail', vals: [ userinfo.email ] },
        { type: 'mobile', vals: [ userinfo.mobile ] },
        { type: 'labeledURI', vals: [ userinfo.website ] },
        { type: 'registeredAddress', vals: [ userinfo.address ] },
        { type: 'description', vals: [ userinfo.bio ] }
      ];

      if (userinfo.password) {
        mods.push({ type: 'userPassword', vals: [ genPassword(userinfo.password) ] });
      }

      lconn.modify('uid=' + userinfo.username + ',' + config.user_base_dn, mods, function (err) {
        if (!err) getByName(lconn, userinfo.username, callback);
        else {
          lconn.close();
          callback(false, err);
        }
      });
    }
  });
};

exports.rename = function (oldname, newname, callback) {
  connect(function (err, lconn) {
    if (err) callback(false, err);
    else {
      // Do the renaming.
      lconn.rename('uid=' + oldname + ',' + config.user_base_dn, 'uid=' + newname, function (err) {
        if (!err) {
          // Now update the name change date. For 30 days you can't touch it!
          lconn.modify('uid=' + newname + ',' + config.user_base_dn, [
            { type: 'businessCategory', vals: [ Date.now() + 2592000000 ] }
          ], function (err) {
            // Finally return the result.
            if (!err) getByName(lconn, newname, callback);
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

