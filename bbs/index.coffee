BBS = require("./model")
messages = require("../messages")

module.exports = (app) ->
  connectPath = '/bbs/connect'
  app.get connectPath, checkLogin
  app.get connectPath, (req, res, next) ->
    res.redirect BBS.getAuthorizeUrl()
  
  tokenPath = '/bbs/token'
  app.get tokenPath, checkLogin
  app.get tokenPath, (req, res, next) ->
    if req.query.error
      req.flash "error", req.query.error
      return res.redirect '/dashboard'
    BBS.updateToken req.session.user, req.query.code, (err) ->
      req.flash "info", messages.get("net9-bbs-connect-success")
      res.redirect '/dashboard'

checkLogin = (req, res, next) ->
  if req.session.user
    next()
  else
    req.flash "error", "not-loged-in"
    res.redirect url.format(
      pathname: "/login"
      query:
        returnto: req.url
    )
