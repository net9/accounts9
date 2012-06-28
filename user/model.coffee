{
  "type": "block",
  "src": "{",
  "value": "{",
  "children": [],
  "varDecls": [],
  "labels": {
    "table": {},
    "size": 0
  },
  "functions": [],
  "nonfunctions": [],
  "transformed": true
}
User = (user) ->
  @name = user.name
  @uid = parseInt(user.uid)
  @nickname = user.nickname
  @surname = user.surname
  @givenname = user.givenname
  @fullname = user.fullname
  @email = user.email
  @mobile = user.mobile
  @website = user.website
  @address = user.address
  @bio = user.bio
  @birthdate = user.birthdate
  @groups = user.groups
  @applyingGroups = user.applyingGroups
  @authorizedApps = user.authorizedApps
  @groups
userbase = require("./db")
Group = require("../group/model")
mongoose = require("../lib/mongoose")
utils = require("../lib/utils")
assert = require("assert")
crypto = require("crypto")
module.exports = User
mongoose.model "User", new mongoose.Schema(
  name:
    type: String
    index: true
    unique: true

  groups: [ String ]
  applyingGroups: [ String ]
  authorizedApps: [ String ]
)
User.model = mongoose.model("User")
User.checkName = checkName = (username, callback) ->
  userbase.checkUser username, (occupied) ->
    if occupied
      callback "occupied"
    else
      callback null

User.getByName = getByName = (username, callback) ->
  return callback("mongodb-not-connected")  unless mongoose.connected
  userbase.getByName username, (success, userOrErr) ->
    if success
      user = new User(userOrErr)
      user._getMongodbUserAttr (err) ->
        return callback(err)  if err
        callback null, user
    else
      callback userOrErr

User.getByNames = getByNames = (usernames, callback) ->
  users = []
  returned = false
  return callback(null, users)  if usernames.length is 0
  usernames.forEach (username) ->
    return  if returned
    User.getByName username, (err, user) ->
      if err
        returned = true
        return callback(err)
      users.push user
      if users.length is usernames.length
        utils.sortBy users, "uid"
        callback null, users

User.authenticate = authenticate = (username, password, callback) ->
  userbase.authenticate username, password, (success, userOrErr) ->
    if success
      user = new User(userOrErr)
      callback null, user
    else
      callback userOrErr

User.create = create = (user, callback) ->
  return callback("fields-required")  if not user.name or not user.password or not user.email
  usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,11}$/
  return callback("invalid-username")  unless usernameRegex.exec(user.name)
  emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/
  return callback("invalid-email")  unless emailRegex.exec(user.email)
  return callback("password-mismatch")  unless user.password is user["password-repeat"]
  User.checkName user.name, (err) ->
    return callback(err)  if err
    userbase.create user, (success, userOrErr) ->
      if success
        user = new User(userOrErr)
        mongodbUser = new User.model(utils.subset(user, [ "name", "groups", "authorizedApps" ]))
        mongodbUser.save (err) ->
          return callback(err)  if err
          user.addToDefaultGroup (err) ->
            callback err, user
      else
        callback userOrErr

User::__defineGetter__ "title", ->
  if @fullname
    @fullname
  else
    @name

User::save = save = (callback) ->
  that = this
  if @password
    userbase.authenticate @name, @oldpass, (success, userOrErr) ->
      if success
        that._update callback
      else
        callback "wrong-old-pass"
  else
    @_update callback

User::_getMongodbUser = _getMongodbUser = (callback) ->
  User.model.find
    name: @name
  , (err, mongodbUser) ->
    return callback(err)  if err
    assert.equal mongodbUser.length, 1
    mongodbUser = mongodbUser[0]
    callback null, mongodbUser

User::_getMongodbUserAttr = _getMongodbUserAttr = (callback) ->
  that = this
  @_getMongodbUser (err, mongodbUser) ->
    return callback(err)  if err
    that.groups = mongodbUser.groups
    that.applyingGroups = mongodbUser.applyingGroups
    that.authorizedApps = mongodbUser.authorizedApps
    callback null

User::_update = _update = (callback) ->
  that = this
  userbase.update this, (success, userOrErr) ->
    that.password = that.oldpass = `undefined`
    if success
      that._getMongodbUser (err, mongodbUser) ->
        return callback(err)  if err
        mongodbUser.groups = that.groups
        mongodbUser.applyingGroups = that.applyingGroups
        mongodbUser.authorizedApps = that.authorizedApps
        mongodbUser.save callback
    else
      callback userOrErr

User::addToGroup = addToGroup = (groupName, callback) ->
  @groups = @groups or []
  for key of @groups
    return callback("already-in-this-group")  if @groups[key] is groupName
  @groups.push groupName
  @save callback

User::addToDefaultGroup = addToDefaultGroup = (callback) ->
  self = this
  Group.getByName "root", (err, root) ->
    unless err
      self.addToGroup root.name, (err) ->
        return callback(err)  if err
        root.addUser self.name, callback
    else if err is "no-such-group"
      Group.initialize self, (err, root, authorized) ->
        callback err
    else
      callback err

User::removeFromGroup = removeFromGroup = (groupName, callback) ->
  i = 0

  while i < @groups.length
    if @groups[i] is groupName
      @groups = @groups.slice(0, i).concat(@groups.slice(i + 1))
      @save callback
      return
    i++
  callback "not-in-this-group"

User::checkGroup = checkGroup = (groupname, options, callback) ->
  self = this
  unless callback
    callback = options
    options = {}
  if options.direct
    Group.getByName groupname, (err, group) ->
      return callback(err)  if err
      group.checkUser self.name,
        direct: true
      , callback

    return
  self.getAllGroups (err, groups) ->
    for i of groups
      return callback(null, true)  if groups[i].name is groupname
    callback null, false

User::getAllGroups = getAllGroups = (callback) ->
  self = this
  groupsMap = {}
  done = 0
  self.groups.forEach (groupname) ->
    Group.getByName groupname, (err, group) ->
      assert not err
      groupsMap[group.name] = group
      group.getAncestors (err, ancestors) ->
        assert not err
        ancestors.forEach (group) ->
          groupsMap[group.name] = group

        done++
        if done is self.groups.length
          groups = []
          for key of groupsMap
            groups.push groupsMap[key]
          callback null, groups

User::gravatar = gravatar = (size) ->
  size = 100  unless size
  hash = crypto.createHash("md5")
  hash.update @email
  hash = hash.digest("hex")
  url = "http://www.gravatar.com/avatar/" + hash + "?d=mm&r=x&s=" + size
  url

User::isAuthorized = (callback) ->
  self = this
  self.getAllGroups (err, groups) ->
    return callback(err)  if err
    for i of groups
      return callback(null, true)  if groups[i].name is "authorized"
    callback null, false
