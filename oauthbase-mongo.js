/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require("mongoose").Mongoose,
    db = mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('OAuthCode', {
  properties: ['code', 'expiredate', 'username', 'redirect_uri', 'clientid', 'scope'],
  indexes:    ['code'],
  cast:       { expiredate: Date }
});
var Code = db.model('OAuthCode');

exports.getCode = function (code, callback) {
  Code.find({ code: code }).one(function (code) {
    if (code === null) callback(false, 'no-such-code');
    else callback(true, code.toObject());
  });
};

exports.upsertCode = function (codeinfo, callback) {
  Code.find({ code: codeinfo.code }).one(function (code) {
    var newCode = code === null ? new Code(codeinfo) : code.merge(codeinfo);
    newCode.save(function (err) {
      if (err) callback(false, err);
      else callback(true, newCode.toObject());
    });
  });
};

exports.deleteCode = function (code, callback) {
  Code.remove({ code: code }, function () {
    callback(true);
  });
};

mongoose.model('AccessToken', {
  properties: ['accesstoken', 'expiredate', 'username', 'clientid', 'scope'],
  indexes:    ['accesstoken'],
  cast:       { expiredate: Date }
});
var AccessToken = db.model('AccessToken');

exports.getAccessToken = function (token, callback) {
  AccessToken.find({ accesstoken: token }).one(function (token) {
    if (token === null) callback(false, 'no-such-token');
    else callback(true, token.toObject());
  });
};

exports.upsertAccessToken = function (tokeninfo, callback) {
  AccessToken.find({ accesstoken: tokeninfo.accesstoken }).one(function (token) {
    var newToken = token === null ? new AccessToken(tokeninfo) : token.merge(tokeninfo);
    newToken.save(function (err) {
      if (err) callback(false, err);
      else callback(true, newToken.toObject());
    });
  });
};

