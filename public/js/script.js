$(document).ready(function() {
    "use strict";

    if (document.getElementById("group")) {
        var lastOpened = '';
        $("#group li").click(function(e) {
            if (e.target.className === 'node') {
                var s = $(this);
                if (s.hasClass('show')) {
                    s.find('ul').slideUp();
                    s.find('li').removeClass('show');
                    s.removeClass('show');
                } else if (s.children('ul').slideDown().length) {
                    s.addClass('show');
                }
                lastOpened = s.attr('id');
                return false;
            } else if (e.target.tagName === 'A') {
                window.location.hash = lastOpened;
            }
            return true;
        });

        $("#group > ul ul").hide();
        var elem = $(window.location.hash || "#group > ul > li");
        elem.parentsUntil("#group", "li").addClass('show').children('ul').show();
        elem.children("div.node").click();
    }

});
