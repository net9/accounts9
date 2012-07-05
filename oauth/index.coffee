appman = require("../app/man")
oauthman = require("./man")
messages = require("../messages")
User = require("../user/model")
Group = require("../group/model")
Metainfo = require("../lib/metainfo")
utils = require("../lib/utils")
config = require '../config'
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

  accessTokenPath = "/api/access_token"
  app.all accessTokenPath, (req, res, next) ->
    clientid = req.param("client_id")
    secret = req.param("client_secret")
    code = req.param("code")
    username = req.param("username")
    password = req.param("password")
    if not clientid or not secret or (not code and not username)
      return res.send error: "invalid_request", 400
    
    appman.authenticate
      clientid: clientid
      secret: secret
    , (result) ->
      if not result.success
        #Todo error
        return
      if code
        #Generate access token from code
        oauthman.getCode code, (err, code) ->
          #Check code
          if not err and code.clientid isnt clientid
            err = "invalid_grant"
          if err
            return res.send error: err, 400
          req.code = code
          next()
      else
        #Check username and password
        User.getByName username, (err, user) ->
          if not err and not user.checkPassword password
            err = "invalid_password"
          return res.send error: err, 400 if err
          req.user = user
          req.clientid = clientid
          next()

  app.all accessTokenPath, (req, res, next) ->
    return next() if not req.code?
    code = req.code
    oauthman.generateAccessTokenFromCode code, (err, token) ->
      #Generate access token from code
      return res.send error: err, 400 if err
      req.token = token
      next()

  app.all accessTokenPath, (req, res, next) ->
    return next() if not req.user?
    user = req.user
    token = 
      username: user.name
      scope: 'all'
      clientid: req.clientid
    oauthman.genAccessToken token, (err, token) ->
      return res.send error: err, 400 if err
      req.token = token
      next()
      
  app.all accessTokenPath, (req, res, next) ->
    token = req.token
    res.send
      access_token: token.accesstoken
      expires_in: ~~((token.expiredate - new Date()) / 1000)
              
  app.all "/api/*", (req, res, next) ->
    #Validate access token
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
  
  #Methods below need additional authrorizations
  app.get "/api/*", (req, res, next) ->
    interfaceSecret = req.param("interface_secret")
    if not (config.interfaceSecret is interfaceSecret)
      return res.send error: "invalid_secret", 403
    next()
  
  app.get "/api/grouptimestamp", (req, res) ->
    Metainfo.groupTimestamp (err, group_timestamp) ->
      res.send
        err: err
        group_timestamp: group_timestamp.getTime()
  
  app.get "/api/groups", (req, res) ->
    Group.getAll (err, groups) ->
      res.send
        err: err
        groups: groups

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
