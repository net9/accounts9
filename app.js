#!/usr/bin/env node

/**
 * Module dependencies.
 */

var util = require('util');
var messages = require('./messages');
var config = require('./config');
var express = require('express');
var MongoStore = require('connect-mongo');

var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
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
  app.use(express.router(require('./routes')));
  app.use(express.router(require('./app/')));
  app.use(express.router(require('./user')));
  app.use(express.router(require('./oauth')));
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
  error: function(req, res) {
    var err = req.flash('error');
    if (err.length)
      return err;
    else
      return null;
  },
  info: function(req, res) {
    var succ = req.flash('info');
    if (succ.length)
      return succ;
    else
      return null;
  },
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
