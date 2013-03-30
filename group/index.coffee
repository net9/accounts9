'use continuation'
Group = require("./model")
User = require("../user/model")
messages = require("../messages")
helpers = require("../lib/helpers")
assert = require("assert")

getGroup = (req, res, next) ->
  Group.getByName req.params.groupname, (err, group) ->
    if err
      helpers.errorRedirect req, res, err, "/"
    else
      req.group = group
      next()

checkCurrentUserIsAdmin = (req, res, next) ->
  group = req.group
  group.checkAdmin req.session.user.name, (err, isAdmin) ->
    return helpers.errorRedirect(req, res, err, "/group")  if err
    group.currentUserIsAdmin = isAdmin
    if group.name is "root" and not isAdmin
      err = "permission-denied-view-root-group"
      return helpers.errorRedirect(req, res, err, "/group")
    next()

getAllUsers = (req, res, next) ->
  group = req.group
  group.getAllUserNames (err, users) ->
    assert not err
    User.getByNames users, (err, users) ->
      assert not err
      group.users = users
      next()
getAllUsersGroups = (req, res, next) ->
  group = req.group
  done = 0
  group.users.forEach (user, i) ->
    user = group.users[i] = group.users[i].toObject()
    Group.getByNames user.groups, (err, groups) ->
      assert not err
      user.groups = groups
      done++
      next()  if done is group.users.length
getUser = (req, res, next) ->
  User.getByName req.params.username, (err, user) ->
    if err
      helpers.errorRedirect req, res, err, "/"
    else
      req.user = user
      next()
forbidAddUserToRootGroup = (req, res, next) ->
  if req.params.groupname is "root"
    err = "can-not-add-user-to-root-group"
    return helpers.errorRedirect(req, res, err, "/group/root")
  next()
checkRootAdmin = (req, res, next) ->
  if req.group.name is "root" and req.group.admins.length is 1
    err = "can-not-delete-the-only-admin-from-root-group"
    return helpers.errorRedirect(req, res, err, "/group/root")
  next()

getGroupAndCheckAdminPermission = (req, res, next) ->
  try
    helpers.checkAuthorized req, res, obtain()
    Group.getByName req.params.groupname, obtain(group)
    # Check if current user is the admin of the group
    group.checkAdmin req.session.user.name, obtain(group.currentUserIsAdmin)
    if not group.currentUserIsAdmin
      next 'permission-denied'
    next null, group
  catch err
    next err

exports = {}

exports = module.exports = (app) ->
  groupPath = "/group/:groupname"

  allUsersPath = groupPath + "/allusers"
  app.get allUsersPath, helpers.checkLogin
  app.get allUsersPath, getGroup
  app.get allUsersPath, checkCurrentUserIsAdmin
  app.get allUsersPath, getAllUsers
  app.get allUsersPath, getAllUsersGroups
  app.get allUsersPath, (req, res, next) ->
    group = req.group
    group.users.indirectList = true
    res.render "group/allusers",
      locals:
        title: group.title
        group: group

  addUserPath = groupPath + "/adduser"
  app.all addUserPath, helpers.checkLogin
  app.all addUserPath, forbidAddUserToRootGroup
  app.all addUserPath, getGroup
  app.all addUserPath, checkCurrentUserIsAdmin
  app.get addUserPath, (req, res, next) ->
    res.render "group/adduser",
      locals:
        title: messages.get("add-user")
        group: req.group

  app.post addUserPath, (req, res, next) ->
    group = req.group
    User.getByName req.body.name, (err, user) ->
      errUrl = "/group/" + group.name + "/adduser"
      return helpers.errorRedirect(req, res, err, errUrl)  if err
      req.user = user
      next()

  app.post addUserPath, (req, res, next) ->
    user = req.user
    if user.groups.length is 1 and user.groups[0] is "root"
      Group.getByName "root", (err, rootGroup) ->
        assert not err
        rootGroup.removeUser user.name, (err) ->
          assert not err
          user.removeFromGroup "root", (err) ->
            assert not err
            next()
    else
      next()

  app.post addUserPath, (req, res, next) ->
    user = req.user
    group = req.group
    user.addToGroup group.name, (err) ->
      return helpers.errorRedirect(req, res, err, errUrl)  if err
      group.addUser user.name, (err) ->
        assert not err
        next()

  app.post addUserPath, (req, res, next) ->
    group = req.group
    req.flash "info", "add-user-success"
    res.redirect "/group/" + group.name

  delUserPath = groupPath + "/deluser/:username"
  app.all delUserPath, helpers.checkLogin
  app.all delUserPath, getGroup
  app.all delUserPath, checkCurrentUserIsAdmin
  app.all delUserPath, getUser
  app.get delUserPath, (req, res, next) ->
    backUrl = "/group/" + req.group.name
    res.render "confirm",
      locals:
        title: messages.get("del-user")
        backUrl: backUrl
        confirm: messages.get("del-user-confirm", req.user.title)

  app.post delUserPath, (req, res, next) ->
    group = req.group
    user = req.user
    if (user.groups.length is 1) and (user.groups[0] == 'root')
      req.fromRoot = true
    
    user.removeFromGroup group.name, (err) ->
      return helpers.errorRedirect(req, res, err, "/group/" + group.name)  if err
      group.removeUser user.name, (err) ->
        assert not err
        next()

  app.post delUserPath, (req, res, next) ->
    user = req.user
    return next() if user.groups.length > 0
    
    # Delete user
    if req.fromRoot
      return user.delete next
    
    # Add back to root
    Group.getByName "root", (err, rootGroup) ->
      assert not err
      rootGroup.addUser user.name, (err) ->
        assert not err
        user.addToGroup "root", (err) ->
          assert not err
          next()

  app.post delUserPath, (req, res, next) ->
    group = req.group
    req.flash "info", "del-user-success"
    res.redirect "/group/" + group.name

  addAdminPath = groupPath + "/addadmin"
  app.all addAdminPath, helpers.checkLogin
  app.all addAdminPath, getGroup
  app.all addAdminPath, checkCurrentUserIsAdmin
  app.get addAdminPath, (req, res, next) ->
    res.render "group/adduser",
      locals:
        title: messages.get("add-admin")
        group: req.group

  app.post addAdminPath, (req, res, next) ->
    group = req.group
    User.getByName req.body.name, (err, user) ->
      errUrl = "/group/" + group.name + "/addadmin"
      return helpers.errorRedirect(req, res, err, errUrl)  if err
      group.addAdmin user.name, (err) ->
        return helpers.errorRedirect(req, res, err, errUrl)  if err
        req.flash "info", "add-admin-success"
        res.redirect "/group/" + group.name

  delAdminPath = groupPath + "/deladmin/:username"
  app.all delAdminPath, helpers.checkLogin
  app.all delAdminPath, getGroup
  app.all delAdminPath, checkCurrentUserIsAdmin
  app.all delAdminPath, checkRootAdmin
  app.all delAdminPath, getUser
  app.get delAdminPath, (req, res, next) ->
    backUrl = "/group/" + req.group.name
    res.render "confirm",
      locals:
        title: messages.get("del-admin")
        backUrl: backUrl
        confirm: messages.get("del-admin-confirm", req.user.title)

  app.post delAdminPath, (req, res, next) ->
    group = req.group
    user = req.user
    group.removeAdmin user.name, (err) ->
      return helpers.errorRedirect(req, res, err, "/group/" + group.name)  if err
      req.flash "info", "del-admin-success"
      res.redirect "/group/" + group.name

