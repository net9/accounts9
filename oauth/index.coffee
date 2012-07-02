appman = require("../app/man")
oauthman = require("./man")
messages = require("../messages")
User = require("../user/model")
utils = require("../lib/utils")
util = require("util")
url = require("url")
module.exports = (app) ->
  authorizePath = "/api/authorize"
  app.all authorizePath, utils.checkLogin
  app.all authorizePath, utils.checkAuthorized
  app.get authorizePath, (req, res) ->
    clientid = req.query.client_id
    redirect_uri = req.query.redirect_uri
    state = (if req.query.state then "&state=" + req.query.state else "")
    scope = req.query.scope or "a b"
    if not clientid
      if redirect_uri
        return res.redirect(redirect_uri + "?error=invalid_request" + state)
      else
        return res.send(error: "invalid_request", 400)
    appman.getByID clientid, (result) ->
      if not result.success
        return res.redirect(redirect_uri + "?error=invalid_client" + state) 
      req.session.oauthinfo = req.session.oauthinfo or {}
      req.session.oauthinfo[clientid] =
        redirect_uri: redirect_uri
        state: state
        scope: scope
        appinfo: result.appinfo

      if req.session.user
        appman.checkAuthorized req.session.user.name, req.query.client_id, (isAuthorized) ->
          if isAuthorized
            returnCode req, res, scope, state, redirect_uri
          else
            res.render "appauth",
              locals:
                title: messages.get("authenticating", result.appinfo.name)
                appinfo: result.appinfo
                scopes: scope.split(" ")
      else
        res.redirect url.format(
          pathname: "/login"
          query:
            returnto: req.url
        )

  app.post "/api/authorize", (req, res) ->
    if not req.session.oauthinfo[req.query.client_id] or not req.session.user
      res.redirect req.url
    else
      oauthinfo = req.session.oauthinfo[req.query.client_id]
      delete req.session.oauthinfo[req.query.client_id]

      if req.body.yes
        perm = req.body.temporary ? true : false
        returnCode req, res, oauthinfo.scope, oauthinfo.state, oauthinfo.redirect_uri, perm
      else
        res.redirect oauthinfo.redirect_uri + "?error=access_denied" + oauthinfo.state

  app.all "/api/access_token", (req, res) ->
    clientid = req.param("client_id")
    secret = req.param("client_secret")
    code = req.param("code")
    util.debug "acquire access token"
    if not clientid or not secret or not code
      res.send
        error: "invalid_request"
      , 400
    else
      appman.authenticate
        clientid: clientid
        secret: secret
      , (result) ->
        if result.success
          oauthman.getCode code, (result) ->
            if not result.success or result.codeinfo.clientid isnt clientid
              res.send
                error: "invalid_grant"
              , 400
            else
              oauthman.generateAccessTokenFromCode result.codeinfo, (result) ->
                unless result.success
                  res.send 500
                else
                  accessToken = result.accessToken
                  res.send
                    access_token: accessToken.accesstoken
                    expires_in: ~~((accessToken.expiredate - new Date()) / 1000)

  app.all "/api/*", (req, res, next) ->
    token = req.param("access_token")
    if token
      oauthman.getAccessToken token, (result) ->
        if result.success
          req.tokeninfo = result.tokeninfo
          next()
        else
          res.send
            error: "invalid_token"
          , 403
    else
      res.send
        error: "invalid_token"
      , 403

  app.get "/api/userinfo", (req, res) ->
    User.getByName req.tokeninfo.username, (err, user) ->
      res.send
        err: err
        user: user

returnCode = (req, res, scope, state, redirect_uri, perm_auth) ->
  oauthman.generateCode
    username: req.session.user.name
    scope: scope
    redirect_uri: redirect_uri
    clientid: req.query.client_id
  , (code) ->
    if code is null
      res.send 500
    else
      if perm_auth
        appman.markAuthorized req.session.user.name, req.query.client_id
      res.redirect redirect_uri + "?code=" + code + state
