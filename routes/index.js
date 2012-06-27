var appman = require('../app/man');
var messages = require('../messages');
var util = require('util');

module.exports = function (app) {

  app.get('/', function (req, res) {
    res.render('index', {
      layout: false,
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

  app.all('/debug', function(req, res, next) {
    next(new Error('aaa'));

    //res.send();
  });
};

