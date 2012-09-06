Group = require("./model")
User = require("../user/model")
messages = require("../messages")
utils = require("../lib/utils")
assert = require("assert")

getGroup = (req, res, next) ->
  Group.getByName req.params.groupname, (err, group) ->
    if err
      utils.errorRedirect req, res, err, "/"
    else
      req.group = group
      next()
checkContainCurrentUser = (req, res, next) ->
  group = req.group
  group.checkUser req.session.user.name,
    direct: true
  , (err, belongTo) ->
    if err
      utils.errorRedirect req, res, err, "/group"
    else
      group.containCurrentUser = belongTo
      next()
checkCurrentUserIsAdmin = (req, res, next) ->
  group = req.group
  group.checkAdmin req.session.user.name, (err, isAdmin) ->
    return utils.errorRedirect(req, res, err, "/group")  if err
    group.currentUserIsAdmin = isAdmin
    if group.name is "root" and not isAdmin
      err = "permission-denied-view-root-group"
      return utils.errorRedirect(req, res, err, "/group")
    next()
getParentGroup = (req, res, next) ->
  group = req.group
  if group.parent
    Group.getByName group.parent, (err, parentGroup) ->
      assert not err
      group.parent = parentGroup
      next()
  else
    next()
getChildrenGroup = (req, res, next) ->
  group = req.group
  Group.getByNames group.children, (err, children) ->
    assert not err
    group.children = children
    next()
getGroupAdmins = (req, res, next) ->
  group = req.group
  User.getByNames group.admins, (err, admins) ->
    assert not err
    group.admins = admins
    next()
getDirectUsers = (req, res, next) ->
  group = req.group
  User.getByNames group.users, (err, users) ->
    assert not err
    group.users = users
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
  group.users.forEach (user) ->
    Group.getByNames user.groups, (err, groups) ->
      assert not err
      user.groups = groups
      done++
      next()  if done is group.users.length
getUser = (req, res, next) ->
  User.getByName req.params.username, (err, user) ->
    if err
      utils.errorRedirect req, res, err, "/"
    else
      req.user = user
      next()
forbidAddUserToRootGroup = (req, res, next) ->
  if req.params.groupname is "root"
    err = "can-not-add-user-to-root-group"
    return utils.errorRedirect(req, res, err, "/group/root")
  next()
checkRootAdmin = (req, res, next) ->
  if req.group.name is "root" and req.group.admins.length is 1
    err = "can-not-delete-the-only-admin-from-root-group"
    return utils.errorRedirect(req, res, err, "/group/root")
  next()

