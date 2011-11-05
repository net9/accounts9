/* vim: set sw=2 ts=2 nocin si: */

var userbase = require('./userbase-ldap');

exports.checkUser = function (username, callback) {
  userbase.checkUser(username, function (occupied) {
    callback({ username: username, occupied: occupied });
  });
};

exports.register = function (userinfo, callback) {
  // Let's do some verification first! TODO: Better verification.
  if (!userinfo.password || !userinfo.email) {
    callback({ success: false, userinfo: userinfo, error: 'fields-required' });
  }
  // Now make sure that the user doesn't exist.
  userbase.checkUser(userinfo.username, function (occupied) {
    if (occupied) {
      callback({ success: false, userinfo: userinfo, error: 'Already exists' });
      return;
    }

    // When everything looks good, insert the record.
    userbase.create(userinfo, function (success, userOrErr) {
      if (success) {
        callback({ success: true, userinfo: userOrErr });
      } else {
        callback({ success: false, userinfo: userinfo, error: userOrErr });
      }
    });
  });
};

exports.getByName = function (username, callback) {
  userbase.getByName(username, function (success, userOrErr) {
    if (success) {
      callback({ success: true, userinfo: userOrErr });
    } else {
      callback({ success: false, username: username, error: userOrErr });
    }
  });
};

exports.authenticate = function (userinfo, callback) {
  userbase.authenticate(userinfo.username, userinfo.password, function (success, userOrErr) {
    if (success) {
      callback({ success: true, userinfo: userOrErr });
    } else {
      callback({ success: false, userinfo: userinfo, error: userOrErr });
    }
  });
};

var updateInfo = function (newinfo, callback) {
  userbase.update(newinfo, function (success, userOrErr) {
    if (success) {
      callback({ success: true, userinfo: userOrErr });
    } else {
      callback({ success: false, error: userOrErr });
    }
  });
};

exports.editInfo = function (newinfo, callback) {
  // Authenticate only if the user wants to change the password (ie. newinfo.newpass != '')
  if (newinfo.newpass) {
    userbase.authenticate(newinfo.username, newinfo.oldpass, function (success, userOrErr) {
      if (success) {
        newinfo.password = newinfo.newpass;
        updateInfo(newinfo, callback);
      } else {
        callback({ success: false, error: 'wrong-old-pass' });
      }
    });
  } else {
    updateInfo(newinfo, callback);
  }
};

exports.rename = function (nameChange, callback) {
  // First authenticate. We don't want strange things to happen...
  userbase.authenticate(nameChange.oldname, nameChange.password, function (success, userOrErr) {
    if (!success) {
      callback({ success: false, error: userOrErr });
    // Now double-check: Are you *really* allowed to rename yourself?
    } else if (userOrErr.nextNameChangeDate > Date.now()) {
      callback({ success: false, error: 'change-name-later|' + new Date(userOrErr.nextNameChangeDate) });
    } else {
      // Is the target name occupied?
      userbase.checkUser(nameChange.newname, function (occupied) {
        if (occupied) {
          callback({ success: false, error: 'Already exists' });
        } else {
          userbase.rename(nameChange.oldname, nameChange.newname, function (success, userOrErr) {
            if (success) {
              callback({ success: true, userinfo: userOrErr });
            } else {
              callback({ success: false, error: userOrErr });
            }
          });
        }
      });
    }
  });
};
