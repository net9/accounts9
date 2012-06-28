$(document).ready(function() {

    if ($("#group").length) {
        $("#group ul").hide();
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
                window.location.hash = s.attr('id');
                return false;
            }
            return true;
        });
        $("#group > ul").show();
        var elem = $(window.location.hash || "#group > ul > li");
        elem.parentsUntil('#group', 'li').addClass('show').children('ul').show();
        elem.children('div.node').click();
    }
});
