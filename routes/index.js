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
  
  app.all('/debug', function(req, res) {
    var User = require('../user/model');
    User.getByName('byvoid1', function (err, user){
      console.log(err);
    });
    res.send(util.inspect(req));
  });
};

