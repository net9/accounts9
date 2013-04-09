'use continuation'
url = require('url')
User = require('./model')
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
    res.render 'user/user',
      locals:
        title: user.title
        user: user
        bbsUser: bbsUser
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
    res.render 'user/dashboard',
      locals:
        title: messages.get('dashboard')
        user: user
        bbsUser: bbsUser
        apps: apps
  catch err
    helpers.errorRedirect(req, res, err, '/')

exports.loginPage = (req, res) ->
  res.render 'login',
    locals:
      title: messages.get('Login')
      returnto: req.query.returnto

exports.login = (req, res) ->
  User.getByName req.body.username, (err, user) ->
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

exports.fetchPasswordPage = (req, res) ->
  res.render 'user/fetchpwd',
    locals:
      title: messages.get('fetch-password')

exports.logout = (req, res) ->
  req.session.user = null
  res.redirect req.query.returnto or '/'

exports.register = (req, res, next) ->
  user = utils.subset(req.body, ['name', 'password', 'password-repeat', 'email'])
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
    user.bachelor = year: req.body.bachelorYear, classNumber: req.body.bachelorClassNumber
    user.master = year: req.body.masterYear, classNumber: req.body.masterClassNumber
    user.doctor = year: req.body.doctorYear, classNumber: req.body.doctorClassNumber
    
    # Check email
    user.email = user.email.toLowerCase()
    User.findOne {email: user.email}, obtain(existance)
    if (existance and (existance.uid isnt user.uid))
      throw 'email-already-exists'
    
    # Change if new password is set
    if req.body.newpass
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
    res.render 'user/searchresult',
      locals:
        title: '搜索结果'
        users: users
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
