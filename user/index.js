var User = require('./model');
var Group = require('../group/model');
var appman = require('../app/man');
var messages = require('../messages');
var utils = require('../utils');
var url = require('url');
var assert = require('assert');

module.exports = function (app) {

  var userPath = '/u/:username';
  app.get(userPath, checkLogin);
  app.get(userPath, utils.checkAuthorized);
  app.get(userPath, getUser);
  app.get(userPath, getUserDirectGroup);
  app.get(userPath, getUserAdminGroup);
  app.get(userPath, function (req, res, next) {
    var user = req.user;
    res.render('user/user', {
      locals: {
        title: user.title,
        user: user,
      }
    });
  });

  var dashboard = '/dashboard';
  app.get(dashboard, checkLogin);
  app.get(dashboard, getCurrentUser);
  app.get(dashboard, getUserDirectGroup);
  app.get(dashboard, getUserAdminGroup);
  app.get(dashboard, getApps);
  app.get(dashboard, function (req, res, next) {
    res.render('user/dashboard', {
      locals: {
        title: messages.get('dashboard'),
        user: req.user,
        apps: req.apps,
      }
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

  app.post('/register', function (req, res, next) {
    var user = utils.subset(req.body, ['name', 'password', 'password-repeat', 'email']);
    User.create(user, function (err, user) {
      if (!err) {
        req.session.user = user;
        req.flash('info', 'register-success');
        res.redirect('/editinfo');
      } else {
        req.flash('error', err);
        next();
      }
    });
  });

  app.all('/register', function (req, res) {
    res.render('user/register', {
      locals: {
        title: messages.get('Register')
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
    res.render('user/editinfo', {
      locals: {
        title: messages.get('edit-userinfo'),
        user: req.session.user
      }
    });
  });

  app.post('/editinfo', function (req, res, next) {
    User.getByName(req.session.user.name, function (err, user) {
      assert(!err);
      req.user = user;
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
      next();
    });
  });
  app.post('/editinfo', function (req, res, next) {
    var user = req.user;
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

function getUser (req, res, next) {
  User.getByName(req.params.username, function (err, user) {
    if (err) {
      return utils.errorRedirect(req, res, err, '/');
    }
    req.user = user;
    next();
  });
}

function getCurrentUser (req, res, next) {
  User.getByName(req.session.user.name, function (err, user) {
    if (err) {
      return utils.errorRedirect(req, res, err, '/');
    }
    req.user = user;
    next();
  });
}

function getUserDirectGroup (req, res, next) {
  var user = req.user;
  Group.getByNames(user.groups, function (err, groups) {
    if (err) {
      return utils.errorRedirect(req, res, err, '/');
    }
    user.groups = groups;
    next();
  });
}

function getUserAdminGroup (req, res, next) {
  var user = req.user;
  Group.getAll(function (err, groups) {
    user.adminGroups = [];
    groups.forEach(function (group) {
      if (utils.contains(group.admins, user.name)) {
        user.adminGroups.push(group);
      }
    });
    next();
  });
}

function getApps(req, res, next) {
  var user = req.user;
  appman.getAllByUser(user.name, function (apps) {
    req.apps = apps;
    next();
  });
}
