User = require('../user/model')
url = require('url')
assert = require('assert')
crypto = require('crypto')

exports.subset = (src, attrs) ->
  newObj = {}
  attrs.forEach (attr) ->
    newObj[attr] = src[attr]

  newObj

exports.merge = (house, guest) ->
  house.schema.eachPath (path) ->
    house.set path, guest[path]  if path isnt "_id" and (typeof guest[path] isnt "undefined")

  house

exports.mergeProps = (dest, src) ->
  for key of src
    dest[key] = src[key]

exports.mergeArray = (array1, array2) ->
  map = {}
  newArray = []
  i = 0

  while i < array1.length
    map[array1[i]] = true
    i++
  i = 0

  while i < array2.length
    map[array2[i]] = true
    i++
  for key of map
    newArray.push key
  newArray

exports.checkLogin = (req, res, next) ->
  if req.session.user
    next()
  else
    req.flash "error", "not-loged-in"
    res.redirect url.format(
      pathname: "/login"
      query:
        returnto: req.url
    )

exports.checkAuthorized = (req, res, next) ->
  if req.session.user
    User.getByName req.session.user.name, (err, user) ->
      assert not err
      user.isAuthorized (err, isAuthorized) ->
        assert not err
        if isAuthorized
          next()
        else
          req.flash "error", "not-authorized"
          res.redirect "/dashboard"

exports.errorRedirect = (req, res, err, redirect) ->
  req.flash "error", err
  res.redirect redirect

exports.reduce = (array) ->
  map = {}
  reduced = []
  i = 0

  while i < array.length
    map[array[i]] = array[i]
    i++
  for key of map
    reduced.push map[key]
  reduced

exports.reduceByName = (array) ->
  map = {}
  reduced = []
  i = 0

  while i < array.length
    map[array[i].name] = array[i]
    i++
  for key of map
    reduced.push map[key]
  reduced

exports.sortBy = (array, key) ->
  array.sort (a, b) ->
    if a[key] > b[key]
      1
    else
      -1

  array

exports.contains = (array, value) ->
  for i of array
    return true  if array[i] is value
  false

exports.genPassword = (rawpass) ->
  rawpass = "" if not rawpass?
  hash = crypto.createHash("sha1")
  hash.update rawpass
  hash.update "salt"
  buf = new Buffer(256)
  len = buf.write(hash.digest() + "salt", 0, "ascii")
  buf.toString("base64", 0, len)
