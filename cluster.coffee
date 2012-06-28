#!/usr/bin/env coffee

app = require './app' 
cluster = require 'cluster' 
os = require 'os' 

numCPUs = os.cpus().length
port = 3000

port = parseInt(process.argv[2]) if process.argv.length >= 3
workers = {}
if cluster.isMaster
  cluster.on 'death', (worker) ->
    delete workers[worker.pid]
    worker = cluster.fork()
    workers[worker.pid] = worker

  for i in [1..numCPUs]
    worker = cluster.fork()
    workers[worker.pid] = worker
else
  app.listen port

process.on 'SIGTERM', ->
  for pid of workers
    process.kill pid
  process.exit 0
