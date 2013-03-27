'use continuation'
url = require('url')
assert = require('assert')
User = require('../user/model')

exports.checkLogin = (req, res, next) ->
  if req.session.user
    next()
  else
    req.flash "error", "not-loged-in"
    res.redirect url.format(
      pathname: "/login"
      query:
        returnto: req.url
    )

exports.checkAuthorized = (req, res, next) ->
  exports.checkLogin req, res, obtain()
  try
    User.getByName req.session.user.name, obtain(user)
    user.isAuthorized obtain(isAuthorized)
    if isAuthorized
      next()
    else
      req.flash "error", "not-authorized"
      res.redirect "/dashboard"
  catch err
    next err

exports.errorRedirect = (req, res, err, redirect) ->
  req.flash "error", err
  res.redirect redirect
