'use continuation'
url = require('url')
User = require('./model')
Validation = require('./validation')
BBSUser = require('../bbs/model')
ThirdPartyUser = require('./thirdparty')
Group = require('../group/model')
appman = require('../app/man')
messages = require('../messages')
utils = require('../lib/utils')
helpers = require('../lib/helpers')
config = require('../config')

exports.userPage = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    helpers.checkAuthorized req, res, obtain()
    User.getByName req.params.username, obtain(user)
    user.getDirectGroups obtain()
    user.getAdminGroups obtain()
    BBSUser.getBBSUser user.uid, obtain(bbsUser)
    ThirdPartyUser.get user.uid, obtain(thirdpartyUser)
    helpers.checkRootAdmin req, res, obtain(isRoot), false
    res.render 'user/user',
      locals:
        title: user.title
        user: user
        bbsUser: bbsUser
        thirdpartyUser: thirdpartyUser
        isRoot: isRoot
  catch err
    helpers.errorRedirect(req, res, err, '/dashboard')

exports.dashboradPage = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    User.getByName req.session.user.name, obtain(user)
    user.getDirectGroups obtain()
    user.getAdminGroups obtain()
    BBSUser.getAndUpdate req.session.user.uid, obtain(bbsUser)
    appman.getAllByUser user.name, cont(apps)
    ThirdPartyUser.get req.session.user.uid, obtain(thirdpartyUser)
    helpers.checkRootAdmin req, res, obtain(isRoot), false
    res.render 'user/dashboard',
      locals:
        title: messages.get('dashboard')
        user: user
        bbsUser: bbsUser
        thirdpartyUser: thirdpartyUser
        apps: apps
        isRoot: isRoot
  catch err
    helpers.errorRedirect(req, res, err, '/')

exports.loginPage = (req, res) ->
  res.render 'login',
    locals:
      title: messages.get('Login')
      returnto: req.query.returnto

exports.login = (req, res) ->
  User.getByNameOrEmail req.body.username, (err, user) ->
    if not err and not (user.checkPassword req.body.password)
      err = 'invalid-password'
    if err
      req.flash 'error', err
      res.render 'login',
        locals:
          title: messages.get('Login')
          returnto: req.param('returnto')
    else
      req.session.user = user
      redirectUrl = req.param('returnto')
      redirectUrl = '/u/' + user.name  unless redirectUrl
      res.redirect redirectUrl

exports.fetchPassword = (req, res) ->
  try
    email = req.param('email')
    emailRegex = /^([a-z0-9_\.\-])+\@(([a-z0-9\-])+\.)+([a-z0-9]{2,4})+$/
    
    if not email or not emailRegex.exec(email)
      throw 'invalid-email'

    User.getByEmail email, obtain(user)
    Validation.newValidationCode user.uid, 'fetchpwd', obtain(code)
    p = {user_name: user.fullname, reset_link: config.host+'/login/resetpwd/'+code}
    console.log(p)
    helpers.sendMail 'fetchpwd', p, email, messages.get('fetch-password'), (err, status) ->
      if err
        console.log err
      else 
        console.log "mail sent for " + user.name
    req.flash 'info', 'mail-sending'
    res.redirect '/login'
  catch err
    helpers.errorRedirect(req, res, err, '/login/fetchpwd')

exports.fetchPasswordPage = (req, res) ->
  res.render 'user/fetchpwd',
    locals:
      title: messages.get('fetch-password')

exports.resetPasswordPage = (req, res) ->
  callback = (err, info) ->
    if err
      req.flash 'error', err
    else if info
      req.flash 'info', info
    res.render 'user/resetpwd',
      locals:
        title: messages.get('reset-password')

  Validation.checkValidationCode req.params.code, (err, usage, uid) ->
    if err or usage != 'fetchpwd'
      console.log(err)
      return callback('invalid-code') 
    if req.body.password and req.body["password-repeat"]
      if req.body.password != req.body["password-repeat"]
        return callback('password-mismatch')
      User.getByUid uid, (err, user) ->
        return callback(err) if err
        user.password = utils.genPassword req.body.password
        user.save()
        Validation.removeValidationCode(req.params.code)
        req.flash 'info', 'editinfo-success'
        res.redirect "/login"
    else
      callback null, null

