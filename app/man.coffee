randomStr = (l) ->
  x = "123456789poiuytrewqasdfghjklmnbvcxzQWERTYUIPLKJHGFDSAZXCVBNM"
  tmp = ""
  i = 0

  while i < l
    tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length)
    i++
  tmp
appbase = require("./base")
crypto = require("crypto")
exports.getAllByUser = (username, callback) ->
  appbase.getAllByUser username, (err, apps, authapps) ->
    unless err
      callback
        success: true
        apps: apps
        authorizedapps: authapps
    else
      callback
        success: false
        error: err

exports.checkByName = (appname, callback) ->
  appbase.checkByName appname, (occupied) ->
    callback
      name: appname
      occupied: occupied

exports.generateClientID = (username, appname) ->
  hasher = crypto.createHash("sha1")
  hasher.update username + "/" + appname
  digest = hasher.digest("base64")
  digest.slice(0, -1).replace(/\+/g, "-").replace /\//g, "_"

exports.register = (username, appinfo, callback) ->
  appbase.checkByName appinfo.name, (occupied) ->
    unless occupied
      appbase.create
        name: appinfo.name
        desc: appinfo.desc
        owners: [ username ]
        clientid: exports.generateClientID(username, appinfo.name)
        secret: randomStr(20)
      , (success, appOrErr) ->
        if success
          callback
            success: true
            appinfo: appOrErr
        else
          callback
            success: false
            appinfo: appinfo
            error: appOrErr

exports.getByID = (clientid, callback) ->
  appbase.getByID clientid, (success, appOrErr) ->
    if success
      callback
        success: true
        appinfo: appOrErr
    else
      callback
        success: false
        error: appOrErr

exports.deleteByID = (clientid, callback) ->
  appbase.deleteByID clientid, (success, err) ->
    if success
      callback success: true
    else
      callback
        success: false
        error: err

exports.authenticate = (appinfo, callback) ->
  appbase.authenticate appinfo.clientid, appinfo.secret, (success, appOrErr) ->
    if success
      callback
        success: true
        appinfo: appOrErr
    else
      callback
        success: false
        error: appOrErr

exports.updateInfo = (appinfo, callback) ->
  appbase.update
    clientid: appinfo.clientid
    name: appinfo.name
    desc: appinfo.desc
  , (success, appOrErr) ->
    if success
      callback
        success: true
        appinfo: appOrErr
    else
      callback
        success: false
        error: appOrErr

exports.checkAuthorized = (userid, appid, callback) ->
  appbase.checkAuthorized userid, appid, callback

exports.markAuthorized = (userid, appid, callback) ->
  appbase.markAuthorized userid, appid, callback

exports.removeAuthorized = (userid, appid, callback) ->
  appbase.removeAuthorized userid, appid, callback
