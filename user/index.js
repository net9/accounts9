var userman = require('./man');
var User = require('./model');
var appman = require('../app/man');
var messages = require('../messages');
var utils = require('../utils');
var url = require('url');

module.exports = function (app) {

  app.get('/u/:username', function (req, res, next) {
    User.getByName(req.params.username, function (err, user) {
      if (err) {
        return next(new Error(err));
      }
      res.render('user', {
        locals: {
          title: user.title,
          user: user
        }
      });
    });
  });

  app.get('/dashboard', checkLogin);
  app.get('/dashboard', function (req, res, next) {
    var user = req.session.user;
    appman.getAllByUser(user.name, function (apps) {
      res.render('dashboard', {
        locals: {
          title: messages.get('my-dashboard'),
          user: user,
          apps: apps,
        }
      });
    });
  });

  app.get('/login', function (req, res) {
    res.render('login', {
      locals: {
        title: messages.get('Login'),
        returnto: req.query.returnto
      }
    });
  });

  app.post('/login', function (req, res) {
    User.authenticate(req.body.username, req.body.password, function (err, user) {
      if (err) {
        req.flash('error', err);
        res.render('login', {
          locals: {
            title: messages.get('Login'),
            returnto: req.param('returnto')
          }
        });
      } else {
        req.session.user = user;
        var redirectUrl = req.param('returnto');
        if (!redirectUrl) {
          redirectUrl = '/u/' + user.name;
        }
        res.redirect(redirectUrl);
      }
    });
  });

  app.get('/logout', function (req, res) {
    req.session.user = null;
    res.redirect(req.query.returnto || '/');
  });

  app.get('/register', function (req, res) {
    res.render('register', {
      locals: {
        title: messages.get('Register')
      }
    });
  });

  app.post('/register', function (req, res) {
    userman.register(utils.subset(req.body, ["username", "password", "email"]), function (result) {
      if (result.success) {
        req.session.user = result.userinfo;
        req.flash('info', 'register-welcome|' + result.userinfo.username);
        res.redirect('/');
      } else {
        req.flash('error', result.error);
        res.render('register', {
          locals: {
            title: messages.get('Register'),
            userinfo: result.userinfo
          }
        });
      }
    });
  });

  app.get('/checkuser', function (req, res) {
    User.checkName(req.param('name'), function (err) {
      res.json(err);
    });
  });

  app.all('/editinfo', checkLogin);

  app.get('/editinfo', function (req, res) {
    // When a user requests to edit his info, we provide him with his current
    // info for rendering in the view.
    // This won't leak the password, as the view will ask for userinfo.oldpass
    // and userinfo.newpass.
    res.render('editinfo', {
      locals: {
        title: messages.get('edit-my-info'),
        user: req.session.user
      }
    });
  });

  app.post('/editinfo', function (req, res) {
    var user = new User(req.session.user);
    user.nickname = req.body.nickname;
    user.surname = req.body.surname;
    user.givenname = req.body.givenname;
    user.fullname = req.body.fullname;
    user.email = req.body.email;
    user.mobile = req.body.mobile;
    user.website = req.body.website;
    user.address = req.body.address;
    user.bio = req.body.bio;
    user.birthdate = req.body.birthdate;
    user.fullname = user.surname + user.givenname;
    if (req.body.newpass) {
      user.oldpass = req.body.oldpass;
      user.password = req.body.newpass;
    }
    
    user.save(function (err) {
      if (err) {
        req.flash('error', err);
        res.render('editinfo', {
          locals: {
            title: messages.get('edit-my-info'),
            user: user
          }
        });
      } else {
        req.session.user = user;
        req.flash('info', messages.get('editinfo-success'));
        res.redirect('/dashboard');
      }
    });
  });

};

function checkLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash('error', 'not-loged-in');
    res.redirect(url.format({
      pathname: '/login',
      query: {
        returnto: req.url,
      },
    }));
  }
}
