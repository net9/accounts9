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
        app[method.toLowerCase()] route.path, handler
