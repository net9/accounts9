/* vim: set ts=2 sw=2 nocin si: */

var oauthbase = require('./oauthbase-mongo.js'),
    crypto = require('crypto');

// The expiration timeout of access grant codes and access tokens,
// respectively, in milliseconds.
var codeTimeout = 60e3, accessTokenTimeout = 3600e3, cleanupInterval = 600e3;

var getCode = exports.getCode = function (code, callback) {
  oauthbase.getCode(code, function (success, codeOrErr) {
    if (success && codeOrErr.expiredate > new Date()) {
      callback({ success: true, codeinfo: codeOrErr });
    } else {
      callback({
        success: false,
        error: success ? 'code-has-expired' : codeOrErr
      });
    }
  });
};

var genCode = exports.generateCode = function (codeinfo, callback) {
  var code = Math.random().toString(36).slice(2, 14);
  getCode(code, function (result) {
    if (result.success) {
      // The code already exists and hasn't expired.
      // What do we do? Try a new code, of course!
      // If the stack overflows because of this, just blame it on Microsoft.
      // Don't ask me; I don't know why I hate Microsoft. Oh wait I do know.
      genCode(codeinfo, callback);
    } else {
      codeinfo.code = code;
      codeinfo.expiredate = new Date(Date.now() + codeTimeout);
      oauthbase.upsertCode(codeinfo, function (success, codeOrErr) {
        callback(success ? code : null);
      });
    }
  });
};

/* The following part for generating access tokens and refresh tokens.
 * We'll be using the same recursion technique as above.
 * Now seriously, I know it's ugly, but it's the only obvious solution.
 */

var getAccessToken = exports.getAccessToken = function (token, callback) {
  oauthbase.getAccessToken(token, function (success, tokenOrErr) {
    if (success && tokenOrErr.expiredate > new Date()) {
      callback({ success: true, tokeninfo: tokenOrErr });
    } else {
      callback({
        success: false,
        error: success ? 'access-token-has-expired' : tokenOrErr
      });
    }
  });
};

var genAccessToken = function (tokeninfo, callback) {
  var token = Math.random().toString(36).slice(2, 14);
  getAccessToken(token, function (result) {
    if (result.success) genAccessToken(tokeninfo, callback);
    else {
      tokeninfo.accesstoken = token;
      tokeninfo.expiredate = new Date(Date.now() + accessTokenTimeout);
      oauthbase.upsertAccessToken(tokeninfo, function (success, tokenOrErr) {
        if (success) callback({ success: true, accessToken: tokenOrErr });
        else callback({ success: false, error: tokenOrErr });
      });
    }
  });
};

exports.generateAccessTokenFromCode = function (codeinfo, callback) {
  // Well... if the code couldn't be invalidated, what can you do?
  // Nothing, I guess... So we just ignore it. Slick, eh?
  oauthbase.deleteCode(codeinfo.code, function () {});
  // TODO: Add refresh token support.
  genAccessToken(codeinfo, callback);
};

// TODO: Add cleanupInterval support.

