Group = require '../group/model' 
User = require '../user/model' 
config = require '../config' 
assert = require 'assert' 

module.exports = (app) ->
  interfacePath = '/interface'
  app.all interfacePath, (req, res, next) ->
    return res.json(error: 'invalid-secret')  unless config.interfaceSecret is req.body.interfaceSecret
    next()

  app.all interfacePath, (req, res, next) ->
    Group.getAll (err, groups) ->
      return res.json(error: err)  if err
      req.groups = groups
      next()

  app.all interfacePath, (req, res, next) ->
    groups = req.groups
    done = 0
    groups.forEach (group) ->
      group.getAdmins (err, admins) ->
        assert not err
        group.allAdmins = admins
        done++
        next()  if done is groups.length

  app.all interfacePath, (req, res, next) ->
    groups = req.groups
    usernamesMap = {}
    groups.forEach (group) ->
      return  if group.name is 'root'
      group.users.forEach (userName) ->
        usernamesMap[userName] = true

    userNames = []
    for userName of usernamesMap
      userNames.push userName
    User.getByNames userNames, (err, users) ->
      return res.json(error: err)  if err
      req.users = users
      next()

  app.all interfacePath, (req, res, next) ->
    users = req.users
    done = 0
    users.forEach (user) ->
      user.getAllGroups (err, groups) ->
        assert not err
        user.allGroups = groups
        done++
        next()  if done is users.length

  app.all interfacePath, (req, res, next) ->
    result =
      users: req.users
      groups: req.groups

    res.json result
