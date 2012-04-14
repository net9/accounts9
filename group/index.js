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
    res.render('group/add', {
      locals: {
        title: messages.get('add-group'),
        parentGroup: req.group
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
      if (err) {
        return utils.errorRedirect(req, res, err, '/group/' + group.name + '/adduser');
      }
      user.addToGroup(group, function (err) {
        assert(!err);
        group.addUser(user.name, function (err) {
          assert(!err);
          req.flash('info', 'add-user-success');
          res.redirect('/group/' + group.name);
        });
      });
    });
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
      if (err) {
        return utils.errorRedirect(req, res, err, '/group/' + group.name + '/addadmin');
      }
      group.addAdmin(user.name, function (err) {
        assert(!err);
        req.flash('info', 'add-admin-success');
        res.redirect('/group/' + group.name);
      });
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
