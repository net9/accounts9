(function ($, undefined) {

  var checkTips = function (id) {
    $("#" + id).focus(function () { $("#" + id + "-tips").stop().slideDown(); })
               .blur (function () { $("#" + id + "-tips").stop().slideUp();   });
  };

  $(function () {
    $.each(["reg-username", "reg-password", "appreg-name", "appreg-secret", "appreg-desc"], function (idx, val) {
      checkTips(val);
    });
  });

})(jQuery);
  
