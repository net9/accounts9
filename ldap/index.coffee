ldap = require 'ldapjs'

User = require('../user/model')
Group = require('../group/model').model
config = require '../config' 

server = module.exports = ldap.createServer()

SUFFIX = 'dc=net9, dc=org'
USERS_DN = 'dc=users, '+SUFFIX
GROUPS_DN = 'dc=groups, '+SUFFIX
AUTH_DN = 'cn=auth, '+SUFFIX

# ldap_debug = console.log 
ldap_debug = () ->
  ;

authorize = (req, res, next)->
  if (!req.connection.ldap.bindDN.equals(AUTH_DN))
    return next(new ldap.InsufficientAccessRightsError());

  return next();

server.bind AUTH_DN, (req, res, next)->
  if (req.dn.toString() != AUTH_DN or req.credentials != config.interfaceSecret)
    return next(new ldap.InvalidCredentialsError());

  res.end()
  return next()

server.bind USERS_DN, (req, res, next)->
  uname = req.dn.rdns[0]
  if not uname or not uname['cn']
    return next(new ldap.InvalidCredentialsError());

  uname = uname['cn']
  ldap_debug '======bind user======'
  ldap_debug("user: "+uname)
  User.getByName uname, (err,user)->
    if not err and (user.checkPassword req.credentials)
      user.isAuthorized (err,authorized)->
        if not err and authorized
          res.end()
          ldap_debug 'passed'
          return next()
        else
          ldap_debug 'failed: not authorized'
          return next(new ldap.InvalidCredentialsError())
    else
      ldap_debug 'failed: wrong password'
      return next(new ldap.InvalidCredentialsError())

server.search USERS_DN, authorize, (req, res, next)->
  if not req.connection.ldap.bindDN.equals(AUTH_DN)
    next(new ldap.InsufficientAccessRightsError())

  handle_err = (err) ->
    ldap_debug err
    next(new ldap.UnavailableError())

  ldap_debug '======search user======'
  ldap_debug req.dn
  ldap_debug req.filter.json
  if req.dn.equals(USERS_DN)
    query = filter2mongoquery(req.filter)
    # ldap_debug req.scope
    ldap_debug (JSON.stringify (query))
    
    User.find query, (err, users) ->
      return handle_err(err) if err
      # ldap_debug(users)
      for user in users
        record = buildUserRecord(user)
        ldap_debug record
        res.send(record)
      res.end()
      next()
  else
    uname = req.dn.rdns[0]
    if uname and uname['cn']
      uname = uname['cn']
      ldap_debug("User Name: "+uname)
      User.find {'name': uname}, (err,users)->
        for user in users
          record = buildUserRecord(user)
          ldap_debug record
          res.send(record)
        res.end()
        next()
    else
      next(new ldap.UnavailableError())

server.search GROUPS_DN, authorize, (req, res, next)->
  if not req.connection.ldap.bindDN.equals(AUTH_DN)
    next(new ldap.InsufficientAccessRightsError())

  handle_err = (err) ->
    ldap_debug err
    next(new ldap.UnavailableError())

  ldap_debug '======search group======'
  ldap_debug req.dn
  ldap_debug req.filter.json
  if req.dn.equals(GROUPS_DN)
    query = filter2mongoquery(req.filter)
    ldap_debug (JSON.stringify (query))
    
    Group.find query, (err, groups) ->
      return handle_err(err) if err
      # ldap_debug(groups)
      for group in groups
        record = buildGroupRecord(group)
        ldap_debug record
        res.send(record)
      res.end()
      next()
  else
    gname = req.dn.rdns[0]
    if gname and gname['cn']
      gname = gname['cn']
      ldap_debug("Group Name: "+gname)
      Group.find {'name': gname}, (err,groups)->
        for group in groups
          record = buildGroupRecord(group)
          ldap_debug record
          res.send(record)
        res.end()
        next()
    else
      next(new ldap.UnavailableError())

username2dn = (name)->
  'cn='+name+', '+USERS_DN

dn2username = (dn)->
  ldap.parseDN(dn).rdns[0]['cn']

filter2mongoquery = (filter)->
  result = {}
  switch filter.type
    when 'or','and'
      a = for k,v of filter.filters
        filter2mongoquery(v)
      result['$'+filter.type] = a
    when 'not'
      result['$not'] = filter2mongoquery(filter.filter)
    when 'equal'
      if filter.attribute != 'objectclass'
        if filter.attribute == 'member'
          result['users'] = dn2username(filter.value)
        else
          result[filter.attribute] = filter.value
    when 'present'
      if filter.attribute != 'objectclass'
        result[filter.attribute] = {$exists: true}
    when 'ge'
      result[filter.attribute] = {$gte: filter.value}
    when 'le'
      result[filter.attribute] = {$lte: filter.value}
  return result

buildUserRecord = (user)->
  record = 
    dn: username2dn(user.name)
    attributes:
      objectclass: 'inetOrgPerson'
      cn: user.name
      uid: user.uid
      name: user.name
      email: user.email
      fullname: user.fullname

buildGroupRecord = (group)->
  members = []
  for u in group.users
    members.push username2dn(u)
  record = 
    dn: 'cn='+group.name+', '+GROUPS_DN
    attributes:
      objectclass: 'group'
      cn: group.name
      name: group.name
      title: group.title
      member: members


