net9-auth
=========
The authentication module for the new net9 system.

What we have right now:

* User registration
* User info editing
  * TODO: what should be classified as normal info and what should go in the key-value store?
* App registration (sign up for an app token)
* OAuth 2.0
  * TODO: Refresh token, scope support, remember an app is authorized, etc.

To-do list:

* Notification system? That could be pretty useful.
* (maybe) a key-value store?
* later use LDAP for user info storage, for now use mongo

Right now we're trying to do this with node.js (express) and mongodb.
This may or may not change to Rails or web.py.

Currently used libraries: (gotta find a way to formally include this. Maybe .gitmodules?)

* express
* jade
* less (less.js)
* mongodb (node-mongodb-native)
* mongoose
* (planned) node-oauth
* (planned) node-ldap

