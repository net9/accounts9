ldap = require("ldapjs")
Change = ldap.Change

class exports.Connection
  client: null
  open: (server_uri, callback) ->
    @client = ldap.createClient(url: server_uri)
    callback()  if callback

  close: ->
    @client.unbind() if @client?

  authenticate: (dn, secret, callback) ->
    if @client?
      @client.bind dn, secret, callback
    else
      callback "ldap-client-not-opened"

  search: (base, filter, callback) ->
    unless @client?
      callback "ldap-client-not-opened"
      return
    @client.search base,
      filter: filter
      scope: "sub"
    , (err, result) ->
      unless err
        entries = []
        result.on "searchEntry", (entry) ->
          entries.push entry.object

        result.on "error", (err) ->
          callback err

        result.on "end", (entry) ->
          callback null, entries

  add: (dn, attrs, callback) ->
    unless @client?
      callback "ldap-client-not-opened"
      return
    @client.add dn, attrs, callback

  del: (dn, controls, callback) ->
    unless @client?
      callback "ldap-client-not-opened"
      return
    @client.del dn, controls, callback

  attr_modify: (dn, mods, callback) ->
    unless @client?
      callback "ldap-client-not-opened"
      return
    change = []
    Object.keys(mods).forEach (k) ->
      change_one =
        type: "replace"
        modification: {}

      mods[k] = []  if mods[k] is ""
      change_one.modification[k] = mods[k]
      change.push new Change(change_one)

    @client.modify dn, change, callback

  attr_add: (dn, mods, callback) ->
    unless @client?
      callback "ldap-client-not-opened"
      return
    change = []
    Object.keys(mods).forEach (k) ->
      change_one =
        type: "add"
        modification: {}

      change_one.modification[k] = mods[k]
      change.push new Change(change_one)

    @client.modify dn, change, callback

  rename: (dn, newrdn, controls, callback) ->
    unless @client?
      callback "ldap-client-not-opened"
      return
    @client.modifyDN dn, newrdn, controls, callback
  this
