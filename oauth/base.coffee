utils = require("../lib/utils")
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
  Code.findOne code: code , (err, code) ->
    if code is null
      callback "no-such-code"
    else
      callback null, code.toObject()

exports.upsertCode = (codeinfo, callback) ->
  Code.findOne code: codeinfo.code, (err, code) ->
    newCode = (if code is null then new Code(codeinfo) else utils.merge(code, codeinfo))
    newCode.save (err) ->
      if err
        callback err
      else
        callback null, newCode.toObject()

exports.deleteCode = (code, callback) ->
  Code.remove code: code, (err) ->
    callback err

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
  AccessToken.findOne accesstoken: token, (err, token) ->
    if token is null
      callback "no-such-token"
    else
      callback null, token.toObject()

exports.upsertAccessToken = (tokeninfo, callback) ->
  delete tokeninfo.code
  delete tokeninfo.redirect_uri

  AccessToken.findOne accesstoken: tokeninfo.accesstoken , (err, token) ->
    newToken = (if token is null then new AccessToken(tokeninfo) else utils.merge(token, tokeninfo))
    newToken.save (err) ->
      if err
        callback err
      else
        callback null, newToken.toObject()
