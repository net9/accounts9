Group = require("../group/model")
mongoose = require("../lib/mongoose")
utils = require("../lib/utils")
assert = require("assert")
crypto = require("crypto")

User = (user) ->
  @name = user.name ? ''
  @password = user.password ? ''
  @uid = parseInt(user.uid) ? 0
  @nickname = user.nickname ? ''
  @surname = user.surname ? ''
  @givenname = user.givenname ? ''
  @fullname = user.fullname ? ''
  @email = user.email ? ''
  @mobile = user.mobile ? ''
  @website = user.website ? ''
  @address = user.address ? ''
  @bio = user.bio ? ''
  @birthdate = user.birthdate ? ''
  @groups = user.groups ? []
  @regtime = user.regtime ? new Date()
  @

User.attributes = ['name', 'password', 'uid', 'nickname', 'surname',
  'givenname', 'fullname', 'email', 'mobile', 'website', 'address',
  'bio', 'birthdate', 'groups', 'regtime'
]

module.exports = User

mongoose.model "User", new mongoose.Schema(
  name:
    type: String
    index: true
    unique: true
  uid: Number
  password: String
  nickname: String
  surname: String
  givenname: String
  fullname: String
  email: String
  mobile: String
  website: String
  address: String
  bio: String
  birthdate: String
  groups: [ String ]
  regtime: Date
)

User.model = mongoose.model("User")

User.sync = (callback) ->
  User.model.find {}, (err, users) ->
    console.log err if err
    users.forEach (user) ->
      User.getByName user.name, (err, user) ->
        user.password = ''
        user.save null
    callback null
    
User._getUser = (name, callback) ->
  return callback("mongodb-not-connected")  unless mongoose.connected
  User.model.find name: name, (err, users) ->
    return callback(err)  if err
    if users.length is 1
      callback null, users[0]
    else
      callback null, null

User.checkName = (name, callback) ->
  User._getUser name, (err, user) ->
    return callback(err) if err
    if user
      callback "occupied"
    else
      callback null

User.getByName = (name, callback) ->
  User._getUser name, (err, user) ->
    return callback(err) if err
    if not user
      callback 'no-such-user'
    else
      user = new User user
      callback null, user

User.getByNames = (usernames, callback) ->
  users = []
  returned = false
  return callback(null, users)  if usernames.length is 0
  usernames.forEach (username) ->
    return if returned
    User.getByName username, (err, user) ->
      if err
        returned = true
        return callback(err)
      users.push user
      if users.length is usernames.length
        utils.sortBy users, "uid"
        callback null, users

User.create = create = (user, callback) ->
  return callback("fields-required")  if not user.name or not user.password or not user.email
  return callback("password-mismatch")  unless user.password is user["password-repeat"]
  
  usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,11}$/
  return callback("invalid-username")  unless usernameRegex.exec(user.name)
  
  emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/
  return callback("invalid-email")  unless emailRegex.exec(user.email)
  
  user = utils.subset(user, User.attributes)
  user.password = utils.genPassword user.password
  
  User.checkName user.name, (err) ->
    return callback(err) if err
    user = new User(user)
    user.generateUid (err) ->
      return callback(err) if err
      user.addToDefaultGroup (err) ->
        callback err, user

User::__defineGetter__ "title", ->
  if @fullname
    @fullname
  else
    @name

User::checkPassword = (password) ->
  (@password is utils.genPassword password) or (@password is '')

User::save = (callback) ->
  self = this
  User._getUser self.name, (err, user) ->
    return callback(err)  if err
    if user
      utils.mergeProps user, utils.subset(self, User.attributes)
    else
      user = new User.model utils.subset(self, User.attributes)
    User.model::save.call user, callback

User::addToGroup = (groupName, callback) ->
  @groups = @groups or []
  for key of @groups
    if @groups[key] is groupName
      return callback("already-in-this-group")
  @groups.push groupName
  @save callback

User::addToDefaultGroup = (callback) ->
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

User::removeFromGroup = (groupName, callback) ->
  i = 0

  while i < @groups.length
    if @groups[i] is groupName
      @groups = @groups.slice(0, i).concat(@groups.slice(i + 1))
      @save callback
      return
    i++
  callback "not-in-this-group"

User::checkGroup = (groupname, options, callback) ->
  self = this
  if not callback
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

User::getAllGroups = (callback) ->
  self = this
  groupsMap = {}
  done = 0
  if self.groups.length is 0
    return callback null, []
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

User::gravatar = (size) ->
  size = 100  unless size
  hash = crypto.createHash("md5")
  hash.update @email
  hash = hash.digest("hex")
  url = "https://secure.gravatar.com/avatar/" + hash + "?d=mm&r=x&s=" + size
  url

User::isAuthorized = (callback) ->
  self = this
  self.getAllGroups (err, groups) ->
    return callback(err) if err
    for i of groups
      return callback(null, true)  if groups[i].name is "authorized"
    callback null, false

User::generateUid = (callback) ->
  self = this
  User.model.findOne().sort('uid', -1).exec (err, doc) ->
    return callback(err) if err
    if doc == null
      self.uid = 1
    else
      self.uid = doc.uid + 1
    callback null, self.uid

User::delete = (callback) ->
  assert @groups.length is 0
  return callback("mongodb-not-connected")  unless mongoose.connected
  User.model.remove name: @name, callback
