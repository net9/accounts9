'use continuation'
User = require('../user/model')
messages = require('../messages')
utils = require('../lib/utils')
helpers = require('../lib/helpers')
config = require('../config')

########
# !!! all pages under /card9 require root privilege
########

exports.permissionCheck = (req, res, next) ->
	try
		helpers.checkRootAdmin req, res, obtain()
		next()
	catch err
		helpers.errorRedirect(req, res, err, '/dashboard')
		
exports.helper = (req, res, next) ->
	try
		User.getByName req.params.username, obtain(req.user)
		req.query.identity ?= ""
		try 
			req.identity = utils.hexStringToBuffer(req.query.identity)
			next()
		catch err
			helpers.errorRedirect(req, res, err, '/card9/' + req.user.name)
	catch err
		helpers.errorRedirect(req, res, err, '/dashboard')

exports.userPage = (req, res, next) ->
  try
    res.render 'card9/user',
      locals:
        title: req.user.title
        user: req.user
        beautify: utils.hexStringBeautify
  catch err
    helpers.errorRedirect(req, res, err, '/dashboard')

exports.add = (req, res, next) ->
	try
		req.user.addIdentity req.identity, obtain()
		req.flash 'info', 'add-identity-success'
		res.redirect '/card9/' + req.user.name
	catch err
    helpers.errorRedirect(req, res, err, '/card9/' + req.user.name)

exports.remove = (req, res, next) ->
	try
		req.user.removeIdentity req.identity, obtain()
		req.flash 'info', 'remove-identity-success'
		res.redirect '/card9/' + req.user.name
	catch err
		helpers.errorRedirect(req, res, err, '/card9/' + req.user.name)

exports.removePage = (req, res, next) ->
  try
    backUrl = '/card9/' + req.user.name
    res.render 'confirm',
      locals:
        title: messages.get('del-identity')
        backUrl: backUrl
        confirm: messages.get('del-identity-confirm')
  catch err
    helpers.errorRedirect req, res, err, backUrl