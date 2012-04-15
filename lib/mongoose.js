var config = require('../config');
var mongoose = require('mongoose');

mongoose.connected = false;
mongoose.connection.on('open', function() {
  mongoose.connected = true;
});
mongoose.connect('mongodb://' + config.db.host + ':' + config.db.port + '/' + config.db.name);
module.exports = mongoose;
