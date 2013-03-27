appman = require '../app/man' 
messages = require '../messages' 
util = require 'util' 

user = require('../user')
routes = [
  {
    path: '/u/:username'
    GET: user.userPage
  }, {
    path: '/dashboard'
    GET: user.dashboradPage
  }, {
    path: '/login'
    GET: user.loginPage
    POST: user.login
  }, {
    path: '/logout'
    GET: user.logout
  }, {
    path: '/login/fetchpwd'
    GET: user.fetchPasswordPage
  }, {
    path: '/register'
    POST: user.register
    ALL: user.registerPage
  }, {
    path: '/checkuser'
    ALL: user.checkUser
  }, {
    path: '/editinfo'
    GET: user.editInfoPage
    POST: user.editInfo
  }, {
    path: '/search'
    GET: user.search
  }
]

module.exports = (app) ->
  app.get '/', (req, res) ->
    res.render 'index',
      layout: false
      locals:
        title: messages.get('index')

  app.get '/about', (req, res) ->
    res.render 'about',
      locals:
        title: messages.get('about')

  app.all '/debug', (req, res, next) ->
    next new Error('aaa')

  for route in routes
    for method, handler of route
      if method isnt 'path'
        method = method.toLowerCase()
        app[method] route.path, handler
