'use continuation'
oauth = require('oauth')
mongoose = require('../lib/mongoose')
config = require('../config')
utils = require('../lib/utils')

mongoose.model "ThirdPartyUser", new mongoose.Schema(
  uid:
    type: Number
    index: true
    unique: true
  renren:
    uid: Number
    name: String
    avatar: Object
    accessToken: String
    accessTokenExpire: Number
    refreshToken: String
)

ThirdPartyUser = module.exports = mongoose.model('ThirdPartyUser')

renren = new oauth.OAuth2(
  config.thirdparty.renren.apiKey,
  config.thirdparty.renren.secretKey,
  'https://graph.renren.com',
  '/oauth/authorize',
  '/oauth/token'
)
renren.redirectUri = config.host + '/dashboard/connect/renren/token'

ThirdPartyUser.getOrCreate = (uid, callback) ->
  try
    ThirdPartyUser.findOne {uid: uid}, obtain(user)
    if not user
      user = new ThirdPartyUser
      user.uid = uid
    callback null, user
  catch err
    callback err

ThirdPartyUser.getRenrenAuthrizeUrl = ->
  authUrl = renren.getAuthorizeUrl
    response_type: 'code'
    redirect_uri: renren.redirectUri
    #scope: ''

ThirdPartyUser.updateRenren = (user, code, callback) ->
  try
    params =
      grant_type: 'authorization_code'
      redirect_uri: renren.redirectUri
    parallel(
      renren.getOAuthAccessToken code, params, obtain(accessToken, refreshToken, data)
      ThirdPartyUser.getOrCreate user.uid, obtain(thirdpartyUser)
    )
    thirdpartyUser.renren.uid = data.user.id
    thirdpartyUser.renren.name = data.user.name
    thirdpartyUser.renren.avatar = data.user.avatar
    thirdpartyUser.renren.accessToken = accessToken
    thirdpartyUser.renren.accessTokenExpire = data.expires_in
    thirdpartyUser.renren.refreshToken = refreshToken
    thirdpartyUser.save obtain()
    callback null, thirdpartyUser
  catch err
    callback err
