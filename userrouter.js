/* vim: set ts=2 sw=2 nocin si: */

var userman = require('./userman'),
    messages = require('./messages'),
    utils = require('./utils');

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
    userman.authenticate({
      username: req.body.username,
      password: req.body.password
    }, function (result) {
      if (result.success) {
        req.session.userinfo = result.userinfo;
        res.redirect(req.param('returnto') || '/');
      } else {
        req.flash('error', result.error);
        res.render('login', {
          locals: {
            title: messages.get('Login'),
            returnto: req.param('returnto'),
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
      email:    req.body.email
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
    // info for rendering in the view.
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
    var newInfo = utils.subset(req.body, ['oldpass', 'newpass', 'bio', 'email', 'website',
        'mobile', 'givenname', 'surname', 'address', 'nickname', 'nextNameChangeDate']);

    if (req.body.fullname === 'surgiven') newInfo.fullname = newInfo.surname + newInfo.givenname;
    else if (req.body.fullname === 'sur-given') newInfo.fullname = newInfo.surname + ' ' + newInfo.givenname;
    else newInfo.fullname = newInfo.givenname + ' ' + newInfo.surname;
    newInfo.username = req.session.userinfo.username;

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

  app.all('/changename', function (req, res, next) {
    // As usual, you have to be logged in to change your username.
    if (!req.session.userinfo) res.redirect('/');
    else {
      // Are you allowed to change it this frequently?
      if (req.session.userinfo.nextNameChangeDate > Date.now()) {
        // No you're not.
        req.flash('error', 'change-name-later|' +
            new Date(req.session.userinfo.nextNameChangeDate));
        res.redirect('/');
      } else {
        // Fair enough.
        next();
      }
    }
  });

  app.get('/changename', function (req, res) {
    res.render('changename', {
      locals: {
        title: messages.get('changing-username'),
        nameChange: { oldname: req.session.userinfo.username }
      }
    });
  });

  app.post('/changename', function (req, res) {
    var nameChange = {
      oldname: req.session.userinfo.username,
      newname: req.body.newname,
      password: req.body.password
    };
    userman.rename(nameChange, function (result) {
      if (result.success) {
        req.session.userinfo = result.userinfo;
        req.flash('info', 'change-name-success');
        res.redirect('/');
      } else {
        req.flash('error', result.error);
        res.render('changename', {
          locals: {
            title: messages.get('changing-username'),
            nameChange: nameChange
          }
        });
      }
    });
  });

};

