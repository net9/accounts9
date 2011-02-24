// This is used to provide some settings that are not suitable for
// committing to GitHub.
//
// It's actually somewhat like a JSON file. Copy/move this file to
// ``config.js`` and fill in your own details.

module.exports = {
  ldap: {
    server: "ldap://ldap.example.org",
    master_dn: "cn=Manager,dc=example,dc=org",
    master_secret: "secret",
    user_base_dn: "ou=People,dc=example,dc=org",
    group_base_dn: "ou=Group,dc=example,dc=org"
  }
};

