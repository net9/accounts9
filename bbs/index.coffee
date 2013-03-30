'use continuation'
BBS = require('./model')
messages = require('../messages')
helpers = require('../lib/helpers')

exports.connect = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    res.redirect BBS.getAuthorizeUrl()
  catch err
    next err

exports.token = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    if req.query.error
      req.flash 'error', req.query.error
      return res.redirect '/dashboard'
    BBS.updateToken req.session.user, req.query.code, obtain()
    req.flash 'info', messages.get('net9-bbs-connect-success')
    res.redirect '/dashboard'
  catch err
    next err
