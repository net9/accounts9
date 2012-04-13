var Group = require('./model');
var messages = require('../messages');
var utils = require('../utils');

module.exports = function (app) {

  app.get('/group', utils.checkLogin);
  app.get('/group', function (req, res) {
    Group.getAllStructured(function (err, groupRoot) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('groups', {
        locals: {
          title: messages.get('groups'),
          groupRoot: groupRoot,
        }
      });
    });
  });

};
