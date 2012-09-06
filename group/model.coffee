class Group
  constructor: (group) ->
    @name = group.name
    @title = group.title
    @desc = group.desc
    @users = group.users
    @admins = group.admins
    @parent = group.parent
    @children = group.children

mongoose = require "../lib/mongoose"
metainfo = require "../lib/metainfo"
utils = require "../lib/utils"
User = require "../user/model"
assert = require "assert"
module.exports = Group

mongoose.model "Group", new mongoose.Schema(
  name:
    type: String
    index: true
    unique: true

  title: String
  desc: String
  users: [ String ]
  admins: [ String ]
  parent: String
  children: [ String ]
)

Group.model = mongoose.model("Group")

# Get one group by name
Group.getByName = getByName = (name, callback) ->
  Group._getGroup name, (err, group) ->
    return callback(err)  if err
    callback null, new Group(group)

# Get a set of groups by names
Group.getByNames = getByNames = (names, callback) ->
  groups = []
  returned = false
  return callback(null, groups)  if names.length is 0
  names.forEach (name) ->
    return  if returned
    Group.getByName name, (err, group) ->
      if err
        returned = true
        return callback(err)
      groups.push group
      if groups.length is names.length
        utils.sortBy groups, "name"
        callback null, groups

Group._getGroup = _getGroup = (name, callback) ->
  return callback("mongodb-not-connected")  unless mongoose.connected
  Group.model.find
    name: name
  , (err, group) ->
    return callback(err)  if err
    return callback("no-such-group")  if group.length is 0
    assert.equal group.length, 1
    callback null, group[0]

# Get all groups
Group.getAll = getAll = (callback) ->
  return callback("mongodb-not-connected")  unless mongoose.connected
  Group.model.find {}, (err, groups) ->
    return callback(err)  if err
    groups = groups.map((group) ->
      new Group(group)
    )
    callback null, groups

Group.getAllStructured = getAllStructured = (callback) ->
  Group.getAll (err, groups) ->
    makeTree = (node) ->
      node = groupsMap[node]
      assert node
      children = []
      i = 0

      while i < node.children.length
        children.push makeTree(node.children[i])
        i++
      node.children = children
      node
    return callback(err)  if err
    groupsMap = {}
    groups.forEach (group) ->
      groupsMap[group.name] = group

    root = makeTree("root")
    callback null, root

Group.create = create = (group, callback) ->
  return callback("fields-required")  if not group.name or not group.title or not group.desc
  group.users = group.users or []
  group.admins = group.admins or []
  group.children = group.children or []
  Group.getByName group.name, (err) ->
    return callback("group-name-exists")  unless err
    return callback(err)  unless err is "no-such-group"
    group = new Group.model(group)
    group.save (err) ->
      callback err, new Group(group)

Group.initialize = initialize = (user, callback) ->
  group =
    name: "root"
    title: "Root"
    desc: "The root group"
    users: []
    admins: [ user.name ]
    parent: null
    children: [ "authorized" ]

  Group.create group, (err, root) ->
    return callback(err)  if err
    group =
      name: "authorized"
      title: "Authorized"
      desc: "Authorized users"
      users: [ user.name ]
      admins: []
      parent: "root"
      children: []

    Group.create group, (err, authorized) ->
      return callback(err)  if err
      user.addToGroup authorized.name, (err) ->
        return callback(err)  if err
        callback err, root, authorized

Group::save = save = (callback) ->
  self = this
  Group._getGroup @name, (err, group) ->
    return callback err if err
    utils.mergeProps group, self
    Group.model::save.call group, (err) ->
      callback err
      #Update group metainfo
      metainfo.updateGroup()

Group::remove = (callback) ->
  self = this
  Group._getGroup @name, (err, group) ->
    return callback(err)  if err
    if self.users.length != 0 or self.children.length != 0
      return callback('can-not-delete-group-not-empty')
    
    Group.getByName self.parent, (err, parentGroup) ->
      return callback(err)  if err
      parentGroup.removeChildGroup self.name, (err) ->
        return callback(err)  if err
        Group.model::remove.call group, callback