module.exports = (app) ->
  app.get "/group", utils.checkLogin
  app.get "/group", utils.checkAuthorized
  app.get "/group", (req, res) ->
    Group.getAllStructured (err, groupRoot) ->
      return utils.errorRedirect(req, res, err, "/")  if err
      res.render "group/groups",
        locals:
          title: messages.get("groups")
          groupRoot: groupRoot

  groupPath = "/group/:groupname"
  app.get groupPath, utils.checkLogin
  app.get groupPath, utils.checkAuthorized
  app.get groupPath, getGroup
  app.get groupPath, checkContainCurrentUser
  app.get groupPath, checkCurrentUserIsAdmin
  app.get groupPath, getParentGroup
  app.get groupPath, getChildrenGroup
  app.get groupPath, getGroupAdmins
  app.get groupPath, getDirectUsers
  app.get groupPath, (req, res, next) ->
    group = req.group
    group.users.directList = true
    res.render "group/group",
      locals:
        title: group.title
        group: group

  addGroupPath = groupPath + "/addgroup"
  app.all addGroupPath, utils.checkLogin
  app.all addGroupPath, getGroup
  app.all addGroupPath, checkCurrentUserIsAdmin
  app.get addGroupPath, (req, res, next) ->
    res.render "group/edit",
      locals:
        title: messages.get("add-group")
        parentGroup: req.group.name
        group: null

  app.post addGroupPath, (req, res, next) ->
    parentGroup = req.group
    groupInfo =
      name: req.body.name
      title: req.body.title
      desc: req.body.desc
      users: []
      admins: []
      parent: parentGroup.name
      children: []

    Group.create groupInfo, (err, group) ->
      parentGroupPath = "/group/" + parentGroup.name + "/addgroup"
      return utils.errorRedirect(req, res, err, parentGroupPath)  if err
      parentGroup.addChildGroup group.name, (err) ->
        assert not err
        req.flash "info", "add-group-success"
        res.redirect "/group/" + group.name

  editGroupPath = groupPath + "/edit"
  app.all editGroupPath, utils.checkLogin
  app.all editGroupPath, getGroup
  app.all editGroupPath, checkCurrentUserIsAdmin
  app.get editGroupPath, (req, res, next) ->
    res.render "group/edit",
      locals:
        title: messages.get("edit-group")
        parentGroup: req.group.parent
        group: req.group

  app.post editGroupPath, (req, res, next) ->
    group = req.group
    newParent = req.body.parent
    groupEditPath = "/group/" + group.name + "/edit"
    if newParent and group.parent isnt newParent
      if newParent is group.name
        err = "can-not-set-parent-to-itself"
        return utils.errorRedirect(req, res, err, groupEditPath)
      originalParent = group.parent
      group.parent = newParent
      Group.getByName newParent, (err, newParent) ->
        return utils.errorRedirect(req, res, err, groupEditPath)  if err
        group.isDescendant newParent.name, (err, isDescendant) ->
          assert not err
          if isDescendant
            err = "can-not-set-parent-to-descendant"
            return utils.errorRedirect(req, res, err, groupEditPath)
          newParent.addChildGroup group.name, (err) ->
            assert not err
            Group.getByName originalParent, (err, originalParent) ->
              assert not err
              originalParent.removeChildGroup group.name, (err) ->
                assert not err
                next()
    else
      next()

  app.post editGroupPath, (req, res, next) ->
    group = req.group
    group.title = req.body.title
    group.desc = req.body.desc
    group.save (err) ->
      assert not err
      next()

  app.post editGroupPath, (req, res, next) ->
    req.flash "info", "edit-group-success"
    res.redirect "/group/" + req.group.name

  delGroupPath = groupPath + "/del"
  app.all delGroupPath, utils.checkLogin
  app.all delGroupPath, getGroup
  app.all delGroupPath, checkCurrentUserIsAdmin
  app.get delGroupPath, (req, res, next) ->
    backUrl = "/group/" + req.group.parent
    res.render "confirm",
      locals:
        title: messages.get("del-group")
        backUrl: backUrl
        confirm: messages.get("del-group-confirm")

  app.post delGroupPath, (req, res, next) ->
    group = req.group
    group.remove (err) ->
      if err
        req.flash "error", err
        res.redirect "/group/" + req.group.name
      else
        req.flash "info", "del-group-success"
        res.redirect "/group/" + req.group.parent

  allUsersPath = groupPath + "/allusers"
  app.get allUsersPath, utils.checkLogin
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
  app.all addUserPath, utils.checkLogin
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
      return utils.errorRedirect(req, res, err, errUrl)  if err
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
      return utils.errorRedirect(req, res, err, errUrl)  if err
      group.addUser user.name, (err) ->
        assert not err
        next()

  app.post addUserPath, (req, res, next) ->
    group = req.group
    req.flash "info", "add-user-success"
    res.redirect "/group/" + group.name

  delUserPath = groupPath + "/deluser/:username"
  app.all delUserPath, utils.checkLogin
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
      return utils.errorRedirect(req, res, err, "/group/" + group.name)  if err
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
  app.all addAdminPath, utils.checkLogin
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
      return utils.errorRedirect(req, res, err, errUrl)  if err
      group.addAdmin user.name, (err) ->
        return utils.errorRedirect(req, res, err, errUrl)  if err
        req.flash "info", "add-admin-success"
        res.redirect "/group/" + group.name

  delAdminPath = groupPath + "/deladmin/:username"
  app.all delAdminPath, utils.checkLogin
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
      return utils.errorRedirect(req, res, err, "/group/" + group.name)  if err
      req.flash "info", "del-admin-success"
      res.redirect "/group/" + group.name
