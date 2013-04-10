module.exports =
  cookieSecret: "accounts9"
  interfaceSecret: "Example"
  host: "https://accounts.net9.org"
  thirdparty:
    renren:
      apiKey: '055a83decbb843b3aeef838c17e1e188'
      secretKey: '8b8dc0b760d448a7a483cc827f978cd2'
    weibo:
      appKey: '594712322'
      appSecret: 'feaf266d9140c67d0fc5424c4cb03e8e'
  db:
    host: "localhost"
    port: 27017
    name: "accounts9"
  log:
    access: "access.log"
    error: "error.log"
