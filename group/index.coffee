'use continuation'
Group = require('./model')
User = require('../user/model')
messages = require('../messages')
helpers = require('../lib/helpers')

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

exports.hierarchyPage = (req, res) ->
  try
    helpers.checkAuthorized req, res, obtain()
    Group.getAllStructured obtain(groupRoot)
    res.render 'group/groups',
      locals:
        title: messages.get('groups')
        groupRoot: groupRoot
  catch err
    helpers.errorRedirect(req, res, err, '/')

exports.groupPage = (req, res, next) ->
  try
    helpers.checkAuthorized req, res, obtain()
    Group.getByName req.params.groupname, obtain(group)
    # Check if the group contains current user
    group.checkUser req.session.user.name, {direct: true}, obtain(group.containCurrentUser)
    # Check if current user is the admin of the group
    group.checkAdmin req.session.user.name, obtain(group.currentUserIsAdmin)
    # Disallow to view root group
    if group.name is 'root' and not group.currentUserIsAdmin
      throw 'permission-denied-view-root-group'
    # Get parent
    if group.parent
      Group.getByName group.parent, obtain(group.parent)
    # Get children
    Group.getByNames group.children, obtain(group.children)
    # Get admins
    User.getByNames group.admins, obtain(group.admins)
    # Get users that directly belong to this group
    User.getByNames group.users, obtain(group.users)
    res.render 'group/group',
      locals:
        title: group.title
        group: group
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.addGroupPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    res.render 'group/edit',
      locals:
        title: messages.get('add-group')
        parentGroup: group.name
        group: null
  catch err
    helpers.errorRedirect req, res, err, '/group'

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
    parentGroupPath = '/group/' + parentGroup.name + '/addgroup'
    parentGroup.addChildGroup group.name, obtain()
    req.flash 'info', 'add-group-success'
    res.redirect '/group/' + group.name
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.editGroupPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    res.render 'group/edit',
      locals:
        title: messages.get('edit-group')
        parentGroup: group.parent
        group: group
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.editGroup = (req, res, next) ->
  redirectPath = '/group'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    newParent = req.body.parent
    redirectPath = '/group/' + group.name + '/edit'
    # Change parent
    if newParent and group.parent isnt newParent
      if newParent is group.name
        throw 'can-not-set-parent-to-itself'
      originalParent = group.parent
      group.parent = newParent
      Group.getByName newParent, obtain(newParent)
      group.isDescendant newParent.name, obtain(isDescendant)
      if isDescendant
        throw 'can-not-set-parent-to-descendant'
      newParent.addChildGroup group.name, obtain()
      Group.getByName originalParent, obtain(originalParent)
      originalParent.removeChildGroup group.name, obtain()
    # Change property
    group.title = req.body.title
    group.desc = req.body.desc
    group.save obtain()
    req.flash 'info', 'edit-group-success'
    res.redirect '/group/' + group.name
  catch err
    helpers.errorRedirect req, res, err, redirectPath

exports.delGroupPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    backUrl = '/group/' + group.name
    res.render 'confirm',
      locals:
        title: messages.get('del-group')
        backUrl: backUrl
        confirm: messages.get('del-group-confirm')
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.delGroup = (req, res, next) ->
  redirectUrl = '/'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    redirectUrl = '/group/' + group.name
    group.remove obtain()
    req.flash 'info', 'del-group-success'
    res.redirect '/group/' + group.parent
  catch err
    helpers.errorRedirect req, res, err, redirectUrl

exports.allUsersPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    # Get all users belongs to the group
    group.getAllUserNames obtain(users)
    User.getByNames users, obtain(group.users)
    # Get groups that each user belongs to
    for i of group.users
      user = group.users[i] = group.users[i].toObject()
      Group.getByNames user.groups, obtain(user.groups)
    group.users.indirectList = true
    res.render 'group/allusers',
      locals:
        title: group.title
        group: group
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.addUserPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    if group.name is 'root'
      throw 'can-not-add-user-to-root-group'
    res.render 'group/adduser',
      locals:
        title: messages.get('add-user')
        group: group
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.addUser = (req, res, next) ->
  errUrl = '/group'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    errUrl = '/group/' + group.name
    if group.name is 'root'
      throw 'can-not-add-user-to-root-group'
    errUrl = '/group/' + group.name + '/adduser'
    User.getByName req.body.name, obtain(user)
    # Remove from root group if user is in root group
    if user.groups.length is 1 and user.groups[0] is 'root'
      Group.getByName 'root', obtain(rootGroup)
      rootGroup.removeUser user.name, obtain()
      user.removeFromGroup 'root', obtain()
    # Add user to group
    user.addToGroup group.name, obtain()
    group.addUser user.name, obtain()

    req.flash 'info', 'add-user-success'
    res.redirect '/group/' + group.name
  catch err
    helpers.errorRedirect req, res, err, errUrl

exports.delUserPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    User.getByName req.params.username, obtain(user)
    backUrl = '/group/' + group.name
    res.render 'confirm',
      locals:
        title: messages.get('del-user')
        backUrl: backUrl
        confirm: messages.get('del-user-confirm', user.title)
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.delUser = (req, res, next) ->
  redirectUrl = '/group'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    redirectUrl = '/group/' + group.name
    User.getByName req.params.username, obtain(user)
    # Determine if user is in root group
    if (user.groups.length is 1) and (user.groups[0] == 'root')
      fromRoot = true
    # Remove user from group
    user.removeFromGroup group.name, obtain()
    group.removeUser user.name, obtain()
    # Delete user if from root group
    if fromRoot
      user.delete obtain()
    # Add back to root
    else if user.groups.length == 0
      Group.getByName 'root', obtain(rootGroup)
      rootGroup.addUser user.name, obtain()
      user.addToGroup 'root', obtain()

    req.flash 'info', 'del-user-success'
    res.redirect redirectUrl
  catch err
    helpers.errorRedirect req, res, err, redirectUrl

exports.addAdminPage = (req, res, next) ->
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    res.render 'group/adduser',
      locals:
        title: messages.get('add-admin')
        group: group
  catch err
    helpers.errorRedirect req, res, err, '/group'

exports.addAdmin = (req, res, next) ->
  errUrl = '/group'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    errUrl = '/group/' + group.name + '/addadmin'
    User.getByName req.body.name, obtain(user)
    group.addAdmin user.name, obtain()
    req.flash 'info', 'add-admin-success'
    res.redirect '/group/' + group.name
  catch err
    helpers.errorRedirect req, res, err, errUrl

exports.delAdminPage = (req, res, next) ->
  errUrl = '/group'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    errUrl = '/group/' + group.name
    if group.name is 'root' and group.admins.length is 1
      throw 'can-not-delete-the-only-admin-from-root-group'
    User.getByName req.params.username, obtain(user)
    backUrl = '/group/' + group.name
    res.render 'confirm',
      locals:
        title: messages.get('del-admin')
        backUrl: backUrl
        confirm: messages.get('del-admin-confirm', user.title)
  catch err
    helpers.errorRedirect req, res, err, errUrl

exports.delAdmin = (req, res, next) ->
  redirectUrl = '/group'
  try
    getGroupAndCheckAdminPermission req, res, obtain(group)
    redirectUrl = '/group/' + group.name
    if group.name is 'root' and group.admins.length is 1
      throw 'can-not-delete-the-only-admin-from-root-group'
    User.getByName req.params.username, obtain(user)
    group.removeAdmin user.name, obtain()
    req.flash 'info', 'del-admin-success'
    res.redirect redirectUrl
  catch err
    helpers.errorRedirect req, res, err, redirectUrl
