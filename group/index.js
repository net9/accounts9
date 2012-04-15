var Group = require('./model');
var User = require('../user/model');
var messages = require('../messages');
var utils = require('../utils');
var assert = require('assert');

module.exports = function (app) {

  app.get('/group', utils.checkLogin);
  app.get('/group', function (req, res) {
    Group.getAllStructured(function (err, groupRoot) {
      if (err) {
        return utils.errorRedirect(req, res, err, '/');
      }
      res.render('group/groups', {
        locals: {
          title: messages.get('groups'),
          groupRoot: groupRoot,
        }
      });
    });
  });

  var groupPath = '/group/:groupname';
  app.get(groupPath, utils.checkLogin);
  app.get(groupPath, getGroup);
  app.get(groupPath, checkContainCurrentUser);
  app.get(groupPath, checkCurrentUserIsAdmin);
  app.get(groupPath, getParentGroup);
  app.get(groupPath, getChildrenGroup);
  app.get(groupPath, getGroupAdmins);
  app.get(groupPath, getDirectUsers);
  app.get(groupPath, function (req, res, next) {
    var group = req.group;
    group.users.showAction = group.currentUserIsAdmin;
    res.render('group/group', {
      locals: {
        title: group.title,
        group: group
      }
    });
  });

  var addGroupPath = groupPath + '/addgroup';
  app.all(addGroupPath, utils.checkLogin);
  app.all(addGroupPath, getGroup);
  app.all(addGroupPath, checkCurrentUserIsAdmin);
  app.get(addGroupPath, function (req, res, next) {
    res.render('group/edit', {
      locals: {
        title: messages.get('add-group'),
        parentGroup: req.group.name,
        group: null,
      }
    });
  });
  app.post(addGroupPath, function (req, res, next) {
    var parentGroup = req.group;
    var groupInfo = {
      name: req.body.name,
      title: req.body.title,
      desc: req.body.desc,
      users: [],
      admins: [],
      parent: parentGroup.name,
      children: [],
    };
    Group.create(groupInfo, function (err, group) {
      var parentGroupPath = '/group/' + parentGroup.name + '/addgroup';
      if (err) {
        return utils.errorRedirect(req, res, err, parentGroupPath);
      }
      parentGroup.addChildGroup(group.name, function (err) {
        assert(!err);
        req.flash('info', 'add-group-success');
        res.redirect('/group/' + group.name);
      });
    });
  });

  var editGroupPath = groupPath + '/edit';
  app.all(editGroupPath, utils.checkLogin);
  app.all(editGroupPath, getGroup);
  app.all(editGroupPath, checkCurrentUserIsAdmin);
  app.get(editGroupPath, function (req, res, next) {
    res.render('group/edit', {
      locals: {
        title: messages.get('edit-group'),
        parentGroup: req.group.parent,
        group: req.group,
      }
    });
  });
  app.post(editGroupPath, function (req, res, next) {
    var group = req.group;
    var newParent = req.body.parent;
    var groupEditPath = '/group/' + group.name + '/edit';
    if (group.parent != newParent) {
      // Forbid setting parent to itself
      if (newParent == group.name) {
        err = 'can-not-set-parent-to-itself';
        return utils.errorRedirect(req, res, err, groupEditPath);
      }
      // Move group
      var originalParent = group.parent;
      group.parent = newParent;
      Group.getByName(newParent, function (err, newParent) {
        if (err) {
          return utils.errorRedirect(req, res, err, groupEditPath);
        }
        // Forbid setting parent to its descendant
        group.isDescendant(newParent.name, function (err, isDescendant) {
          assert(!err);
          if (isDescendant) {
            err = 'can-not-set-parent-to-descendant';
            return utils.errorRedirect(req, res, err, groupEditPath);
          }
          // Add to new parent's children
          newParent.addChildGroup(group.name, function (err) {
            assert(!err);
            Group.getByName(originalParent, function (err, originalParent) {
              assert(!err);
              // Remove from original parent's children
              originalParent.removeChildGroup(group.name, function (err) {
                assert(!err);
                next();
              });
            });
          });
        });
      });
    } else {
      next();
    }
  });
  app.post(editGroupPath, function (req, res, next) {
    var group = req.group;
    group.title = req.body.title;
    group.desc = req.body.desc;
    group.save(function (err) {
      assert(!err);
      next();
    });
  });
  app.post(editGroupPath, function (req, res, next) {
    req.flash('info', 'edit-group-success');
    res.redirect('/group/' + req.group.name);
  });

  var allUsersPath = groupPath + '/allusers';
  app.get(allUsersPath, utils.checkLogin);
  app.get(allUsersPath, getGroup);
  app.get(allUsersPath, checkCurrentUserIsAdmin);
  app.get(allUsersPath, getAllUsers);
  app.get(allUsersPath, function (req, res, next) {
    var group = req.group;
    res.render('group/allusers', {
      locals: {
        title: group.title,
        group: group
      }
    });
  });
  
  var addUserPath = groupPath + '/adduser';
  app.all(addUserPath, utils.checkLogin);
  app.all(addUserPath, forbidAddUserToRootGroup);
  app.all(addUserPath, getGroup);
  app.all(addUserPath, checkCurrentUserIsAdmin);
  app.get(addUserPath, function (req, res, next) {
    res.render('group/adduser', {
      locals: {
        title: messages.get('add-user'),
        group: req.group,
      }
    });
  });
  app.post(addUserPath, function (req, res, next) {
    var group = req.group;
    User.getByName(req.body.name, function (err, user) {
      var errUrl = '/group/' + group.name + '/adduser';
      if (err) {
        return utils.errorRedirect(req, res, err, errUrl);
      }
      req.user = user;
      next();
    });
  });
  app.post(addUserPath, function (req, res, next) {
    // Check whether belongs to root group, if so, delete it
    var user = req.user;
    if (user.groups.length == 1 && user.groups[0] == 'root') {
      // Delete user from root group
      Group.getByName('root', function (err, rootGroup) {
        assert(!err);
        rootGroup.removeUser(user.name, function (err) {
          assert(!err);
          user.removeFromGroup('root', function (err) {
            assert(!err);
            next();
          });
        });
      });
    } else {
      next();
    }
  });
  app.post(addUserPath, function (req, res, next) {
    // Add user to the target group
    var user = req.user;
    var group = req.group;
    user.addToGroup(group.name, function (err) {
      if (err) {
        return utils.errorRedirect(req, res, err, errUrl);
      }
      group.addUser(user.name, function (err) {
        assert(!err);
        next();
      });
    });
  });
  
  app.post(addUserPath, function (req, res, next) {
    var group = req.group;
    req.flash('info', 'add-user-success');
    res.redirect('/group/' + group.name);
  });
  

  var delUserPath = groupPath + '/deluser/:username';
  app.all(delUserPath, utils.checkLogin);
  app.all(delUserPath, checkNotRootGroup);
  app.all(delUserPath, getGroup);
  app.all(delUserPath, checkCurrentUserIsAdmin);
  app.all(delUserPath, getUser);
  app.get(delUserPath, function (req, res, next) {
    var backUrl = '/group/' + req.group.name;
    res.render('confirm', {
      locals: {
        title: messages.get('del-user'),
        backUrl: backUrl,
        confirm: messages.get('del-user-confirm', req.user.title),
      }
    });
  });
  app.post(delUserPath, function (req, res, next) {
    var group = req.group;
    var user = req.user;
    user.removeFromGroup(group.name, function (err) {
      if (err) {
        return utils.errorRedirect(req, res, err, '/group/' + group.name);
      }
      group.removeUser(user.name, function (err) {
        assert(!err);
        next();
      });
    });
  });
  app.post(delUserPath, function (req, res, next) {
    var user = req.user;
    if (user.groups.length > 0) {
      return next();
    }
    // When the user does not belong to any group, add it to root group
    Group.getByName('root', function (err, rootGroup) {
      assert(!err);
      rootGroup.addUser(user.name, function (err) {
        assert(!err);
        user.addToGroup('root', function (err) {
          assert(!err);
          next();
        });
      });
    });
  });
  app.post(delUserPath, function (req, res, next) {
    var group = req.group;
    req.flash('info', 'del-user-success');
    res.redirect('/group/' + group.name);
  });

  var addAdminPath = groupPath + '/addadmin';
  app.all(addAdminPath, utils.checkLogin);
  app.all(addAdminPath, getGroup);
  app.all(addAdminPath, checkCurrentUserIsAdmin);
  app.get(addAdminPath, function (req, res, next) {
    res.render('group/adduser', {
      locals: {
        title: messages.get('add-admin'),
        group: req.group,
      }
    });
  });
  app.post(addAdminPath, function (req, res, next) {
    var group = req.group;
    User.getByName(req.body.name, function (err, user) {
      var errUrl = '/group/' + group.name + '/addadmin';
      if (err) {
        return utils.errorRedirect(req, res, err, errUrl);
      }
      group.addAdmin(user.name, function (err) {
        if (err) {
          return utils.errorRedirect(req, res, err, errUrl);
        }
        req.flash('info', 'add-admin-success');
        res.redirect('/group/' + group.name);
      });
    });
  });
  
  var delAdminPath = groupPath + '/deladmin/:username';
  app.all(delAdminPath, utils.checkLogin);
  app.all(delAdminPath, getGroup);
  app.all(delAdminPath, checkCurrentUserIsAdmin);
  app.all(delAdminPath, checkRootAdmin);
  app.all(delAdminPath, getUser);
  app.get(delAdminPath, function (req, res, next) {
    var backUrl = '/group/' + req.group.name;
    res.render('confirm', {
      locals: {
        title: messages.get('del-admin'),
        backUrl: backUrl,
        confirm: messages.get('del-admin-confirm', req.user.title),
      }
    });
  });
  app.post(delAdminPath, function (req, res, next) {
    var group = req.group;
    var user = req.user;
    
    group.removeAdmin(user.name, function (err) {
      if (err) {
        return utils.errorRedirect(req, res, err, '/group/' + group.name);
      }
      req.flash('info', 'del-admin-success');
      res.redirect('/group/' + group.name);
    });
  });
};

