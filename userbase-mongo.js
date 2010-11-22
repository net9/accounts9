/* vim: set sw=2 ts=2 nocin si */

/* Legacy node-mongodb-native api, dumped for the sexier mongoose
var mongo = require("mongodb"),
    host = process.env['MONGO_NODE_DRIVER_HOST'] || 'localhost',
    port = process.env['MONGO_NODE_DRIVER_PORT'] || mongo.Connection.DEFAULT_PORT,
    db = new mongo.Db('net9-auth', new mongo.Server(host, port, {}), {});*/
var mongoose = require("mongoose").Mongoose,
    db = mongoose.connect('mongodb://localhost/net9-auth');

mongoose.model('User', {
  properties: ['username', 'password', 'bio'],
  indexes:    ['username']
});

exports.checkUser = function (name, callback) {
  var User = db.model('User');
  User.count({ username: name }, function (count) {
    callback(count !== 0);
    //User.close();
  });
  /*db.open(function () {
    db.collection('users', function (err, coll) {
      coll.findOne({ username: name }, function (err, cursor) {
        cursor.count(function (err, count) {
          callback(count !== 0);
          db.close();
        });
      });
    });
  });*/
};

exports.create = function (userinfo, callback) {
  /*db.open(function () {
    db.collection('users', function (err, coll) {
      coll.insert({
        username: userinfo.username,
        password: */
  var User = db.model('User');
  var newUser = new User({
    username: userinfo.username,
    password: userinfo.password,
    bio: userinfo.bio
  }).save();
};