Group::addUser = addUser = (username, callback) ->
  for key of @users
    return callback("already-in-this-group")  if @users[key] is username
  @users.push username
  @save callback

Group::removeUser = removeUser = (userName, callback) ->
  i = 0

  while i < @users.length
    if @users[i] is userName
      @users = @users.slice(0, i).concat(@users.slice(i + 1))
      @save callback
      return
    i++
  callback "not-in-this-group"

Group::checkUser = checkUser = (username, options, callback) ->
  self = this
  unless callback
    callback = options
    options = {}
  if options.direct
    for i of @users
      return callback(null, true)  if @users[i] is username
    return callback(null, false)
  User.getByName username, (err, user) ->
    return callback(err)  if err
    user.checkGroup self.name, callback

Group::getAncestors = getAncestors = (callback) ->
  self = this
  if self.parent
    Group.getByName self.parent, (err, group) ->
      group.getAncestors (err, ancesstors) ->
        return callback(err)  if err
        ancesstors.push group
        callback null, ancesstors
  else
    callback null, []

Group::getAdmins = (callback) ->
  self = this
  returned = false
  self.getAncestors (err, ancestors) ->
    return callback(err)  if err
    ancestors.push self
    admins = []
    for i of ancestors
      group = ancestors[i]
      admins = utils.mergeArray(admins, group.admins)
    callback null, admins

Group::checkAdmin = checkAdmin = (username, callback) ->
  self = this
  returned = false
  self.getAncestors (err, ancestors) ->
    ancestors.push self
    for i of ancestors
      group = ancestors[i]
      for j of group.admins
        admin = group.admins[j]
        if admin is username
          callback null, true
          returned = true
          break
      return  if returned
    callback null, false

Group::getDescendant = getDescendant = (callback) ->
  self = this
  Group.getByNames self.children, (err, children) ->
    assert not err
    return callback(null, [])  if children.length is 0
    groupMap = {}
    done = 0
    children.forEach (childGroup) ->
      groupMap[childGroup.name] = childGroup
      childGroup.getDescendant (err, groups) ->
        assert not err
        for i of groups
          groupMap[groups[i].name] = groups[i]
        done++
        if done is children.length
          groups = []
          for key of groupMap
            groups.push groupMap[key]
          callback null, groups

Group::isDescendant = isDescendant = (groupName, callback) ->
  self = this
  self.getDescendant (err, groups) ->
    return callback(err)  if err
    for i of groups
      return callback(null, true)  if groups[i].name is groupName
    callback null, false

Group::addChildGroup = addChildGroup = (name, callback) ->
  for key of @children
    return callback("already-in-this-group")  if @children[key] is name
  @children.push name
  @save callback

Group::removeChildGroup = removeChildGroup = (groupName, callback) ->
  i = 0

  while i < @children.length
    if @children[i] is groupName
      @children = @children.slice(0, i).concat(@children.slice(i + 1))
      @save callback
      return
    i++
  callback "not-in-this-group"

Group::getAllUserNames = getAllUserNames = (callback) ->
  self = this
  self.getDescendant (err, groups) ->
    return callback(err)  if err
    users = []
    groups.push self
    groups.forEach (group) ->
      users = users.concat(group.users)

    users = utils.reduce(users)
    callback null, users

Group::addAdmin = addAdmin = (userName, callback) ->
  for key of @admins
    return callback("already-in-this-group")  if @admins[key] is userName
  @admins.push userName
  @save callback

Group::removeAdmin = removeAdmin = (userName, callback) ->
  i = 0

  while i < @admins.length
    if @admins[i] is userName
      @admins = @admins.slice(0, i).concat(@admins.slice(i + 1))
      @save callback
      return
    i++
  callback "not-in-this-group"
