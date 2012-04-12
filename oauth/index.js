/* vim: set ts=2 sw=2 nocin si: */

var appman = require('../app/man'),
    oauthman = require('./man'),
    userman = require('../user/man'),
    messages = require('../messages');
var util = require('util');

function process_authorize(req,res){

}

module.exports = function (app) {

  app.get('/api/authorize', function (req, res) {
    var clientid = req.query.client_id,
        redirect_uri = req.query.redirect_uri,
        state = req.query.state ? '&state=' + req.query.state : '',
        scope = req.query.scope || 'a b';
    // FIXME: Add scope support.
    if (!clientid) {
      if (redirect_uri) {
        res.redirect(redirect_uri + '?error=invalid_request' + state);
      } else {
        res.send({ error: 'invalid_request' }, 400);
      }
    } else {
      appman.getByID(clientid, function (result) {
        if (result.success) {
          // FIXME: temporarily adding /apps/:clientid. Use real list later.
          result.appinfo.redirectURIs = [
            'http://accounts.net9.org/apps/' + clientid,
            'http://localhost:3000/apps/' + clientid
          ];
          // TODO: Make sure that redirect_uri is one of what we have.
          //if (result.appinfo.redirectURIs.indexOf(redirect_uri) === -1) {
          if (false) {
            res.redirect(redirect_uri + '?error=redirect_uri_mismatch' + state);
          } else {
            // Jam the authentication info into the session as we'll need it in the later steps.
            // Note that we have to consider cases where multiple apps might be getting authenticated
            // at the same time. Thus we separate them by their client ID.
            req.session.oauthinfo = req.session.oauthinfo || {};
            req.session.oauthinfo[clientid] = {
              redirect_uri: redirect_uri,
              state: state,
              scope: scope,
              appinfo: result.appinfo
            };
            if (req.session.user) {
              appman.checkAuthorized(req.session.user.username,req.query.client_id,function(isAuthorized){
                if(isAuthorized){
                  util.debug("has authorized")
                  //simplely copy code; bad!
                  oauthman.generateCode({
                  username: req.session.user.username,
                  scope: scope,
                  redirect_uri: redirect_uri,
                  clientid: req.query.client_id
                  }, function (code) {
                    if (code === null) res.send(500);          
                    else{                      
                      res.redirect(redirect_uri + '?code=' + code + state);
                    }
                  });
                } else {
									util.debug("hasn't authorized")
                  res.render('appauth', {
                    locals: {
                      title: messages.get("authenticating", result.appinfo.name),
                      appinfo: result.appinfo,
                      scopes: scope.split(' ')
                    }
                  });
                }
              })        
              /*res.render('appauth', {
                    locals: {
                      title: messages.get("authenticating", result.appinfo.name),
                      appinfo: result.appinfo,
                      scopes: scope.split(' ')
                    }
                  });               */
            } else {
              res.redirect('/login?returnto=' + require('querystring').escape(req.url));
            }
          }
        } else {
          // Assert: result.error === 'no-such-app-clientid'
          res.redirect(redirect_uri + '?error=invalid_client' + state);
        }
      });
    }
  });

  app.post('/api/authorize', function (req, res) {
    if (!req.session.oauthinfo[req.query.client_id] || !req.session.user) res.redirect(req.url);
    else {
      var oauthinfo = req.session.oauthinfo[req.query.client_id];
      delete req.session.oauthinfo[req.query.client_id];
      if (req.body.yes) {
        // Grant code and perform accordingly.
        oauthman.generateCode({
          username: req.session.user.username,
          scope: oauthinfo.scope,
          redirect_uri: oauthinfo.redirect_uri,
          clientid: req.query.client_id
        }, function (code) {
          if (code === null) res.send(500);          
          else{
            appman.markAuthorized(req.session.user.username,req.query.client_id)
            res.redirect(oauthinfo.redirect_uri + '?code=' + code + oauthinfo.state);
          }
        });
      } else {
        console.log(require("util").inspect(req.body));
        console.log(require("util").inspect(req.param("yes")));
        res.redirect(oauthinfo.redirect_uri + '?error=access_denied' + oauthinfo.state);
      }
    }
  });

  app.all('/api/access_token', function (req, res) {
    var clientid = req.param("client_id"),
        secret = req.param("client_secret"),
        code = req.param("code");
    // TODO: Add scope support.
    // TODO: Add refresh token support.
    // First step: Make sure everything needed is provided.
    if (!clientid || !secret || !code) {
      res.send({ error: 'invalid_request' }, 400);
    } else {
      // Second step: Make sure the client ID and secret match.
      appman.authenticate({ clientid: clientid, secret: secret }, function (result) {
        if (!result.success) res.send({ error: 'invalid_client' }, 400);
        else {
          // Third step: Make sure that the client ID, redirect URI and the code match.
          oauthman.getCode(code, function (result) {
            if (!result.success || result.codeinfo.clientid !== clientid) {
              res.send({ error: 'invalid_grant' }, 400);
            } else {
              // Fourth step: Generate the access token from what we have.
              // Note that this also invalidates the code.
              oauthman.generateAccessTokenFromCode(result.codeinfo, function (result) {
                if (!result.success) res.send(500);
                else {
                  // Finally send the access token.
                  var accessToken = result.accessToken;
                  res.send({
                    access_token: accessToken.accesstoken,
                    expires_in: ~~((accessToken.expiredate - new Date()) / 1000)
                  });
                }
              });
            }
          });
        }
      });
    }
  });

  app.all('/api/*', function (req, res, next) {
    var token = req.param('access_token');
    if (token) {
      oauthman.getAccessToken(token, function (result) {
        if (result.success) {
          req.tokeninfo = result.tokeninfo;
          next();
        } else res.send({ error: 'invalid_token' }, 403);
      });
    } else res.send({ error: 'invalid_token' }, 403);
  });

  app.get('/api/userinfo', function (req, res) {
    userman.getByName(req.tokeninfo.username, function (result) {
      res.send(result);
    });
  });

};

