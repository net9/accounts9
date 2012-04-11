Accounts9
=========
The authentication module for the new net9 system.

Installation & Running
----------------------

    git clone git://github.com/BYVoid/accounts9.git
    cd accounts9
    cp config.example.js config.js
    vim config.js
    npm install
    node app.js

Miscellaneous
-------------

What we have right now:

* User registration
* User info editing
* LDAP support
* App registration (sign up for an app token)
* OAuth 2.0
  * Access token
  * Remember authorized apps

To-do list:

Refresh token, scope support, etc.

Right now we're trying to do this with node.js (express) and mongodb.

Currently used libraries:

* express
* ejs
* mongoose
* connect-mongo
* ldapjs
