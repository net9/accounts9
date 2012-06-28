utils = require("../utils")
mongoose = require("../lib/mongoose")
mongoose.model "OAuthCode", new mongoose.Schema(
  code:
    type: String
    index: true

  expiredate: Date
  username: String
  redirect_uri: String
  clientid: String
  scope: String
)
Code = mongoose.model("OAuthCode")
exports.getCode = (code, callback) ->
  Code.findOne
    code: code
  , (err, code) ->
    if code is null
      callback false, "no-such-code"
    else
      callback true, code.toObject()

exports.upsertCode = (codeinfo, callback) ->
  Code.findOne
    code: codeinfo.code
  , (err, code) ->
    newCode = (if code is null then new Code(codeinfo) else utils.merge(code, codeinfo))
    newCode.save (err) ->
      if err
        callback false, err
      else
        callback true, newCode.toObject()

exports.deleteCode = (code, callback) ->
  Code.remove
    code: code
  , (err) ->
    callback (if err then false else true), err

mongoose.model "AccessToken", new mongoose.Schema(
  accesstoken:
    type: String
    index: true

  expiredate: Date
  username: String
  clientid: String
  scope: String
)
AccessToken = mongoose.model("AccessToken")
exports.getAccessToken = (token, callback) ->
  AccessToken.findOne
    accesstoken: token
  , (err, token) ->
    if token is null
      callback false, "no-such-token"
    else
      callback true, token.toObject()

exports.upsertAccessToken = (tokeninfo, callback) ->
  delete tokeninfo.code

  delete tokeninfo.redirect_uri

  AccessToken.findOne
    accesstoken: tokeninfo.accesstoken
  , (err, token) ->
    newToken = (if token is null then new AccessToken(tokeninfo) else utils.merge(token, tokeninfo))
    newToken.save (err) ->
      if err
        callback false, err
      else
        callback true, newToken.toObject()
