#!/bin/bash
app=$(dirname $(readlink -f "$0"))/../app.coffee
export NODE_ENV=production
exec continuation $app -e -c /srv/accounts/tmp/continuation

