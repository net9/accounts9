/* vim: set ts=2 sw=2 nocin si: */

var appman = require('./appman'),
    messages = require('./messages');

module.exports = function (app) {

  app.get('/api/authorize', function (req, res) {
    var clientid = req.params.client_id,
        redirect_uri = req.params.redirect_uri,
        state = req.params.state ? '&state=' + req.params.state : '',
        scope = req.params.scope;
    if (!clientid) {
      if (redirect_uri) {
        res.redirect(redirect_uri + '?error=invalid_request' + state);
      } else {
        res.send({ error: 'invalid_request' });
      }
    } else {
      appman.getByID(clientid, function (result) {
        if (result.success) {
          // Make sure that redirect_uri is one of what we have.
          if (result.appinfo.redirectURIs.indexOf(redirect_uri) === -1) {
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
            if (req.session.userinfo) {
              res.render('appauth', {
                locals: {
                  title: messages.get("authenticating", result.appinfo.name),
                  appinfo: result.appinfo,
                  scopes: scope.split(' ')
                }
              });
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
    if (!req.session.oauthinfo[req.params.client_id] || !req.session.userinfo) res.redirect(req.url);
    else {
      var oauthinfo = req.session.oauthinfo[req.params.client_id];
      delete req.session.oauthinfo[req.params.client_id];
      if (req.body.yes) {
        // TODO: Grant code and perform accordingly.
        res.redirect(oauthinfo.redirect_uri + '?code=abcdefg');
      } else {
        res.redirect(oauthinfo.redirect_uri + '?error=access_denied' + oauthinfo.state);
      }
    }
  });

};

