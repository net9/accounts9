var pad = function(n) {
  if (n < 10) {
    return '0' + n;
  } else {
    return n;
  }
};

var isoDate = function(d) {
  return '' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
};

$('#export').click(function(ev) {
  ev.preventDefault();
  var vcards = [];
  $('#colleague tr:gt(0)').each(function() {
    vcards.push('BEGIN:VCARD');
    vcards.push('VERSION:4.0');
    vcards.push('FN:' + this.cells[3].textContent);
    vcards.push('NICKNAME:' + this.cells[2].textContent);
    vcards.push('EMAIL:' + this.cells[4].textContent);
    vcards.push('TEL:' + this.cells[5].textContent);
    vcards.push('BDAY:' + this.cells[6].textContent);
    vcards.push('REL:' + isoDate(new Date()));
    vcards.push('END:VCARD');
  });
  this.href = 'data:text/vcard;base64,' + Base64.encode(vcards.join('\n'));
  $(this).off();
  this.click();
});

