app = require '../app'

module.exports = 'GET /': (assert) ->
  assert.response app, url: '/'
  , status: 200
    headers:
      'Content-Type': 'text/html; charset=utf-8'
  , (res) ->
    assert.includes res.body, '<title>Express</title>'
