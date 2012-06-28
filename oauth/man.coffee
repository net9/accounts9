oauthbase = require("./base")
crypto = require("crypto")
codeTimeout = 60e3
accessTokenTimeout = 3600e3
cleanupInterval = 600e3
getCode = exports.getCode = (code, callback) ->
  oauthbase.getCode code, (success, codeOrErr) ->
    if success and codeOrErr.expiredate > new Date()
      callback
        success: true
        codeinfo: codeOrErr
    else
      callback
        success: false
        error: (if success then "code-has-expired" else codeOrErr)

genCode = exports.generateCode = (codeinfo, callback) ->
  code = Math.random().toString(36).slice(2, 14)
  getCode code, (result) ->
    if result.success
      genCode codeinfo, callback
    else
      codeinfo.code = code
      codeinfo.expiredate = new Date(Date.now() + codeTimeout)
      oauthbase.upsertCode codeinfo, (success, codeOrErr) ->
        callback (if success then code else null)

getAccessToken = exports.getAccessToken = (token, callback) ->
  oauthbase.getAccessToken token, (success, tokenOrErr) ->
    if success and tokenOrErr.expiredate > new Date()
      callback
        success: true
        tokeninfo: tokenOrErr
    else
      callback
        success: false
        error: (if success then "access-token-has-expired" else tokenOrErr)

genAccessToken = (tokeninfo, callback) ->
  token = Math.random().toString(36).slice(2, 14)
  getAccessToken token, (result) ->
    unless result.success
      tokeninfo.accesstoken = token
      tokeninfo.expiredate = new Date(Date.now() + accessTokenTimeout)
      oauthbase.upsertAccessToken tokeninfo, (success, tokenOrErr) ->
        if success
          callback
            success: true
            accessToken: tokenOrErr
        else
          callback
            success: false
            error: tokenOrErr

exports.generateAccessTokenFromCode = (codeinfo, callback) ->
  oauthbase.deleteCode codeinfo.code, ->

  genAccessToken codeinfo, callback
