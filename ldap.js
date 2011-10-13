var ldap = require("ldapjs");

exports.Connection = function() {
  
  var client;
  var self = this;
  
  this.open = function(server_uri, callback){
    client = ldap.createClient({
      url: server_uri
    });
    
    if (callback)
      callback();
  }
  
  this.close = function() {
    client.unbind();
  }
  
  this.authenticate = function (dn, secret, callback) {
    client.bind(dn, secret, callback);
  };
  
  this.search = function(base, filter, callback) {
    client.search(base, {filter: filter, scope: 'sub'}, function(err, result){
      if (err)
        callback(err);
      else {
        result.on('searchEntry', function(entry){
          callback(null, entry.object);
        });
      }
    });
  }

  self.modify = function (dn, mods, callback) {
    requestcount++;

    var r = new Request(callback, null);
    var msgid = r.doAction(function () {
      return binding.modify(dn, mods);
    });
    requests[msgid] = r;
  };

  self.rename = function (dn, newrdn, callback) {
    requestcount++;

    var r = new Request(callback, null);
    var msgid = r.doAction(function () {
      return binding.rename(dn, newrdn, "", true);
    });
    requests[msgid] = r;
  };

  self.add = function (dn, attrs, callback) {
    requestcount++;

    var r = new Request(callback, null);
    var msgid = r.doAction(function () {
      return binding.add(dn, attrs);
    });
    requests[msgid] = r;
  };


  self.searchAuthenticate = function(base, filter, password, CB) {
      self.search(base, filter, "", function(res) {
          // TODO: see if there's only one result, and exit if not
          if (res.length != 1) {
              CB(0);
          } else {
              // we have the result. Use the DN to auth.
              self.authenticate(res[0].dn, password, function(success, dn) {
                  CB(success, res[0].dn);
              });
          }
      });
  }

}
