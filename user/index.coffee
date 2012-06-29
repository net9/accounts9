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
getUser = (req, res, next) ->
  User.getByName req.params.username, (err, user) ->
    return utils.errorRedirect(req, res, err, "/")  if err
    req.user = user
    next()
getCurrentUser = (req, res, next) ->
  User.getByName req.session.user.name, (err, user) ->
    return utils.errorRedirect(req, res, err, "/")  if err
    req.user = user
    next()
getUserDirectGroup = (req, res, next) ->
  user = req.user
  Group.getByNames user.groups, (err, groups) ->
    return utils.errorRedirect(req, res, err, "/")  if err
    user.groups = groups
    next()
getUserAdminGroup = (req, res, next) ->
  user = req.user
  Group.getAll (err, groups) ->
    user.adminGroups = []
    groups.forEach (group) ->
      user.adminGroups.push group  if utils.contains(group.admins, user.name)

    next()
getApps = (req, res, next) ->
  user = req.user
  appman.getAllByUser user.name, (apps) ->
    req.apps = apps
    next()
User = require("./model")
Group = require("../group/model")
appman = require("../app/man")
messages = require("../messages")
utils = require("../lib/utils")
url = require("url")
assert = require("assert")
module.exports = (app) ->
  app.get '/test', (req, res, next) ->
    User.getByName 'byvoid', (err, user) ->
      user.generateUid null
  
  userPath = "/u/:username"
  app.get userPath, checkLogin
  app.get userPath, utils.checkAuthorized
  app.get userPath, getUser
  app.get userPath, getUserDirectGroup
  app.get userPath, getUserAdminGroup
  app.get userPath, (req, res, next) ->
    user = req.user
    res.render "user/user",
      locals:
        title: user.title
        user: user

  dashboard = "/dashboard"
  app.get dashboard, checkLogin
  app.get dashboard, getCurrentUser
  app.get dashboard, getUserDirectGroup
  app.get dashboard, getUserAdminGroup
  app.get dashboard, getApps
  app.get dashboard, (req, res, next) ->
    res.render "user/dashboard",
      locals:
        title: messages.get("dashboard")
        user: req.user
        apps: req.apps

  app.get "/login", (req, res) ->
    res.render "login",
      locals:
        title: messages.get("Login")
        returnto: req.query.returnto

  app.post "/login", (req, res) ->
    User.getByName req.body.username, (err, user) ->
      
      if not err and not (user.checkPassword req.body.password)
        err = 'invalid-password'
      
      if err
        req.flash "error", err
        res.render "login",
          locals:
            title: messages.get("Login")
            returnto: req.param("returnto")
      else
        req.session.user = user
        redirectUrl = req.param("returnto")
        redirectUrl = "/u/" + user.name  unless redirectUrl
        res.redirect redirectUrl

  app.get "/logout", (req, res) ->
    req.session.user = null
    res.redirect req.query.returnto or "/"

  app.post "/register", (req, res, next) ->
    user = utils.subset(req.body, [ "name", "password", "password-repeat", "email" ])
    User.create user, (err, user) ->
      if not err
        req.session.user = user
        req.flash "info", "register-success"
        res.redirect "/editinfo"
      else
        req.flash "error", err
        next()

  app.all "/register", (req, res) ->
    res.render "user/register",
      locals:
        title: messages.get("Register")

  app.get "/checkuser", (req, res) ->
    User.checkName req.param("name"), (err) ->
      res.json err

  app.all "/editinfo", checkLogin
  app.get "/editinfo", (req, res) ->
    res.render "user/editinfo",
      locals:
        title: messages.get("edit-userinfo")
        user: req.session.user

  app.post "/editinfo", (req, res, next) ->
    User.getByName req.session.user.name, (err, user) ->
      assert not err
      req.user = user
      user.nickname = req.body.nickname
      user.surname = req.body.surname
      user.givenname = req.body.givenname
      user.fullname = req.body.fullname
      user.email = req.body.email
      user.mobile = req.body.mobile
      user.website = req.body.website
      user.address = req.body.address
      user.bio = req.body.bio
      user.birthdate = req.body.birthdate
      user.fullname = user.surname + user.givenname
      
      if req.body.newpass
        if user.checkPassword req.body.oldpass
          user.password = utils.genPassword req.body.newpass
        else
          req.flash "error", "wrong-old-pass"
          res.render "user/editinfo",
            locals:
              title: messages.get("edit-my-info")
              user: user
          return
      next()

  app.post "/editinfo", (req, res, next) ->
    user = req.user
    user.save (err) ->
      if err
        req.flash "error", err
        res.render "user/editinfo",
          locals:
            title: messages.get("edit-my-info")
            user: user
      else
        req.session.user = user
        req.flash "info", messages.get("editinfo-success")
        res.redirect "/dashboard"
