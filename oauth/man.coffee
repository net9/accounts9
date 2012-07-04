oauthbase = require("./base")
crypto = require("crypto")
codeTimeout = 60e3
accessTokenTimeout = 3600e3
cleanupInterval = 600e3

getCode = exports.getCode = (code, callback) ->
  oauthbase.getCode code, (err, code) ->
    if not err and code.expiredate < new Date()
      err = "code-has-expired"
    if not err
      callback null, code
    else
      callback err

genCode = exports.generateCode = (codeinfo, callback) ->
  code = Math.random().toString(36).slice(2, 14)
  getCode code, (err) ->
    if not err
      genCode codeinfo, callback
    else
      codeinfo.code = code
      codeinfo.expiredate = new Date(Date.now() + codeTimeout)
      oauthbase.upsertCode codeinfo, (err, codeinfo) ->
        if err
          callback err
        else
          callback null, code

getAccessToken = exports.getAccessToken = (token, callback) ->
  # Find existing token into database
  oauthbase.getAccessToken token, (err, token) ->
    if not err and token.expiredate < new Date()
      err = "access-token-has-expired"
    if not err
      callback null, token
    else
      callback err

genAccessToken = exports.genAccessToken = (tokeninfo, callback) ->
  # Generate random token
  token = Math.random().toString(36).slice(2, 14)
  getAccessToken token, (err) ->
    if err
      # If token doesn't exists, insert
      tokeninfo.accesstoken = token
      tokeninfo.expiredate = new Date(Date.now() + accessTokenTimeout)
      oauthbase.upsertAccessToken tokeninfo, callback
    else
      callback null, token

exports.generateAccessTokenFromCode = (codeinfo, callback) ->
  oauthbase.deleteCode codeinfo.code, (err) ->
    return callback err if err
    genAccessToken codeinfo, callback
