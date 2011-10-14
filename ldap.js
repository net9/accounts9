var ldap = require("ldapjs");

exports.Connection = function() {
  var client = null;
  
  this.open = function(server_uri, callback){
    client = ldap.createClient({
      url: server_uri
    });
    
    if (callback)
      callback();
  };
  
  this.close = function() {
	if (client != null)
	  client.unbind();
  };
  
  this.authenticate = function (dn, secret, callback) {
	if (client != null)
	  client.bind(dn, secret, callback);
	else
	  callback('ldap-client-not-opened');
  };
  
  this.search = function (base, filter, callback) {
	if (client == null) {
	  callback('ldap-client-not-opened');
	  return;
	}
    client.search(base, {filter: filter, scope: 'sub'}, function(err, result){
      if (err)
        callback(err);
      else {
        var entries = [];
        result.on('searchEntry', function(entry){
          entries.push(entry.object);
        });
        result.on('error', function(err) {
          callback(err);
        });
        result.on('end', function(entry){
          callback(null, entries);
        });
      }
    });
  };

  this.add = function (dn, attrs, callback) {
	if (client == null) {
	  callback('ldap-client-not-opened');
	  return;
	}
    client.add(dn, attrs, callback);
  };
  
  this.del = function (dn, controls, callback) {
    if (client == null) {
      callback('ldap-client-not-opened');
      return;
    }
    client.del(dn, controls, callback);
  };
  
  this.modify = function (dn, mods, callback) {
	if (client == null) {
	  callback('ldap-client-not-opened');
	  return;
	}
	change = new ldap.Change(mods);
    client.modify(dn, change, callback);
  };

  this.rename = function (dn, newrdn, controls, callback) {
    if (client == null) {
      callback('ldap-client-not-opened');
      return;
    }
    client.modifyDN(dn, newrdn, controls, callback);
  };
};
