/* vim: set ts=2 sw=2 nocin si: */

var userman = require('./userman'),
    messages = require('./messages');

module.exports = function (app) {

  app.get('/login', function (req, res) {
    res.render('login', {
      locals: {
        title: messages.get('Login'),
        returnto: req.query.returnto
      }
    });
  });

  app.post('/login', function (req, res) {
    var redirectURL = req.param('returnto') || '/';
    userman.authenticate({
      username: req.body.username,
      password: req.body.password
    }, function (result) {
      if (result.success) {
        req.session.userinfo = result.userinfo;
        res.redirect(redirectURL);
      } else {
        req.flash('error', result.error);
        res.render('login', {
          locals: {
            title: messages.get('Login'),
            userinfo: result.userinfo
          }
        });
      }
    });
  });

  app.get('/logout', function (req, res) {
    var redirectURL = req.query.returnto || '/';
    req.session.userinfo = null;
    res.redirect(redirectURL);
  });

  app.get('/register', function (req, res) {
    res.render('register', { locals: { title: messages.get('Register') } });
  });

  app.post('/register', function (req, res) {
    userman.register({
      username: req.body.username,
      password: req.body.password,
      bio:      req.body.bio
    }, function (result) {
      if (result.success) {
        req.session.userinfo = result.userinfo;
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
    userman.checkUser(req.param('name'), function (result) {
      res.send(result);
    });
  });

  app.all('/editinfo', function (req, res, next) {
    if (req.session.userinfo) next();
    else res.redirect('/');
  });

  app.get('/editinfo', function (req, res) {
    // When a user requests to edit his info, we provide him with his current
    // username and bio for rendering in the view.
    // This won't leak the password, as the view will ask for userinfo.oldpass
    // and userinfo.newpass.
    res.render('editinfo', {
      locals: {
        title: messages.get('edit-my-info'),
        userinfo: req.session.userinfo
      }
    });
  });

  app.post('/editinfo', function (req, res) {
    var newInfo = {
      username: req.session.userinfo.username,
      oldpass:  req.body.oldpass,
      newpass:  req.body.newpass,
      bio:      req.body.bio
    };
    userman.editInfo(newInfo, function (result) {
      if (result.success) {
        // If the editing succeeds, update the user info stored in the session.
        req.session.userinfo = result.userinfo;
        req.flash('info', 'editinfo-success');
        res.redirect('/');
      } else {
        // On error, give back what was given to us. This fills the password fields.
        req.flash('error', result.error);
        res.render('editinfo', {
          locals: {
            title: messages.get('edit-my-info'),
            userinfo: newInfo
          }
        });
      }
    });
  });

};

