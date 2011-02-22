(function ($, undefined) {

  var checkTips = function (id) {
    $("#" + id).focus(function () { $("#" + id + "-tips").stop().slideDown(); })
               .blur (function () { $("#" + id + "-tips").stop().slideUp();   });
  };

  $(function () {

    // Check tips for forms
    $(".form-table .tip").each(function () {
      if (this.id.slice(-5) === "-tips") {
        checkTips(this.id.slice(0, -5));
      }
    });

    // "Full name" check
    $("#editinfo-fullname").each(function () {
      var optSurGiven = $("#ei-fn-surgiven")
        , optSur_Given = $("#ei-fn-sur-given")
        , optGiven_Sur = $("#ei-fn-given-sur")
        , $surname = $("#editinfo-surname")
        , $givenname = $("#editinfo-givenname")
        , surname = $surname.val()
        , givenname = $givenname.val()
        ;

      setInterval(function () {

        if ($surname.val() !== surname || $givenname.val() !== givenname) {
          surname = $surname.val();
          givenname = $givenname.val();

          optSurGiven.text(surname + givenname);
          optSur_Given.text(surname + " " + givenname);
          optGiven_Sur.text(givenname + " " + surname);
        }

      }, 500);
    });

  });

})(jQuery);
  
