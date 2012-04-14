var Group = require('./model');
var messages = require('../messages');
var utils = require('../utils');

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

  app.get('/group/:groupname', utils.checkLogin);
  app.get('/group/:groupname', function (req, res) {
    Group.getByName(req.params.groupname, function (err, group) {
      if (err) {
        return utils.errorRedirect(req, res, err, '/');
      }
      // Check whether current user directly belong to the group
      group.checkUser(req.session.user.name, {direct: true}, function (err, belongTo) {
        if (err) {
          return utils.errorRedirect(req, res, err, '/group');
        }
        group.containCurrentUser = belongTo;
        // Check whether current user is admin of the group
        group.checkAdmin(req.session.user.name, function (err, isAdmin) {
          if (err) {
            return utils.errorRedirect(req, res, err, '/group');
          }
          group.currentUserIsAdmin = isAdmin;
          // If not direct user and not admin, no permission
          if (!belongTo && !isAdmin) {
            return utils.errorRedirect(req, res, 'permission-denied-view-group', '/group');
          }
          res.render('group', {
            locals: {
              title: group.title,
              group: group
            }
          });
        });
      });
    });
  });
  
};
