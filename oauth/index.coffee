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
        if req.body.temporary
          perm = false
        else
          perm = true
        returnCode req, res, oauthinfo.scope, oauthinfo.state, oauthinfo.redirect_uri, perm
      else
        res.redirect oauthinfo.redirect_uri + "?error=access_denied" + oauthinfo.state

  app.all "/api/access_token", (req, res) ->
    clientid = req.param("client_id")
    secret = req.param("client_secret")
    code = req.param("code")
    if not clientid or not secret or not code
      return res.send error: "invalid_request", 400
    
    console.log clientid
    console.log secret
    console.log code

    appman.authenticate
      clientid: clientid
      secret: secret
    , (result) ->
      if not result.success
        #Todo error
        return
      oauthman.getCode code, (err, code) ->
        console.log err
        console.log code
        if not err and code.clientid isnt clientid
          err = "invalid_grant"
        if err
          return res.send error: err, 400
        oauthman.generateAccessTokenFromCode code, (err, token) ->
          console.log err
          console.log token
          if err
            res.json err
          else
            res.send
              access_token: token.accesstoken
              expires_in: ~~((token.expiredate - new Date()) / 1000)

  app.all "/api/*", (req, res, next) ->
    token = req.param("access_token")
    if token
      oauthman.getAccessToken token, (err, token) ->
        if not err
          req.tokeninfo = token
          next()
        else
          res.send error: "invalid_token", 403
    else
      res.send error: "invalid_token", 403

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
  , (err, code) ->
    if err
      res.json err
    else
      if perm_auth
        appman.markAuthorized req.session.user.name, req.query.client_id
      res.redirect redirect_uri + "?code=" + code + state
