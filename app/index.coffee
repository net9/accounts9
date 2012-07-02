checkAppOwner = (req, res, next) ->
  unless req.amOwner
    req.flash "error", "unauthorized"
    res.redirect "/apps/" + req.params.clientid
  else
    next()
appman = require("./man")
messages = require("../messages")
utils = require("../lib/utils")
module.exports = (app) ->
  appRegPath = "/appreg"
  app.all appRegPath, utils.checkLogin
  app.all appRegPath, utils.checkAuthorized
  app.get appRegPath, (req, res) ->
    res.render "appreg",
      locals:
        title: messages.get("register-new-app")

  app.post appRegPath, (req, res) ->
    appman.register req.session.user.name,
      name: req.body.name
      secret: req.body.secret
      desc: req.body.desc
    , (result) ->
      if result.success
        req.flash "info", "new-app-success"
        res.redirect "/apps/" + result.appinfo.clientid
      else
        req.flash "error", result.error
        res.render "appreg",
          locals:
            title: messages.get("register-new-app")
            appinfo: result.appinfo

  app.all "/apps/:clientid/:op?", (req, res, next) ->
    appman.getByID req.params.clientid, (result) ->
      if result.success
        req.appinfo = result.appinfo
        req.amOwner = req.session.user and result.appinfo.owners.indexOf(req.session.user.name) isnt -1
        next()
      else
        if result.error is "app-not-found"
          res.send 404
        else
          res.send 500

  app.get "/apps/:clientid", (req, res) ->
    res.render "apppage",
      locals:
        title: messages.get("app-page-title", req.appinfo.name)
        appinfo: req.appinfo
        amOwner: req.amOwner

  app.get "/apps/:clientid/revoke", (req, res) ->
    res.render "confirm",
      locals:
        title: messages.get("revoke-authorization")
        backUrl: "/dashboard/"
        confirm: messages.get("revoke-authorization-confirm", req.appinfo.clientid, req.appinfo.name)
  app.post "/apps/:clientid/revoke", (req, res) ->
    appman.removeAuthorized req.session.user.name, req.appinfo.clientid, (err) ->
      if err
        req.flash "error", err
      else
        req.flash "info", "app-revoke-success"
      res.redirect "/dashboard"

  app.all "/apps/:clientid/remove", checkAppOwner
  app.get "/apps/:clientid/remove", (req, res) ->
    res.render "confirm",
      locals:
        title: messages.get("removing-app", req.appinfo.name)
        backUrl: "/apps/" + req.appinfo.clientid
        confirm: messages.get("removing-app-confirm", req.appinfo.name)

  app.post "/apps/:clientid/remove", (req, res) ->
    appman.deleteByID req.params.clientid, (result) ->
      if result.success
        req.flash "info", "app-removal-success"
        res.redirect "/dashboard"
      else
        req.flash "error", "unknown"
        res.redirect "/apps/" + req.params.clientid

  app.all "/apps/:clientid/edit", checkAppOwner
  app.get "/apps/:clientid/edit", (req, res) ->
    res.render "appedit",
      locals:
        title: messages.get("editing-app", req.appinfo.name)
        appinfo: req.appinfo

  app.post "/apps/:clientid/edit", (req, res) ->
    newInfo =
      clientid: req.params.clientid
      name: req.body.name
      oldsecret: req.body.oldsecret
      newsecret: req.body.newsecret
      desc: req.body.desc

    appman.updateInfo newInfo, (result) ->
      if result.success
        req.flash "info", "app-editinfo-success"
        res.redirect "/apps/" + req.params.clientid
      else
        req.flash "error", result.error
        res.render "appedit",
          locals:
            title: messages.get("editing-app", req.appinfo.name)
            appinfo: newInfo
