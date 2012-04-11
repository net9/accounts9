#!/usr/bin/env node

/**
 * Module dependencies.
 */

var util = require('util');
var messages = require('./messages/getter');
var config = require('./config');
var express = require('express');
var MongoStore = require('connect-mongo');

var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.cookieSecret,
    store: new MongoStore({
      db: config.db.name,
      host: config.db.host,
    })
  }));
  app.use(app.router);
  app.use(express.router(require('./app/router')));
  app.use(express.router(require('./user/router')));
  app.use(express.router(require('./apirouter')));
  app.use(express.static(__dirname + '/public'));
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
    if (title) {
      return messages.get('page-title', title);
    } else {
      return messages.get('index-page-title');
    }
  },
  inspect: function (obj) {
    return util.inspect(obj);
  },
});

app.dynamicHelpers({
  session: function (req, res){
    return req.session;
  },
  flashArray: function (req, res) {
    // Turn this:
    //   { 'info': ['info1', 'info2'], 'error': ['error1'] }
    // into this:
    //   [ { type: 'info', message: 'info1' }
    //   , { type: 'info', message: 'info2' }
    //   , { type: 'error', message: 'error1' }]
    // for ease with view partials rendering.
    var flash = req.flash();
    var flashes = [];
    for (var key in flash) {
      flash[key].forEach(function (msg) {
        flashes.push({ type: key, message: msg });
      });
    }
    return flashes;
  },
  error: function(req, res) {
    var err = req.flash('error');
    if (err.length)
      return err;
    else
      return null;
  },
  success: function(req, res) {
    var succ = req.flash('success');
    if (succ.length)
      return succ;
    else
      return null;
  },
});

// Routes

app.get('/', function (req, res) {
  if (req.session.userinfo) {
    // When logged in, display a dashboard of information.
    require('./app/man').getAllByUser(req.session.userinfo.username, function (apps) {
      res.render('dashboard', {
        locals: {
          title: messages.get('my-dashboard'),
          userinfo: req.session.userinfo,
          apps: apps,
        }
      });
    });
  } else {
    res.redirect('/login');
  };
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
