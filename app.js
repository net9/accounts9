#!/usr/bin/env node

/**
 * Module dependencies.
 */

var messages = require('./messages');
var config = require('./config');
var express = require('express');
var MongoStore = require('connect-mongo');
var fs = require('fs');
var util = require('util');

var app = module.exports = express.createServer();

var accessLogfile = fs.createWriteStream(config.log.access, {flags: 'a'});
var errorLogfile = fs.createWriteStream(config.log.error, {flags: 'a'});

// Configuration

app.configure(function () {
  app.use(express.logger({stream: accessLogfile}));
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
      port: config.db.port,
    })
  }));
  app.use(app.router);
  app.use(express.router(require('./routes')));
  app.use(express.router(require('./oauth')));
  app.use(express.router(require('./user')));
  app.use(express.router(require('./app/')));
  app.use(express.router(require('./group')));
  app.use(express.router(require('./interface')));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.logger());
});

app.configure('production', function () {
  app.error(function (err, req, res, next) {
    var meta = '[' + new Date() + '] ' + req.url + '\n';
    errorLogfile.write(meta);
    errorLogfile.write(err.stack);
    errorLogfile.write('\n');
    next();
  });
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
  curUser: function (req, res){
    return req.session.user;
  },
  error: function(req, res) {
    var err = req.flash('error');
    if (err.length)
      return messages.get(err);
    else
      return null;
  },
  info: function(req, res) {
    var succ = req.flash('info');
    if (succ.length)
      return messages.get(succ);
    else
      return null;
  },
});

/*
app.error(function (err, req, res, next) {
  res.render('error', {
    status: 500,
    locals: {
      title: messages.get('error'),
      message: err
    }
  });
});
*/

// Only listen on $ node app.js
if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
