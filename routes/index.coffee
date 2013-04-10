messages = require('../messages')
user = require('../user')
group = require('../group')
bbs = require('../bbs')

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
    path: '/dashboard/connect/renren'
    GET: user.connectRenren
  }, {
    path: '/dashboard/connect/renren/token'
    GET: user.connectRenrenToken
  }, {
    path: '/dashboard/connect/weibo'
    GET: user.connectWeibo
  }, {
    path: '/dashboard/connect/weibo/token'
    GET: user.connectWeiboToken
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
  }, {
    path: '/group/:groupname/del'
    GET: group.delGroupPage
    POST: group.delGroup
  }, {
    path: '/group/:groupname/allusers'
    GET: group.allUsersPage
  }, {
    path: '/group/:groupname/adduser'
    GET: group.addUserPage
    POST: group.addUser
  }, {
    path: '/group/:groupname/deluser/:username'
    GET: group.delUserPage
    POST: group.delUser
  }, {
    path: '/group/:groupname/addadmin'
    GET: group.addAdminPage
    POST: group.addAdmin
  }, {
    path: '/group/:groupname/deladmin/:username'
    GET: group.delAdminPage
    POST: group.delAdmin
  }, {
    path: '/bbs/connect'
    GET: bbs.connect
  }, {
    path: '/bbs/token'
    GET: bbs.token
  }
]

module.exports = (app) ->
  for route in routes
    for method, handler of route
      if method isnt 'path'
        method = method.toLowerCase()
        app[method] route.path, handler