function getGroup(req, res, next) {
  // Check existance and retrieve Group object
  Group.getByName(req.params.groupname, function (err, group) {
    if (err) {
      utils.errorRedirect(req, res, err, '/');
    } else {
      // Save group to request object
      req.group = group;
      next();
    }
  });
}

function checkContainCurrentUser(req, res, next) {
  // Check whether current user directly belongs to
  var group = req.group;
  group.checkUser(req.session.user.name, {direct: true}, function (err, belongTo) {
    if (err) {
      utils.errorRedirect(req, res, err, '/group');
    } else {
      group.containCurrentUser = belongTo;
      next();
    }
  });
}

function checkCurrentUserIsAdmin (req, res, next) {
  // Check whether current user is admin of this group
  var group = req.group;
  group.checkAdmin(req.session.user.name, function (err, isAdmin) {
    if (err) {
      return utils.errorRedirect(req, res, err, '/group');
    }
    group.currentUserIsAdmin = isAdmin;
    // If is not direct user and is not admin, no permission
    if (!group.containCurrentUser && !isAdmin) {
      utils.errorRedirect(req, res, 'permission-denied-view-group', '/group');
    } else {
      next();
    }
  });
}

function getParentGroup (req, res, next) {
  // Get parent information
  var group = req.group;
  if (group.parent) {
    Group.getByName(group.parent, function (err, parentGroup) {
      assert(!err);
      group.parent = parentGroup;
      next();
    });
  } else {
    next();
  }
}

