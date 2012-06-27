appman = require '../app/man' 
messages = require '../messages' 
util = require 'util' 

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
