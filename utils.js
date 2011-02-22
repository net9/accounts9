exports.subset = function (src, attrs) {
  var newObj = {};
  attrs.forEach(function (attr) {
    newObj[attr] = src[attr];
  });
};

