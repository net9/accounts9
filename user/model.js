var userbase = require('./db');

function User(user) {
  this.name = user.name;
  this.uid = parseInt(user.uid);
  this.nickname = user.nickname;
  this.surname = user.surname;
  this.givenname = user.givenname;
  this.fullname = user.fullname;
  this.email = user.email;
  this.mobile = user.mobile;
  this.website = user.website;
  this.address = user.address;
  this.bio = user.bio;
  this.birthdate = user.birthdate;
}

module.exports = User;

User.prototype._update = function _update (callback) {
  userbase.update(this, function (success, userOrErr) {
    if (success) {
      callback(null);
    } else {
      callback(userOrErr);
    }
  });
}

/*
* Save modifications
*
* callback(err)
*
*/
User.prototype.save = function save(callback) {
  var that = this;
  if (this.password) {
    userbase.authenticate(this.name, this.oldpass, function (success, userOrErr) {
      if (success) {
        that._update(callback);
      } else {
        callback('wrong-old-pass');
      }
    });
  } else {
    this._update(callback);
  }
};

User.prototype.__defineGetter__('title', function () {
  if (this.fullname) {
    return this.fullname;
  } else {
    return this.name;
  }
});

/*
* Check existance and validity of username
*
* callback(err)
*
*/
User.checkName = function checkName(username, callback) {
  userbase.checkUser(username, function (occupied) {
    if (occupied) {
      callback('occupied');
    } else {
      callback(null);
    }
  });
};

/*
* Get one user by username
*
* callback(err, user)
*
*/
User.getByName = function getByName(username, callback) {
  userbase.getByName(username, function (success, userOrErr) {
    if (success) {
      var user = new User(userOrErr);
      callback(null, user);
    } else {
      callback(userOrErr);
    }
  });
};

/*
* Authenticate and get
*
* callback(err, user)
*
*/
User.authenticate = function authenticate(username, password, callback) {
  userbase.authenticate(username, password, function (success, userOrErr) {
    if (success) {
      var user = new User(userOrErr);
      callback(null, user);
    } else {
      callback(userOrErr);
    }
  });
};

/*
* Create a new user
*
* callback(err, user)
*
*/
User.create = function create(user, callback) {
  // Validate required fields
  if (!user.password || !user.email) {
    return callback('fields-required');
  }
  
  if (user.password != user['password-repeat']) {
    return callback('password-mismatch');
  }
  
  // Now make sure that the user doesn't exist.
  User.checkName(user.name, function (err) {
    if (err) {
      return callback(err);
    }
    userbase.create(user, function (success, userOrErr) {
      if (success) {
        var user = new User(userOrErr);
        callback(null, user);
      } else {
        callback(userOrErr);
      }
    });
  });
};

