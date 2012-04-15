var appman = require('../app/man');
var messages = require('../messages');
var util = require('util');

module.exports = function (app) {

  app.get('/', function (req, res) {
    res.render('index', {
      locals: {
        title: messages.get('index')
      }
    });
  });

  app.get('/about', function (req, res) {
    res.render('about', {
      locals: {
        title: messages.get('about')
      }
    });
  });

  app.all('/debug', function(req, res) {
    var User = require('../user/model');
    var Group = require('../group/model');
    
    User.getByName('test', function (err, user) {
      Group.createRoot(user, function (err, group) {
        //console.log(err, group);
        //group.remove();
      });
    });

    res.send();
  });
};