exports.logout = (req, res) ->
  req.session.user = null
  res.redirect req.query.returnto or '/'

exports.register = (req, res, next) ->
  console.log 'register', req.body
  user = User.fillFrom {}, req.body
  User.create user, (err, user) ->
    if not err
      req.session.user = user
      req.flash 'info', 'register-success'
      res.redirect '/editinfo'
    else
      req.flash 'error', err
      next()

exports.registerPage = (req, res) ->
  res.render 'user/register',
    locals:
      title: messages.get('Register')

exports.checkUser = (req, res) ->
  User.checkName req.param('name'), (err) ->
    res.json err

exports.editInfoPage = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    # By default edit current user
    user = req.session.user
    # If username is specified, edit specified user
    if req.params.username
      # This privilege is reserved for admin of root
      helpers.checkRootAdmin req, res, obtain()
      User.getByName req.params.username, obtain(user)
    res.render 'user/editinfo',
      locals:
        title: messages.get('edit-userinfo')
        user: user
  catch err
    next err

exports.editInfo = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    # By default edit current user
    username = req.session.user.name
    if req.params.username
      # This privilege is reserved for admin of root
      helpers.checkRootAdmin req, res, obtain()
      username = req.params.username
      editByAdmin = true
    User.getByName username, obtain(user)
    # force rewrite submitted username to real username
    req.body.username = username
    User.fillFrom user, req.body

    User.validate user, obtain()
    if err?
      throw err

    # why would an authorized user change his real name!
    if req.body.surname != user.surname or req.body.givenname != user.givenname
      user.isAuthorized obtain(isAuthorized)
      if isAuthorized
        throw 'cannot-change-realname'

    # Check email
    user.email = user.email.toLowerCase()
    User.findOne {email: user.email}, obtain(existance)
    if (existance and (existance.uid isnt user.uid))
      throw 'email-already-exists'

    # Change if new password is set
    if req.body.newpass
      if (not editByAdmin) and (req.body.newpass isnt req.body.newpassrepeat)
        throw 'password-mismatch'
      if editByAdmin or user.checkPassword(req.body.oldpass)
        user.password = utils.genPassword req.body.newpass
      else
        throw 'wrong-old-password'
    user.save obtain()

    # Update session
    if user.uid is req.session.user.uid
      req.session.user = user
    req.flash 'info', messages.get('editinfo-success')
    if not editByAdmin
      res.redirect '/dashboard'
    else
      res.redirect '/editinfo/' + user.name
  catch err
    req.flash 'error', err
    res.render 'user/editinfo',
      locals:
        title: messages.get('edit-my-info')
        user: user

exports.search = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    helpers.checkAuthorized req, res, obtain()
    query = req.query.q
    if query
      cond =
        $or: [
          {name:
            $regex: query},
          {fullname:
            $regex: query},
          {nickname:
            $regex: query},
          {email:
            $regex: query},
          {address:
            $regex: query},
          {website:
            $regex: query},
          {bio:
            $regex: query},
        ]
      User.find cond, obtain(users)
    else
      users = []
    helpers.checkRootAdmin req, res, obtain(isRoot), false
    res.render 'user/searchresult',
      locals:
        title: messages.get('search-result')
        users: users
        isRoot: isRoot
  catch err
    next err

exports.connectRenren = (req, res, next) ->
  res.redirect ThirdPartyUser.getRenrenAuthrizeUrl()

exports.connectRenrenToken = (req, res, next) ->
  try
    helpers.checkLogin req, res, obtain()
    if req.query.error
      throw req.query.error
    code = req.query.code
    ThirdPartyUser.updateRenren req.session.user, code, obtain()
    req.flash 'info', '连接成功'
    res.redirect '/dashboard'
  catch err
    helpers.errorRedirect(req, res, err, '/dashboard')

exports.connectWeibo = (req, res, next) ->
  try
    ThirdPartyUser.getWeiboAuthorizeUrl obtain(redirectUrl)
    res.redirect redirectUrl
  catch err
    helpers.errorRedirect(req, res, err, '/dashboard')

exports.connectWeiboToken = (req, res, next) ->
  next 'not-implemented'
