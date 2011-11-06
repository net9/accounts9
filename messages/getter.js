var en = require('./en');
var zh = require('./zh');

var priority = [zh.messages, en.messages];

// Cache the argument regexps for performance. I genuinely hope arguments number 6+ won't be used.
// If someone uses them, God help him/her split the message into smaller parts.
var args = [/\$1/g, /\$2/g, /\$3/g, /\$4/g, /\$5/g, /\$6/g];

exports.get = function (id) {
  if (!id) {
    return '';
  }
  var msg = id;
  for (key in priority) {
    var msg_t = priority[key][msg.toLowerCase()];
    if (msg_t) {
      msg = msg_t;
      break;
    }
  }
  for (var i = 1; i < arguments.length; i++) {
    msg = msg.replace(args[i - 1], arguments[i]);
  }
  return msg;
};
