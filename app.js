#!/usr/bin/env node

/**
 * Module dependencies.
 */

var express = require('express'),
    util = require('util'),
    messages = require('./messages');
var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(express.cookieDecoder());
  app.use(express.session({ secret: 'joe-king-pilot-for-hire' }));
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.router(require('./approuter')));
  app.use(express.router(require('./userrouter')));
  app.use(express.router(require('./apirouter')));
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.logger());
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
    return util.inspect(obj);
  }
});

// Routes

app.get('/', function (req, res) {
  if (req.session.userinfo) {
    // When logged in, display a dashboard of information.
    require('./appman').getAllByUser(req.session.userinfo.username, function (apps) {
      res.render('dashboard', {
        locals: {
          title: messages.get('my-dashboard'),
          userinfo: req.session.userinfo,
          apps: apps
        }
      });
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/test', function (req, res) {
  res.send(util.inspect(req));
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}

/* vim: set ts=2 sw=2 nocin si: */

