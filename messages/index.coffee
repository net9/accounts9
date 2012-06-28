en = require './en' 
zh = require './zh' 
util = require 'util' 

priority = [zh.messages, en.messages]

# Cache the argument regexps for performance. I genuinely hope arguments number 6+ won't be used.
# If someone uses them, God help him/her split the message into smaller parts.
args = [ /\$1/g, /\$2/g, /\$3/g, /\$4/g, /\$5/g, /\$6/g ]

exports.get = (id) ->
  return '' unless id
  id = [id] unless util.isArray(id)
  msgs = []
  for i of id
    msg = id[i]
    for key, val of priority
      msg_t = val[msg.toLowerCase()]
      if msg_t
        msg = msg_t
        break
    for j in [1...arguments.length]
      msg = msg.replace args[j - 1], arguments[j]
    msgs.push msg
  msgs
