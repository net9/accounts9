var appman = require('../app/man');
var messages = require('../messages');

module.exports = function (app) {
  app.get('/', function (req, res) {
    if (req.session.userinfo) {
      // When logged in, display a dashboard of information.
      appman.getAllByUser(req.session.userinfo.username, function (apps) {
        res.render('dashboard', {
          locals: {
            title: messages.get('my-dashboard'),
            userinfo: req.session.userinfo,
            apps: apps,
          }
        });
      });
    } else {
      res.redirect('/login');
    };
  });
};

