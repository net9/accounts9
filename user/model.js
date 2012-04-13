var userbase = require('./db');
var Group = require('../group/model');
var mongoose = require('../lib/mongoose');
var utils = require('../utils');
var assert = require('assert');

function User(user) {
  this.name = user.name;
  this.uid = parseInt(user.uid);
  this.nickname = user.nickname;
  this.surname = user.surname;
  this.givenname = user.givenname;
  this.fullname = user.fullname;
  this.email = user.email;
  this.mobile = user.mobile;
  this.website = user.website;
  this.address = user.address;
  this.bio = user.bio;
  this.birthdate = user.birthdate;
  this.groups = user.groups;
  this.applyingGroups = user.applyingGroups;
  this.authorizedApps = user.authorizedApps;
  
  if (!this.groups) {
    // TODO: add to default group
  }
}

module.exports = User;

mongoose.model('User', new mongoose.Schema({
  name: { type: String, index: true, unique: true },
  groups: [String],
  applyingGroups: [String],
  authorizedApps: [String],
}));
User.model = mongoose.model('User');


/*
 * Check existance and validity of username
 *
 * callback(err)
 *
 */
User.checkName = function checkName(username, callback) {
  userbase.checkUser(username, function (occupied) {
    if (occupied) {
      callback('occupied');
    } else {
      callback(null);
    }
  });
};

/*
 * Get one user by username
 *
 * callback(err, user)
 *
 */
User.getByName = function getByName(username, callback) {
  if (!mongoose.connected) {
    return callback('mongodb-not-connected');
  }
  // Look up into LDAP server
  userbase.getByName(username, function (success, userOrErr) {
    if (success) {
      var user = new User(userOrErr);
      user._getMongodbUserAttr(function (err) {
        if (err) {
          return callback(err);
        }
        callback(null, user);
      });
    } else {
      callback(userOrErr);
    }
  });
};


/*
 * Authenticate and get
 *
 * callback(err, user)
 *
 */
User.authenticate = function authenticate(username, password, callback) {
  userbase.authenticate(username, password, function (success, userOrErr) {
    if (success) {
      var user = new User(userOrErr);
      callback(null, user);
    } else {
      callback(userOrErr);
    }
  });
};

/*
 * Create a new user
 *
 * callback(err, user)
 *
 */
User.create = function create(user, callback) {
  // Validate required fields
  if (!user.password || !user.email) {
    return callback('fields-required');
  }
  
  if (user.password != user['password-repeat']) {
    return callback('password-mismatch');
  }
  
  // Now make sure that the user doesn't exist.
  User.checkName(user.name, function (err) {
    if (err) {
      return callback(err);
    }
    userbase.create(user, function (success, userOrErr) {
      if (success) {
        var user = new User(userOrErr);
        var mongodbUser = new User.model(utils.subset(
          user,
          ['name', 'groups', 'applyingGroups', 'authorizedApps']
        ));
        mongodbUser.save(function (err) {
          if (err) {
            return callback(err);
          }
          user.addToDefaultGroup(function (err) {
            callback(err, user);
          });
        });
      } else {
        callback(userOrErr);
      }
    });
  });
};

/*
 * Generate a string representing the user
 *
 *
 */
User.prototype.__defineGetter__('title', function () {
  if (this.fullname) {
    return this.fullname;
  } else {
    return this.name;
  }
});

/*
 * Save modifications
 *
 * callback(err)
 *
 */
User.prototype.save = function save(callback) {
  var that = this;
  if (this.password) {
    userbase.authenticate(this.name, this.oldpass, function (success, userOrErr) {
      if (success) {
        that._update(callback);
      } else {
        callback('wrong-old-pass');
      }
    });
  } else {
    this._update(callback);
  }
};

/*
 * Get object in MongoDB storage
 * [private]
 *
 * callback(err, mongodbUser)
 *
 */
User.prototype._getMongodbUser = function _getMongodbUser(callback) {
  User.model.find({name: this.name}, function (err, mongodbUser) {
    if (err) {
      return callback(err);
    }
    assert.equal(mongodbUser.length, 1);
    mongodbUser = mongodbUser[0];
    callback(null, mongodbUser);
  });
};

/*
 * Get attributes in MongoDB storage
 * [private]
 *
 * callback(err)
 *
 */
User.prototype._getMongodbUserAttr = function _getMongodbUserAttr(callback) {
  var that = this;
  // Look up into MongoDB
  this._getMongodbUser(function (err, mongodbUser) {
    if (err) {
      return callback(err);
    }
    // Merge attributes
    that.groups = mongodbUser.groups;
    that.applyingGroups = mongodbUser.applyingGroups;
    that.authorizedApps = mongodbUser.authorizedApps;
    callback(null);
  });
};

/*
 * Update user
 * [private]
 *
 * callback(err)
 *
 */
User.prototype._update = function _update(callback) {
  var that = this;
  userbase.update(this, function (success, userOrErr) {
    that.password = that.oldpass = undefined;
    if (success) {
      that._getMongodbUser(function (err, mongodbUser) {
        if (err) {
          return callback(err);
        }
        // Modify attributes
        mongodbUser.groups = that.groups;
        mongodbUser.applyingGroups = that.applyingGroups;
        mongodbUser.authorizedApps = that.authorizedApps;
        mongodbUser.save(callback);
      });
    } else {
      callback(userOrErr);
    }
  });
}

/*
 * Add user to a group
 *
 * group: The group which user will add to
 * callback(err)
 *
 */
User.prototype.addToGroup = function addToGroup (group, callback) {
  this.groups = this.groups || [];
  for (key in this.groups) {
    if (this.groups[key] == group.name) {
      return callback('already-in-this-group');
    }
  }
  this.groups.push(group.name);
  this.save(callback);
};

/*
 * Add user to default group
 *
 * callback(err)
 *
 */
User.prototype.addToDefaultGroup = function addToDefaultGroup (callback) {
  var self = this;
  Group.getByName('root', function (err, root) {
    if (!err) {
      // Add to group
      self.addToGroup(root, function (err) {
        if (err) {
          return callback(err);
        }
        // group add reverse
        root.addUser(self.name, callback);
      });
    } else if (err == 'no-such-group') {
      // Initialize default groups
      Group.initialize(self, function (err, root, authorized) {
        callback(err);
      });
    } else {
      callback(err);
    }
  });
};


/*
 * Remove from a group
 *
 * group: The group which user will remove from
 * options: groupNotRemove
 * callback(err)
 *
 */
User.prototype.removeFromGroup = function removeFromGroup (group, options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  var self = this;
  this.groups = this.groups || [];
  for (key in this.groups) {
    if (this.groups[key] == group.name) {
      // User remove group
      this.groups = this.groups.slice(0, key).concat(this.groups.slice(key + 1));
      
      if (options.groupNotRemove) {
        self.save(callback);
      } else {
        // Group remove user
        group._removeUser(this.name, function (err) {
          if (err) {
            return callback(err);
          }
          self.save(callback);
        });
      }
      return;
    }
  }
  callback('not-in-this-group');
};
