utils = require("../lib/utils")
util = require("util")
mongoose = require("../lib/mongoose")
mongoose.model "App", new mongoose.Schema(
  name:
    type: String
    index: true

  clientid:
    type: String
    index: true

  secret: String
  desc: String
  owners: [ String ]
)
mongoose.model "UserAppRelation", new mongoose.Schema(
  username:
    type: String
    index: true

  clientid:
    type: String
    index: true
)
App = mongoose.model("App")
UserAppRelation = mongoose.model("UserAppRelation")
exports.getAllByUser = (username, callback) ->
  return callback("mongodb-not-connected")  unless mongoose.connected
  App.find
    owners: username
  , (err, app_arr_raw) ->
    return callback(err)  if err
    apps = app_arr_raw.map((app) ->
      app.toObject()
    )
    UserAppRelation.find
      username: username
    , (err, authAppRaw) ->
      return callback(err, apps)  if err
      authApps = []
      return callback(null, apps, authApps)  if authAppRaw.length is 0
      authAppRaw.forEach (item, index) ->
        App.findOne
          clientid: item.clientid
        , (err, auth_app) ->
          return callback(err, apps)  if err
          if auth_app?
            authApps.push auth_app
          callback null, apps, authApps  if index is authAppRaw.length - 1

exports.checkByName = (appname, callback) ->
  App.count
    name: appname
  , (err, count) ->
    callback count isnt 0

exports.create = (appinfo, callback) ->
  newApp = new App(appinfo)
  newApp.save (err) ->
    if err
      callback false, err
    else
      callback true, newApp.toObject()

exports.getByID = (clientid, callback) ->
  App.findOne
    clientid: clientid
  , (err, app) ->
    if app is null
      callback false, "app-not-found"
    else
      callback true, app.toObject()

exports.deleteByID = (clientid, callback) ->
  App.remove
    clientid: clientid
  , (err) ->
    callback (if err then false else true), err

exports.authenticate = (clientid, secret, callback) ->
  App.findOne clientid: clientid, (err, app) ->
    if app is null
      callback false, "no-such-app-clientid"
    else if app.secret isnt secret
      callback false, "wrong-secret"
    else
      callback true, app.toObject()

exports.update = (appinfo, callback) ->
  App.findOne
    clientid: appinfo.clientid
  , (err, app) ->
    utils.merge(app, appinfo).save (err) ->
      if err
        callback false, err
      else
        callback true, app.toObject()

exports.checkAuthorized = (userid, appid, callback) ->
  UserAppRelation.findOne
    username: userid
    clientid: appid
  , (err, item) ->
    return callback(false)  if err or not item?
    callback true

exports.markAuthorized = (userid, appid, callback) ->
  relation = new UserAppRelation(
    username: userid
    clientid: appid
  )
  relation.save callback

exports.removeAuthorized = (userid, appid, callback) ->
  UserAppRelation.remove
    username: userid
    clientid: appid
  , callback
