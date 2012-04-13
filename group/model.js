var mongoose = require('../lib/mongoose');
var utils = require('../utils');
var User = require('../user/model');
var assert = require('assert');

function Group(group) {
  this.name = group.name;
  this.title = group.title;
  this.users = group.users;
  this.admins = group.admins;
  this.parent = group.parent;
  this.children = group.children;
}

module.exports = Group;

mongoose.model('Group', new mongoose.Schema({
  name: { type: String, index: true, unique: true },
  title: String,
  users: [String],
  admins: [String],
  parent: String,
  children: [String],
}));
Group.model = mongoose.model('Group');

/*
 * Get one group by name
 *
 * callback(err, group)
 *
 */
Group.getByName = function getByName (name, callback) {
  Group._getGroup(name, function (err, group) {
    if (err) {
      return callback(err);
    }
    callback(null, new Group(group));
  });
};

/*
 * Get group object
 * [private]
 *
 * callback(err, group)
 *
 */
Group._getGroup = function _getGroup (name, callback) {
  if (!mongoose.connected) {
    return callback('mongodb-not-connected');
  }
  // Look up into MongoDB
  Group.model.find({name: name}, function (err, group) {
    if (err) {
      return callback(err);
    }
    if (group.length == 0) {
      return callback('no-such-group');
    }
    // There must be at most one group with the name
    assert.equal(group.length, 1);
    callback(null, group[0]);
  });
};


/*
 * Get all groups
 *
 * callback(err, groups)
 *
 */
Group.getAll = function getAll (callback) {
  if (!mongoose.connected) {
    return callback('mongodb-not-connected');
  }
  // Look up into MongoDB
  Group.model.find({}, function (err, groups) {
    if (err) {
      return callback(err);
    }
    groups = groups.map(function (group) {
      return group.toObject();
    });
    callback(null, groups);
  });
};

/*
 * Create a new group
 *
 * callback(err, group)
 *
 */
Group.create = function create (group, callback) {
  // Validate required fields
  if (!group.name || !group.title) {
    return callback('fields-required');
  }
  
  // Initialize some array
  group.users = group.users || [];
  group.admins = group.admins || [];
  group.children = group.children || [];
  
  // Now make sure that the group doesn't exist.
  Group.getByName(group.name, function (err) {
    if (!err) {
      return callback('group-name-exists');
    }
    if (err != 'no-such-group') {
      return callback(err);
    }
    group = new Group.model(group);
    group.save(function (err) {
      callback(err, new Group(group));
    });
  });
};

/*
 * Create default groups (root, authorized)
 *
 * user: The admin user
 * callback(err, root, authorized)
 *
 */
Group.initialize = function initialize (user, callback) {
  // Create root
  var group = {
    name: 'root',
    title: 'root',
    users: [],
    admins: [user.name],
    parent: null,
    children: ['authorized'],
  };
  Group.create(group, function (err, root) {
    if (err) {
      return callback(err);
    }
    // Create authorized
    var group = {
      name: 'authorized',
      title: 'authorized',
      users: [user.name],
      admins: [],
      parent: 'root',
      children: [],
    };
    Group.create(group, function (err, authorized) {
      if (err) {
        return callback(err);
      }
      // Add user to authorized
      user.addToGroup(authorized, function (err) {
        if (err) {
          return callback(err);
        }
        callback(err, root, authorized);
      });
    });
  });
};

/*
 * Save modifications
 *
 * callback(err)
 *
 */
Group.prototype.save = function save (callback) {
  var self = this;
  Group._getGroup(this.name, function (err, group) {
    if (err) {
      return callback(err);
    }
    utils.mergeProps(group, self);
    Group.model.prototype.save.call(group, callback);
  });
};

/*
 * Remove group
 *
 * callback(err)
 *
 */
Group.prototype.remove = function remove (callback) {
  var self = this;
  Group._getGroup(this.name, function (err, group) {
    if (err) {
      return callback(err);
    }
    
    // Remove each user from this group
    self.users.forEach(function (username) {
      // Get user by name
      User.getByName(username, function (err, user) {
        if (err) {
          assert(false);
        }
        user.removeFromGroup(self, {groupNotRemove: true}, function (err) {
          if (err) {
            assert(false);
          }
        });
      });
    });
    
    // Remove group object from MongoDB
    Group.model.prototype.remove.call(group, callback);
  });
};

/*
 * Remove a user from this group
 * [private]
 *
 * Call User.prototype.removeFromGroup instead of this method.
 *
 * callback(err)
 *
 */
Group.prototype._removeUser = function _removeUser (username, callback) {
  for (key in this.users) {
    if (this.users[key] == username) {
      delete this.users[key];
      this.save(callback);   
      return;
    }
  }
  callback('not-in-this-group');
};
