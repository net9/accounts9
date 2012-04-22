var Group = require('../group/model');
var User = require('../user/model');
var config = require('../config');
var assert = require('assert');

module.exports = function (app) {

  var interfacePath = '/interface';
  app.all(interfacePath, function (req, res, next) {
    if (config.interfaceSecret != req.body.interfaceSecret) {
      return res.json({error: 'invalid-secret'});
    };
    next();
  });
  app.all(interfacePath, function (req, res, next) {
    // Retrieve all groups
    Group.getAll(function (err, groups) {
      if (err) {
        return res.json({error: err});
      }
      req.groups = groups;
      next();
    });
  });
  app.all(interfacePath, function (req, res, next) {
    // Retrieve all admins of groups
    var groups = req.groups;
    var done = 0;
    groups.forEach(function (group) {
      group.getAdmins(function (err, admins) {
        assert(!err);
        group.allAdmins = admins;
        done ++;
        if (done == groups.length) {
          next();
        }
      });
    });
  });
  app.all(interfacePath, function (req, res, next) {
    // Get all users in authorized groups
    var groups = req.groups;
    var usernamesMap = {};
    groups.forEach(function (group) {
      if (group.name == 'root') {
        return;
      }
      group.users.forEach(function (userName) {
        usernamesMap[userName] = true;
      });
    });
    var userNames = [];
    for (var userName in usernamesMap) {
      userNames.push(userName);
    }
    User.getByNames(userNames, function (err, users) {
      if (err) {
        return res.json({error: err});
      }
      req.users = users;
      next();
    });
  });
  app.all(interfacePath, function (req, res, next) {
    // Get all groups of every user
    var users = req.users;
    var done = 0;
    users.forEach(function (user) {
      user.getAllGroups(function (err, groups) {
        assert(!err);
        user.allGroups = groups;
        done++;
        if (done == users.length) {
          next();
        }
      });
    });
  });
  app.all(interfacePath, function (req, res, next) {
    var result = {
      users: req.users,
      groups: req.groups,
    };
    res.json(result);
  });
};