exports.hierarchyPage = (req, res) ->
  try
    helpers.checkAuthorized req, res, obtain()
    Group.getAllStructured obtain(groupRoot)
    res.render "group/groups",
      locals:
        title: messages.get("groups")
        groupRoot: groupRoot
  catch err
    helpers.errorRedirect(req, res, err, "/")

exports.groupPage = (req, res, next) ->
  try
    helpers.checkAuthorized req, res, obtain()
    Group.getByName req.params.groupname, obtain(group)
    # Check if the group contains current user
    group.checkUser req.session.user.name, {direct: true}, obtain(group.containCurrentUser)
    # Check if current user is the admin of the group
    group.checkAdmin req.session.user.name, obtain(group.currentUserIsAdmin)
    # Disallow to view root group
    if group.name is "root" and not group.currentUserIsAdmin
      throw "permission-denied-view-root-group"
    # Get parent
    if group.parent
      Group.getByName group.parent, obtain(group.parent)
    # Get children
    Group.getByNames group.children, obtain(group.children)
    # Get admins
    User.getByNames group.admins, obtain(group.admins)
    # Get users that directly belong to this group
    User.getByNames group.users, obtain(group.users)
    res.render "group/group",
      locals:
        title: group.title
        group: group
  catch err
    helpers.errorRedirect req, res, err, "/group"

exports.addGroupPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    res.render "group/edit",
      locals:
        title: messages.get("add-group")
        parentGroup: group.name
        group: null
  catch err
    helpers.errorRedirect req, res, err, "/"

exports.addGroup = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(parentGroup)
    groupInfo =
      name: req.body.name
      title: req.body.title
      desc: req.body.desc
      users: []
      admins: []
      parent: parentGroup.name
      children: []
    Group.create groupInfo, obtain(group)
    parentGroupPath = "/group/" + parentGroup.name + "/addgroup"
    parentGroup.addChildGroup group.name, obtain()
    req.flash "info", "add-group-success"
    res.redirect "/group/" + group.name
  catch err
    helpers.errorRedirect req, res, err, "/"

exports.editGroupPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    res.render "group/edit",
      locals:
        title: messages.get("add-group")
        parentGroup: group.parent
        group: group
  catch err
    helpers.errorRedirect req, res, err, "/"

exports.editGroup = (req, res, next) ->
  redirectPath = '/'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    newParent = req.body.parent
    redirectPath = '/group/' + group.name + '/edit'
    # Change parent
    if newParent and group.parent isnt newParent
      if newParent is group.name
        throw "can-not-set-parent-to-itself"
      originalParent = group.parent
      group.parent = newParent
      Group.getByName newParent, obtain(newParent)
      group.isDescendant newParent.name, obtain(isDescendant)
      if isDescendant
        throw "can-not-set-parent-to-descendant"
      newParent.addChildGroup group.name, obtain()
      Group.getByName originalParent, obtain(originalParent)
      originalParent.removeChildGroup group.name, obtain()
    # Change property
    group.title = req.body.title
    group.desc = req.body.desc
    group.save obtain()
    req.flash "info", "edit-group-success"
    res.redirect "/group/" + group.name
  catch err
    helpers.errorRedirect req, res, err, redirectPath

exports.delGroupPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    backUrl = "/group/" + group.name
    res.render "confirm",
      locals:
        title: messages.get("del-group")
        backUrl: backUrl
        confirm: messages.get("del-group-confirm")
  catch err
    helpers.errorRedirect req, res, err, "/"

exports.delGroup = (req, res, next) ->
  redirectUrl = "/"
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    redirectUrl = "/group/" + group.name
    group.remove obtain()
    req.flash "info", "del-group-success"
    res.redirect "/group/" + group.parent
  catch err
    helpers.errorRedirect req, res, err, redirectUrl
