mongoose = require("../lib/mongoose")
utils = require("../lib/utils")
assert = require("assert")
crypto = require("crypto")

ValidationSchema = new mongoose.Schema(
  uid:
    type: Number
    index: true
  usage: String
  code: 
    type: String
    index: true
    unique: true
)

mongoose.model "Validation", ValidationSchema
module.exports = Validation = mongoose.model "Validation"

_gencode = () ->
  hash = crypto.createHash("sha1")
  hash.update crypto.randomBytes(32)
  hash.update "t"+(new Date().getTime())
  hash.digest('hex')

Validation.newValidationCode = (uid, usage, callback) ->
  code = _gencode()
  Validation.remove({uid: uid, usage: usage}).exec()
  item = new Validation {uid: uid, usage: usage, code: code}
  item.save (err) ->
    return callback(err) if err
    callback null, code

Validation.checkValidationCode = (code, callback) ->
  Validation.findOne code: code, (err, item) ->
    return callback(err) if err
    return callback('No Record Found') if not item
    callback null, item.usage, item.uid

Validation.removeValidationCode = (code) ->
  Validation.remove({code: code}).exec()

