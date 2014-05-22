#!/bin/bash -e
# File: add-user.sh
# Date: Mon Sep 09 16:25:21 2013 +0800
# Author: Yuxin Wu <ppwwyyxxc@gmail.com>

# A small tool to add new users at the beginning of a new semester

COOKIE="connect.sid=E8YWk96bZyDyUjlEahilhUoj.JIRNm8%2BEdwHxF%2FbPtbozHgoxY50a87PjjaHq4t30PqI"

FILE=/tmp/list
mongo --shell --quiet <<< "use accounts9;
db.users.find({groups: \"root\", \"bachelor.year\" : 2013}, {bachelor: 1, name: 1, _id: 0}).forEach(function(doc){print(doc.name + \" \" + doc.bachelor.classNumber)})" > $FILE

tail -n +3 $FILE | head -n -1 | sponge $FILE

while read uname class; do
curl -v -X POST https://accounts.net9.org/group/class2013$class/adduser -d "name=$uname" \
 --cookie "$COOKIE"  \
 --header "Origin: https://accounts.net9.org"  \
 -e "https://accounts.net9.org/group/class2013$class/adduser"
done < $FILE

#rm -rf $FILE
