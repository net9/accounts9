$(document).ready(function() {
    if ($("#group").length) {
        $("#group ul").hide();
        $("#group li").click(function(e) {
            if (e.target.className === 'node') {
                var s = $(this);
                if (s.children('ul').slideDown().length) {
                    s.addClass('show');
                }
            }
        });
        $("#group > ul").show().children().addClass('show').children('ul').show();
    }
});
