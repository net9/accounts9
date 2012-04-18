var app = require('./app');
var cluster = require('cluster');
var os = require('os');

var numCPUs = os.cpus().length;
var port = 3000;

if (process.argv.length >= 3) {
  port = parseInt(process.argv[2]);
}

if (cluster.isMaster) {
  cluster.on('death', function (worker) {
    console.log(worker);
    cluster.fork();
  });
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  app.listen(port);
}
