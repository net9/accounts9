messages = require('../messages')
user = require('../user')
group = require('../group')

indexPage = (req, res) ->
  res.render 'index',
    layout: false
    locals:
      title: messages.get('index')

aboutPage = (req, res) ->
  res.render 'about',
    locals:
      title: messages.get('about')

routes = [
  {
    path: '/'
    GET: indexPage
  }, {
    path: '/about'
    GET: aboutPage
  }, {
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
    path: '/editinfo/:username'
    GET: user.editInfoPage
    POST: user.editInfo
  }, {
    path: '/search'
    GET: user.search
  }, {
    path: '/group'
    GET: group.hierarchyPage
  }, {
    path: '/group/:groupname'
    GET: group.groupPage
  }, {
    path: '/group/:groupname/addgroup'
    GET: group.addGroupPage
    POST: group.addGroup
  }, {
    path: '/group/:groupname/edit'
    GET: group.editGroupPage
    POST: group.editGroup
  }
]

module.exports = (app) ->
  for route in routes
    for method, handler of route
      if method isnt 'path'
        method = method.toLowerCase()
        app[method] route.path, handler
