var appman = require('./man');
var messages = require('../messages');

module.exports = function (app) {

  app.all('/appreg', function (req, res, next) {
    if (req.session.user) next();
    else res.redirect('/');
  });

  app.get('/appreg', function (req, res) {
    res.render('appreg', { locals: { title: messages.get('register-new-app') } });
  });

  app.post('/appreg', function (req, res) {
    appman.register(req.session.user.name, {
      name: req.body.name,
      secret: req.body.secret,
      desc: req.body.desc
    }, function (result) {
      if (result.success) {
        req.flash('info', 'new-app-success');
        res.redirect('/apps/' + result.appinfo.clientid);
      } else {
        req.flash('error', result.error);
        res.render('appreg', {
          locals: {
            title: messages.get('register-new-app'),
            appinfo: result.appinfo
          }
        });
      }
    });
  });

  app.all('/apps/:clientid/:op?', function (req, res, next) {
    appman.getByID(req.params.clientid, function (result) {
      if (result.success) {
        req.appinfo = result.appinfo;
        req.amOwner = req.session.user &&
          result.appinfo.owners.indexOf(req.session.user.name) !== -1;
        next();
      } else {
        if (result.error === 'app-not-found') res.send(404);
        else res.send(500);
      }
    });
  });

  app.get('/apps/:clientid', function (req, res) {
    res.render('apppage', {
      locals: {
        title: messages.get('app-page-title', req.appinfo.name),
        appinfo: req.appinfo,
        amOwner: req.amOwner
      }
    });
  });

  app.all('/apps/:clientid/remove', checkAppOwner);
  
  app.get('/apps/:clientid/remove', function(req, res) {
    res.render('appremoveconfirm', {
      locals: {
        title: messages.get('removing-app', req.appinfo.name),
        appinfo: req.appinfo
      }
    });
  });

  app.post('/apps/:clientid/remove', function(req, res) {
    appman.deleteByID(req.params.clientid, function(result) {
      if (result.success) {
        req.flash('info', 'app-removal-success|' + req.params.clientid);
        res.redirect('/');
      } else {
        req.flash('error', 'unknown');
        res.redirect('/apps/' + req.params.clientid);
      }
    });
  });

  app.all('/apps/:clientid/edit', checkAppOwner);

  app.get('/apps/:clientid/edit', function (req, res) {
    res.render('appedit', {
      locals: {
        title: messages.get('editing-app', req.appinfo.name),
        appinfo: req.appinfo
      }
    });
  });

  app.post('/apps/:clientid/edit', function (req, res) {
    var newInfo = {
      clientid: req.params.clientid,
      name: req.body.name,
      oldsecret: req.body.oldsecret,
      newsecret: req.body.newsecret,
      desc: req.body.desc
    };
    appman.updateInfo(newInfo, function (result) {
      if (result.success) {
        req.flash('info', 'app-editinfo-success');
        res.redirect('/apps/' + req.params.clientid);
      } else {
        req.flash('error', result.error);
        res.render('appedit', {
          locals: {
            title: messages.get('editing-app', req.appinfo.name),
            appinfo: newInfo
          }
        });
      }
    });
  });

};

function checkAppOwner(req, res, next) {
  if (!req.amOwner) {
    req.flash('error', 'unauthorized');
    res.redirect('/apps/' + req.params.clientid);
  } else {
    next();
  }
}
