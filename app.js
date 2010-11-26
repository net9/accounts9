#!/usr/bin/env node

/**
 * Module dependencies.
 */

var express = require('express');

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
var messages = require('./messages');
app.helpers({
  msg: messages.get.bind(messages),
  pageTitle: function (title) {
    if (title) return messages.get('page-title', title);
    else return messages.get('index-page-title');
  }
});

// Routes

app.get('/', function (req, res) {
  res.render('index', {
    locals: {
      title: 'Express'
    }
  });
});

var userman = require('./userman');

app.get('/register', function (req, res) {
  res.render('register', { locals: { title: messages.get('Register') } });
});

app.post('/register', function (req, res) {
  userman.register({
    username: req.body.username,
    password: req.body.password,
    bio:      req.body.bio
  }, function (result) {
    if (result.success) res.redirect('users/' + result.userinfo.username);
    else {
      res.render('register', {
        locals: {
          title: messages.get('Register'),
          userinfo: result.userinfo,
          error: result.error
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

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}

/* vim: set ts=2 sw=2 nocin si: */

