var appman = require('../app/man'),
    oauthman = require('./man'),
    messages = require('../messages');
var User = require('../user/model');
var util = require('util');
var url = require('url');

module.exports = function (app) {

  app.get('/api/authorize', function (req, res) {
    var clientid = req.query.client_id,
        redirect_uri = req.query.redirect_uri,
        state = req.query.state ? '&state=' + req.query.state : '',
        scope = req.query.scope || 'a b';

    // TODO: Add scope support.
    if (!clientid) {
      // invalid request
      if (redirect_uri) {
        return res.redirect(redirect_uri + '?error=invalid_request' + state);
      } else {
        return res.send({ error: 'invalid_request' }, 400);
      }
    }
    
    appman.getByID(clientid, function (result) {
      if (!result.success) {
        // Assert: result.error === 'no-such-app-clientid'
        return res.redirect(redirect_uri + '?error=invalid_client' + state);
      }
      // FIXME: temporarily adding /apps/:clientid. Use real list later.
      
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
        appman.checkAuthorized(req.session.user.name, req.query.client_id, function (isAuthorized) {
          if (isAuthorized) {
            returnCode(req, res, scope, state, redirect_uri);
          } else {
            res.render('appauth', {
              locals: {
                title: messages.get('authenticating', result.appinfo.name),
                appinfo: result.appinfo,
                scopes: scope.split(' ')
              }
            });
          }
        });
      } else {
        res.redirect(url.format({
          pathname: '/login',
          query: {
            returnto: req.url,
          },
        }));
      }
    });
  });

  app.post('/api/authorize', function (req, res) {
    if (!req.session.oauthinfo[req.query.client_id] || !req.session.user) {
      res.redirect(req.url);
    } else {
      var oauthinfo = req.session.oauthinfo[req.query.client_id];
      delete req.session.oauthinfo[req.query.client_id];
      if (req.body.yes) {
        returnCode(req, res, oauthinfo.scope, oauthinfo.state, oauthinfo.redirect_uri, true);
      } else {
        res.redirect(oauthinfo.redirect_uri + '?error=access_denied' + oauthinfo.state);
      }
    }
  });

  app.all('/api/access_token', function (req, res) {
    var clientid = req.param('client_id'),
        secret = req.param('client_secret'),
        code = req.param('code');
    // TODO: Add scope support.
    // TODO: Add refresh token support.
    // First step: Make sure everything needed is provided.
    util.debug('acquire access token');
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
                if (!result.success) {
                  res.send(500);
                } else {
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
    User.getByName(req.tokeninfo.username, function (err, user) {
      res.send({
        err: err,
        user: user,
      });
    });
  });

};

function returnCode(req, res, scope, state, redirect_uri, mark) {
  oauthman.generateCode({
    username: req.session.user.name,
    scope: scope,
    redirect_uri: redirect_uri,
    clientid: req.query.client_id
  }, function (code) {
    if (code === null) {
      res.send(500);          
    } else {
      if (mark) {
        appman.markAuthorized(req.session.user.name, req.query.client_id);
      }                 
      res.redirect(redirect_uri + '?code=' + code + state);
    }
  });
}
