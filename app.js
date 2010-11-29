#!/usr/bin/env node

/**
 * Module dependencies.
 */

var express = require('express'),
    sys = require('sys'),
    userman = require('./userman'),
    appman = require('./appman'),
    messages = require('./messages');
var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(express.cookieDecoder());
  app.use(express.session());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function () {
  app.use(express.errorHandler()); 
});

// Helper functions for view rendering
app.helpers({
  msg: messages.get.bind(messages),
  pageTitle: function (title) {
    if (title) return messages.get('page-title', title);
    else return messages.get('index-page-title');
  },
  getFlashArray: function (flash) {
    // Turn this:
    //   { 'info': ['info1', 'info2'], 'error': ['error1'] }
    // into this:
    //   [ { type: 'info', message: 'info1' }
    //   , { type: 'info', message: 'info2' }
    //   , { type: 'error', message: 'error1' }]
    // for ease with view partials rendering.
    var flashes = [];
    for (var key in flash) {
      flash[key].forEach(function (msg) {
        flashes.push({ type: key, message: msg });
      });
    }
    return flashes;
  },
  inspect: function (obj) {
    return sys.inpect(obj);
  }
});

// Routes

app.get('/', function (req, res) {
  if (req.session.userinfo) {
    // When logged in, display a dashboard of information.
    appman.getAllByUser(req.session.userinfo.username, function (apps) {
      res.render('dashboard', {
        locals: {
          title: messages.get('my-dashboard'),
          userinfo: req.session.userinfo,
          apps: apps
        }
      });
    });
  } else {
    res.render('login', { locals: { title: messages.get('Login') } });
  }
});

app.post('/login', function (req, res) {
  var redirectURL = req.query.returnto || '/';
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

app.all('/appreg', function (req, res, next) {
  if (req.session.userinfo) next();
  else res.redirect('/');
});

app.get('/appreg', function (req, res) {
  res.render('appreg', { locals: { title: messages.get('register-new-app') } });
});

app.post('/appreg', function (req, res) {
  appman.register(req.session.userinfo.username, {
    name: req.body.name,
    secret: req.body.secret,
    desc: req.body.desc
  }, function (result) {
    if (result.success) {
      req.flash('info', 'new-app-success');
      res.redirect('/apps/' + result.appinfo.clientid);
    } else {
      req.flash('error', result.error);
      res.render('appreg', {
        locals: {
          title: messages.get('register-new-app'),
          appinfo: result.appinfo
        }
      });
    }
  });
});

app.all('/apps/:clientid/:op?', function (req, res, next) {
  appman.getByID(req.params.clientid, function (result) {
    if (result.success) {
      req.appinfo = result.appinfo;
      req.amOwner = req.session.userinfo &&
        result.appinfo.owners.indexOf(req.session.userinfo.username) !== -1;
      next();
    } else {
      if (result.error === 'app-not-found') res.send(404);
      else res.send(500);
    }
  });
});

app.get('/apps/:clientid', function (req, res) {
  res.render('apppage', {
    locals: {
      title: messages.get('app-page-title', req.appinfo.name),
      appinfo: req.appinfo,
      amOwner: req.amOwner
    }
  });
});

app.all('/apps/:clientid/remove', function (req, res) {
  if (!req.amOwner) {
    req.flash('error', 'unauthorized');
    res.redirect('/apps/' + req.params.clientid);
  } else if (req.method !== 'POST' || req.body.confirm !== 'yes') {
    res.render('appremoveconfirm', {
      locals: {
        title: messages.get('removing-app', req.appinfo.name),
        appinfo: req.appinfo
      }
    });
  } else {
    appman.deleteByID(req.params.clientid, function (result) {
      if (result.success) {
        req.flash('info', 'app-removal-success|' + req.params.clientid);
        res.redirect('/');
      } else {
        req.flash('error', 'unknown');
        res.redirect('/apps/' + req.params.clientid);
      }
    });
  }
});

app.all('/apps/:clientid/edit', function (req, res, next) {
  if (!req.amOwner) {
    req.flash('error', 'unauthorized');
    res.redirect('/apps/' + req.params.clientid);
  } else next();
});

app.get('/apps/:clientid/edit', function (req, res) {
  res.render('appedit', {
    locals: {
      title: messages.get('editing-app', req.appinfo.name),
      appinfo: req.appinfo
    }
  });
});

app.post('/apps/:clientid/edit', function (req, res) {
  var newInfo = {
    clientid: req.params.clientid,
    name: req.body.name,
    oldsecret: req.body.oldsecret,
    newsecret: req.body.newsecret,
    desc: req.body.desc
  };
  appman.updateInfo(newInfo, function (result) {
    if (result.success) {
      req.flash('info', 'app-editinfo-success');
      res.redirect('/apps/' + req.params.clientid);
    } else {
      req.flash('error', result.error);
      res.render('appedit', {
        locals: {
          title: messages.get('editing-app', req.appinfo.name),
          appinfo: newInfo
        }
      });
    }
  });
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}

/* vim: set ts=2 sw=2 nocin si: */

