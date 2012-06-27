module.exports = {
  cookieSecret: 'accounts9',
  interfaceSecret: 'Example',
  ldap: {
    server: "ldap://ldap.net9.org",
    master_dn: "cn=manager,dc=net9,dc=org",
    master_secret: "password",
    user_base_dn: "ou=people,dc=net9,dc=org",
    group_base_dn: "ou=groups,dc=net9,dc=org",
    min_uid: 10000,
    home_directory: '/home',
    default_gid: 2000,
    default_group: 'users',
  },
  db: {
    host: 'localhost',
    port: 27017,
    name: 'accounts9',
  },
  log: {
    access: 'access.log',
    error: 'error.log',
  }
};
