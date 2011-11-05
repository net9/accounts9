var ldap = require("ldapjs");
var Change = ldap.Change;

exports.Connection = function() {
  var client = null;
  this.open = function(server_uri, callback){
    client = ldap.createClient({
      url: server_uri,
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
  
  this.attr_modify = function (dn, mods, callback) {
	if (client == null) {
	  callback('ldap-client-not-opened');
	  return;
	}
	
	var change = [];
	Object.keys(mods).forEach(function(k) {
	  change_one = {
	    type: 'replace',
	    modification: {}
	  };
	  if (mods[k] == '')
	    mods[k] = [];
	  change_one.modification[k] = mods[k];
	  
	  change.push(new Change(change_one));
	});
	
    client.modify(dn, change, callback);
  };

  this.attr_add = function (dn, mods, callback) {
    if (client == null) {
      callback('ldap-client-not-opened');
      return;
    }
    
    var change = [];
    Object.keys(mods).forEach(function(k) {
      change_one = {
        type: 'add',
        modification: {}
      };
      change_one.modification[k] = mods[k];
      
      change.push(new Change(change_one));
    });
    
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
