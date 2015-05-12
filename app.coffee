#!/bin/sh
###
exec continuation -c -e $0 $* 
###

# Module dependencies

messages = require "./messages" 
config = require "./config" 
express = require "express" 
session = require 'express-session'
methodOverride = require 'method-override'
errorhandler = require 'errorhandler'
partials = require 'express-partials'
MongoStore = (require "connect-mongo") session
favicon = require 'serve-favicon'
logger = require 'morgan'
flash = require 'connect-flash'
cookieParser = require 'cookie-parser'
bodyParser = require 'body-parser'
extend = require 'node.extend'
fs = require "fs"
util = require "util"
path = require "path"
ldapIfce = require './ldap'

# Configuration

app = module.exports = express()
env = process.env.NODE_ENV || 'development';

accessLogfile = fs.createWriteStream config.log.access, flags: "a"
errorLogfile = fs.createWriteStream config.log.error, flags: "a"

app.use favicon(__dirname + '/public/favicon.ico')
if env is "development"
  app.use logger('dev')
else
  app.use logger('combined', stream: accessLogfile)
app.use partials()
app.set "views", __dirname + "/views"
app.set "view engine", "ejs"
app.enable "jsonp callback"

app.use bodyParser.json()
app.use bodyParser.urlencoded(extended: false)
app.use methodOverride '_method'
app.use cookieParser()
app.use flash()
app.use session(
  secret: config.cookieSecret
  store: new MongoStore(
    db: config.db.name
    host: config.db.host
    port: config.db.port
  )
  resave: false
  saveUninitialized: false
)

#原来的DynamicHelpers
app.use (req, res, next) ->
  _render =  res.render
  res.render = () ->
    extend res.locals, 
      curUser: ((req, res) ->
        if req.session.user?
          req.session.user
        else
          null
      ) req, res
  
      error: ((req, res) ->
        err = req.flash "error" 
        if err.length
          messages.get err
        else
          null
      ) req, res

      info: ((req, res) ->
        succ = req.flash "info" 
        if succ.length
          messages.get succ
        else
          null
      ) req, res
    return _render.apply res, arguments
  next()

app.use (require './lib/utils').jsonOrP
require("./routes")(app)
app.use require("./oauth") express.Router()
app.use require("./app/") express.Router()
app.use require("./interface") express.Router() 
app.use require('connect-assets')(
  src: path.join __dirname, 'assets'
  buildDir: 'public'
)
app.use express.static __dirname + "/public" 

# Helper functions for view rendering

extend app.locals,
  msg: messages.get.bind messages 
  pageTitle: (title) ->
    if title
      messages.get "page-title", title
    else
      messages.get "index-page-title"

  inspect: (obj) ->
    util.inspect obj
  
  displayDate: (timestamp) ->
    date = new Date(timestamp * 1000)
    date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' +
      date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()

if env is "development"
  app.use errorhandler(
    #dumpExceptions: true
    #showStack: true
  )
  app.use logger('combined');

if env is "production"
  app.use (err, req, res, next) ->
    meta = "[" + new Date() + "] " + req.url + "\n"
    errorLogfile.write meta
    errorLogfile.write err.stack
    errorLogfile.write "\n"
    next()

app.use (req, res, next) ->
  res.render 'index',
    layout: false
    locals:
      title: messages.get('404')
      notFound: true

unless module.parent
  server = app.listen 3000, "127.0.0.1", ->
    console.log "Express server listening on port %d", server.address().port

    ldapIfce.listen 1389, '0.0.0.0', ->
      console.log 'LDAP interface up at: %s', ldapIfce.url
