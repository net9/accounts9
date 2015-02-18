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
  for key in Object.keys(src)
    dest[key] = src[key]
  dest

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
  len = buf.write(hash.digest('binary') + "salt", 0, "ascii")
  #注意这里，本哈希算法是将 rawpass 加上 “salt” 之后作 sha1 哈希，然后得到二进制的 sha1 散列数据
  #然后在这个数据的后面加上 “salt” 后进行 base64 编码。
  #****但是****实际上在写入 buf 的时候，二进制的 sha1 散列数据中的
  #不可见字符会被替换为 0x20 (即空格)
  buf.toString("base64", 0, len)

exports.parseJSON = (data, callback) ->
  try
    data = JSON.parse data
  catch err
    return callback err
  callback null, data

exports.hexStringToBuffer = (str) ->
	try
		buf = new Buffer str.replace(///\ +///g, ''), 'hex'
		buf
	catch err
		throw err.message

exports.hexStringBeautify = (str) ->
	(str.substr(x, 2) for x in [0..str.length] by 2).join(' ')

exports.jsonOrP = (req, res, next) ->
  res.jsonOrP = (obj) ->
    callbackName = req.app.get('jsonp callback name');
    if req.query[callbackName]?
      jsonOrP = res.jsonp
    else
      jsonOrP = res.json
    jsonOrP.apply res, [obj] 
  next()
