/* vim: set sw=2 ts=2 nocin si: */

var mongoose = require("mongoose");

mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('OAuthCode', new mongoose.Schema({
  code:         { type: String, index: true },
  expiredate:   Date,
  username:     String,
  redirect_uri: String,
  clientid:     String,
  scope:        String
}));
var Code = mongoose.model('OAuthCode');

exports.getCode = function (code, callback) {
  Code.findOne({ code: code }, function (err, code) {
    if (code === null) callback(false, 'no-such-code');
    else callback(true, code.toObject());
  });
};

exports.upsertCode = function (codeinfo, callback) {
  Code.findOne({ code: codeinfo.code }, function (err, code) {
    var newCode = code === null ? new Code(codeinfo) : code.merge(codeinfo);
    newCode.save(function (err) {
      if (err) callback(false, err);
      else callback(true, newCode.toObject());
    });
  });
};

exports.deleteCode = function (code, callback) {
  Code.remove({ code: code }, function (err) {
    callback(err ? false : true, err);
  });
};

mongoose.model('AccessToken', new mongoose.Schema({
  accesstoken:  { type: String, index: true },
  expiredate:   Date,
  username:     String,
  clientid:     String,
  scope:        String
}));
var AccessToken = mongoose.model('AccessToken');

exports.getAccessToken = function (token, callback) {
  AccessToken.findOne({ accesstoken: token }, function (err, token) {
    if (token === null) callback(false, 'no-such-token');
    else callback(true, token.toObject());
  });
};

exports.upsertAccessToken = function (tokeninfo, callback) {
  AccessToken.findOne({ accesstoken: tokeninfo.accesstoken }, function (err, token) {
    var newToken = token === null ? new AccessToken(tokeninfo) : token.merge(tokeninfo);
    newToken.save(function (err) {
      if (err) callback(false, err);
      else callback(true, newToken.toObject());
    });
  });
};

