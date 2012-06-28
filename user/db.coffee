assert = require("assert")
ldap = require("./ldap")
config = require("../config").ldap
crypto = require("crypto")
utils = require("../lib/utils")
connect = (options, callback) ->
  if typeof options is "function"
    callback = options
    options = {}
  options.dn = options.dn or config.master_dn
  options.secret = options.secret or config.master_secret
  lconn = new ldap.Connection()
  lconn.open config.server, (->
    lconn.authenticate options.dn, options.secret, (err) ->
      unless err
        callback null, lconn
      else
        lconn.close()
        callback err
  ), (err) ->
    lconn.close()
    callback err

exports.checkUser = (username, callback) ->
  if username is ""
    callback true
    return
  connect (err, lconn) ->
    if err
      callback true
    else
      lconn.search config.user_base_dn, "(uid=" + username + ")", (err, result) ->
        lconn.close()
        callback not result or result.length isnt 0

getByName = (lconn, username, callback) ->
  lconn.search config.user_base_dn, "(uid=" + username + ")", ((err, result) ->
    lconn.close()
    if not result? or result.length is 0
      callback false, "no-such-user"
    else
      f = (field) ->
        (if result[0][field] then result[0][field] else "")

      callback true,
        name: f("uid")
        uid: f("uidNumber")
        nickname: f("displayName")
        surname: f("sn")
        givenname: f("givenName")
        fullname: f("cn")
        email: f("mail")
        mobile: f("mobile")
        website: f("labeledURI")
        address: f("registeredAddress")
        bio: f("description")
        birthdate: f("birthdate")
        nextNameChangeDate: +f("usernameNextChange")
  ), (err) ->
    lconn.close()
    callback false, err

exports.getByName = (username, callback) ->
  connect (err, lconn) ->
    if err
      callback false, err
    else
      getByName lconn, username, callback

exports.authenticate = (username, password, callback) ->
  connect
    dn: "uid=" + username + "," + config.user_base_dn
    secret: password
  , (err, lconn) ->
    if err
      callback false, err
    else
      getByName lconn, username, callback

genPassword = (rawpass) ->
  hash = crypto.createHash("sha1")
  hash.update rawpass
  hash.update "salt"
  buf = new Buffer(256)
  len = buf.write(hash.digest() + "salt", 0, "ascii")
  "{SSHA}" + buf.toString("base64", 0, len)

exports.create = (userinfo, callback) ->
  connect (err, lconn) ->
    if err
      callback false, err
    else
      lconn.search config.user_base_dn, "(objectClass=posixAccount)", (err, result) ->
        newUid = result.reduce((house, guest) ->
          uid = parseInt(guest.uidNumber)
          (if house < uid then uid else house)
        , 0) + 1
        newUid = config.min_uid + 1  if newUid <= config.min_uid
        userinfo.uidNumber = newUid
        attrs =
          uid: userinfo.name
          sn: userinfo.name
          cn: userinfo.name
          objectClass: [ "person", "top", "inetOrgPerson", "organizationalPerson", "posixAccount", "shadowAccount", "net9Person" ]
          mail: userinfo.email
          userPassword: genPassword(userinfo.password)
          gidNumber: config.default_gid
          uidNumber: userinfo.uidNumber
          homeDirectory: config.home_directory + userinfo.name

        user_dn = "uid=" + userinfo.name + "," + config.user_base_dn
        lconn.add user_dn, attrs, (err) ->
          unless err
            mods = memberUid: userinfo.uidNumber
            lconn.attr_add "cn=" + config.default_group + "," + config.group_base_dn, mods, (err) ->
              if err
                lconn.del user_dn, (err) ->
                  lconn.close()
                  assert.ifError err

                callback false, err
          else
            lconn.close()
            callback false, err

exports.update = (userinfo, callback) ->
  connect (err, lconn) ->
    if err
      callback false, err
    else
      mods =
        displayName: userinfo.nickname
        sn: userinfo.surname
        givenName: userinfo.givenname
        cn: userinfo.fullname
        mobile: userinfo.mobile
        labeledURI: userinfo.website
        registeredAddress: userinfo.address
        mail: userinfo.email
        description: userinfo.bio
        birthdate: userinfo.birthdate

      mods.userPassword = genPassword(userinfo.password)  if userinfo.password
      lconn.attr_modify "uid=" + userinfo.name + "," + config.user_base_dn, mods, (err) ->
        unless err
          getByName lconn, userinfo.name, callback
        else
          lconn.close()
          callback false, err

exports.rename = (oldname, newname, callback) ->
  connect (err, lconn) ->
    unless err
      lconn.rename "uid=" + oldname + "," + config.user_base_dn, "uid=" + newname, (err) ->
        unless err
          lconn.modify "uid=" + newname + "," + config.user_base_dn, [
            type: "usernameLastChange"
            vals: [ Date.now() ]
          ,
            type: "usernameNextChange"
            vals: [ Date.now() + 2592000000 ]
           ], (err) ->
            if err
              lconn.close()
              callback false, err
        else
          lconn.close()
          callback false, err
