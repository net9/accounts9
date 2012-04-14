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
      res.render('groups', {
        locals: {
          title: messages.get('groups'),
          groupRoot: groupRoot,
        }
      });
    });
  });

  var groupPath = '/group/:groupname';
  app.get(groupPath, utils.checkLogin);
  
  app.get(groupPath, function (req, res, next) {
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
  });
  
  app.get(groupPath, function (req, res, next) {
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
  });
  
  app.get(groupPath, function (req, res, next) {
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
  });

  app.get(groupPath, function (req, res, next) {
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
  });

  app.get(groupPath, function (req, res, next) {
    // Get children information
    var group = req.group;
    Group.getByNames(group.children, function (err, children) {
      assert(!err);
      group.children = children;
      next();
    });
  });
  
  app.get(groupPath, function (req, res, next) {
    // Get admin information
    var group = req.group;
    User.getByNames(group.admins, function (err, admins) {
      assert(!err);
      group.admins = admins;
      next();
    })
  });

  app.get(groupPath, function (req, res, next) {
    var group = req.group;
    res.render('group', {
      locals: {
        title: group.title,
        group: group
      }
    });
  });
  
};
