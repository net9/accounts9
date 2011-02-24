net9-auth
=========
The authentication module for the new net9 system.

Installation & Running
----------------------

    git clone git://github.com/Wyverald/net9-auth.git
    cd net9-auth
    cp config.example.js config.js
    vim config.js
    node-waf configure build
    node app.js

Miscellaneous
-------------

What we have right now:

* User registration
* User info editing (see userinfo.md)
* App registration (sign up for an app token)
* OAuth 2.0
  * TODO: Refresh token, scope support, remember an app is authorized, etc.
* Partial LDAP support (authentication, search and modify)
  * TODO: ldapadd

To-do list:

* Notification system? That could be pretty useful.
* (maybe) a key-value store?

Right now we're trying to do this with node.js (express) and mongodb.
This <s>may or may not</s> will probably not change to Rails or web.py.

Currently used libraries: (gotta find a way to formally include this. Maybe .gitmodules?)

* express
* jade
* less (less.js)
* mongoose
* (planned) node-ldap

