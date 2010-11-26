(function ($, undefined) {

  $(function () {
    $("#reg-username").focus(function () { $("#reg-username-tips").stop().slideDown(); })
                      .blur (function () { $("#reg-username-tips").stop().slideUp();   });
    $("#reg-password").focus(function () { $("#reg-password-tips").stop().slideDown(); })
                      .blur (function () { $("#reg-password-tips").stop().slideUp();   });
  });

})(jQuery);
  