function getChildrenGroup (req, res, next) {
  // Get children information
  var group = req.group;
  Group.getByNames(group.children, function (err, children) {
    assert(!err);
    group.children = children;
    next();
  });
}

function getGroupAdmins (req, res, next) {
  // Get admin information
  var group = req.group;
  User.getByNames(group.admins, function (err, admins) {
    assert(!err);
    group.admins = admins;
    next();
  });
}

function getDirectUsers (req, res, next) {
  // Get direct users information
  var group = req.group;
  User.getByNames(group.users, function (err, users) {
    assert(!err);
    group.users = users;
    next();
  });
}

function getAllUsers (req, res, next) {
  // Get direct and indirect users information
  var group = req.group;
  group.getAllUserNames(function (err, users) {
    assert(!err);
    User.getByNames(users, function (err, users) {
      assert(!err);
      group.users = users;
      next();
    });
  });
}

function getUser (req, res, next) {
  // Check existance and retrieve User object
  User.getByName(req.params.username, function (err, user) {
    if (err) {
      utils.errorRedirect(req, res, err, '/');
    } else {
      // Save user to request object
      req.user = user;
      next();
    }
  });
}

function checkNotRootGroup (req, res, next) {
  // Check if it is not root group
  if (req.params.groupname == 'root') {
    var err = 'can-not-delete-user-from-root-group';
    return utils.errorRedirect(req, res, err, '/group/root');
  }
  next();
}

function forbidAddUserToRootGroup (req, res, next) {
  // forbid to add user to root group
  if (req.params.groupname == 'root') {
    var err = 'can-not-add-user-to-root-group';
    return utils.errorRedirect(req, res, err, '/group/root');
  }
  next();
}

function checkRootAdmin (req, res, next) {
  // Forbid to delete the only admin of root group
  if (req.group.name == 'root' && req.group.admins.length == 1) {
    var err = 'can-not-delete-the-only-admin-from-root-group';
    return utils.errorRedirect(req, res, err, '/group/root');
  }
  next();
}
