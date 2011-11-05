// This is used to provide some settings that are not suitable for
// committing to GitHub.
//
// It's actually somewhat like a JSON file. Copy/move this file to
// ``config.js`` and fill in your own details.

module.exports = {
  ldap: {
    server: "ldap://ldap.net9.org",
    master_dn: "cn=Manager,dc=net9,dc=org",
    master_secret: "password",
    user_base_dn: "ou=People,dc=net9,dc=org",
    group_base_dn: "ou=Group,dc=net9,dc=org",
    min_uid: 2000,
    home_directory: '/home/',
    default_gid: 4000,
    default_group: 'Users',
  }
};
