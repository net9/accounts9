'use continuation'
User = require('./model')
BBSUser = require('../bbs/model')
Group = require('../group/model')
appman = require('../app/man')
messages = require('../messages')
utils = require('../lib/utils')
url = require('url')
assert = require('assert')

checkLogin = (req, res, next) ->
  if req.session.user
    next()
  else
    req.flash 'error', 'not-loged-in'
    res.redirect url.format(
      pathname: '/login'
      query:
        returnto: req.url
    )

userPage = (req, res, next) ->
  try
    checkLogin req, res, obtain()
    utils.checkAuthorized req, res, obtain()
    User.getByName req.params.username, obtain(user)
    user.getDirectGroups obtain()
    user.getAdminGroups obtain()
    res.render 'user/user',
      locals:
        title: user.title
        user: user
  catch err
    utils.errorRedirect(req, res, err, '/dashboard')

dashboradPage = (req, res, next) ->
  try
    checkLogin req, res, obtain()
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
    utils.errorRedirect(req, res, err, '/dashboard')

module.exports = (app) ->
  app.get '/u/:username', userPage
  app.get '/dashboard', dashboradPage

  app.get '/login', (req, res) ->
    res.render 'login',
      locals:
        title: messages.get('Login')
        returnto: req.query.returnto

  app.post '/login', (req, res) ->
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
        
  app.get '/login/fetchpwd', (req, res) ->
    res.render 'user/fetchpwd',
      locals:
        title: messages.get('fetch-password')
  
  app.get '/logout', (req, res) ->
    req.session.user = null
    res.redirect req.query.returnto or '/'

  app.post '/register', (req, res, next) ->
    user = utils.subset(req.body, [ 'name', 'password', 'password-repeat', 'email' ])
    User.create user, (err, user) ->
      if not err
        req.session.user = user
        req.flash 'info', 'register-success'
        res.redirect '/editinfo'
      else
        req.flash 'error', err
        next()

  app.all '/register', (req, res) ->
    res.render 'user/register',
      locals:
        title: messages.get('Register')

  app.get '/checkuser', (req, res) ->
    User.checkName req.param('name'), (err) ->
      res.json err

  app.all '/editinfo', checkLogin
  app.get '/editinfo', (req, res) ->
    res.render 'user/editinfo',
      locals:
        title: messages.get('edit-userinfo')
        user: req.session.user

  app.post '/editinfo', (req, res, next) ->
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
      user.bachelor = year: req.body.bachelorYear, classNumber: req.body.bachelorClassNumber
      user.master = year: req.body.masterYear, classNumber: req.body.masterClassNumber
      user.doctor = year: req.body.doctorYear, classNumber: req.body.doctorClassNumber
      
      if req.body.newpass
        if user.checkPassword req.body.oldpass
          user.password = utils.genPassword req.body.newpass
        else
          req.flash 'error', 'wrong-old-pass'
          res.render 'user/editinfo',
            locals:
              title: messages.get('edit-my-info')
              user: user
          return
      next()

  app.post '/editinfo', (req, res, next) ->
    user = req.user
    user.save (err) ->
      if err
        req.flash 'error', err
        res.render 'user/editinfo',
          locals:
            title: messages.get('edit-my-info')
            user: user
      else
        req.session.user = user
        req.flash 'info', messages.get('editinfo-success')
        res.redirect '/dashboard'

  searchPath = '/search'
  app.get searchPath, checkLogin
  app.get searchPath, utils.checkAuthorized
  app.get searchPath, (req, res, next) ->
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
