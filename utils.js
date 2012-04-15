var url = require('url');

// Creates a new subset that is a subset of the given object.
exports.subset = function (src, attrs) {
  var newObj = {};
  attrs.forEach(function (attr) {
    newObj[attr] = src[attr];
  });
  return newObj;
};

// Merges an object into a Mongoose model instance.
exports.merge = function (house, guest) {
  house.schema.eachPath(function (path) {
    // avoid overwrite the _id and undefined properties
    if (path != '_id' && (typeof guest[path] != 'undefined')) {
      house.set(path, guest[path]);
    }
  });
  return house;
};

exports.mergeProps = function (dest, src) {
  for (key in src) {
    dest[key] = src[key];
  }
};

exports.checkLogin = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash('error', 'not-loged-in');
    res.redirect(url.format({
      pathname: '/login',
      query: {
        returnto: req.url,
      },
    }));
  }
};

exports.errorRedirect = function (req, res, err, redirect) {
  req.flash('error', err);
  res.redirect(redirect);
};

exports.reduce = function (array) {
  var map = {};
  var reduced = [];
  for (var i = 0; i < array.length; i++) {
    map[array[i]] = array[i];
  }
  for (var key in map) {
    reduced.push(map[key]);
  }
  return reduced;
};

exports.reduceByName = function (array) {
  var map = {};
  var reduced = [];
  for (var i = 0; i < array.length; i++) {
    map[array[i].name] = array[i];
  }
  for (var key in map) {
    reduced.push(map[key]);
  }
  return reduced;
};

exports.sortBy = function (array, key) {
  array.sort(function (a, b) {
    if (a[key] > b[key]) {
      return 1;
    } else {
      return -1;
    }
  });
  return array;
};
