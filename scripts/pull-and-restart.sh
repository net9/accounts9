#!/bin/bash -e

PROG_NAME=`readlink -f "$0"`
PROG_DIR=`dirname "$PROG_NAME"`
cd "$PROG_DIR/.."

git pull git9 master
supervisorctl restart accounts9

