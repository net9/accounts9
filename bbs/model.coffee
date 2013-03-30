oauth = require('oauth')
async = require('async')
mongoose = require('../lib/mongoose')
config = require('../config')
utils = require('../lib/utils')

bbsServer = 'https://bbs.net9.org:8080'

bbsOAuth = new oauth.OAuth2('clientId', 'clientSec', bbsServer, '/auth/auth', '/auth/token');
bbsOAuth.setAccessTokenName 'session'

mongoose.model "BBSUser", new mongoose.Schema(
  uid:
    type: Number
    index: true
    unique: true
  accessToken: String
  accessTokenExpire: Number
  refreshToken: String
  information: Object
)

BBSUser = module.exports = mongoose.model("BBSUser")

BBSUser.getAuthorizeUrl = () ->
  bbsOAuth.getAuthorizeUrl
    response_type: 'code'
    redirect_uri: config.host + '/bbs/token'

BBSUser.getAccessToken = (code, callback) ->
  querystring = require('querystring')
  params = 
    redirect_uri: 'displaycode'
    code: code
    grant_type: 'authorization_code'
    client_id: bbsOAuth._clientId
    client_secret: bbsOAuth._clientSecret
  url = bbsOAuth._getAccessTokenUrl() + '?' + querystring.stringify params

  bbsOAuth._request 'GET', url, null, null, null, (err, data) ->
    return callback err if err
    utils.parseJSON data, (err, result) ->
      return callback err if err
      callback null, result.access_token

BBSUser.updateToken = (user, code, callback) ->
  BBSUser.getAccessToken code, (err, accessToken) ->
    return callback err if err
    bbsUser = 
      uid: user.uid
      accessToken: accessToken
      accessTokenExpire: Math.round(new Date().getTime() / 1000) + 30 * 86400
    BBSUser.update uid:user.uid, bbsUser, upsert:true, (err) ->
      callback err

BBSUser.getBBSUser = (uid, callback) ->
  BBSUser.findOne uid:uid, (err, bbsUser) ->
    callback err, bbsUser

BBSUser.getAndUpdate = (uid, callback) ->
  BBSUser.findOne uid:uid, (err, bbsUser) ->
    return callback err if err
    return callback null, null if not bbsUser

    #TODO use refresh token
    if new Date().getTime() / 1000 >= bbsUser.accessTokenExpire
      return callback null, null
    
    bbsUser.updateInformation (err) ->
      callback err, bbsUser

BBSUser::updateInformation = (callback) ->
  self = this
  async.series [
    (callback) ->
      bbsOAuth.get bbsServer + '/user/query', self.accessToken, (err, data) ->
        return callback err if err
        utils.parseJSON data, callback
  , (callback) ->
      bbsOAuth.get bbsServer + '/user/detail', self.accessToken, (err, data) ->
        return callback err if err
        utils.parseJSON data, callback
  ], (err, results) ->
    return callback err if err
    info = results[0]
    detail = results[1]
    utils.mergeProps info, detail
    self.information = info
    self.save (err) ->
      callback err
