function refreshCaptcha() {
    $('#_captcha').attr('src', '/captcha');
}

$('#_captcha').click(refreshCaptcha);

$(window).load(function() {
    refreshCaptcha();
});

var lastTimestamp = Date.now();

setInterval(function() {
    if (Date.now() - lastTimestamp > 500) {
        refreshCaptcha();
    }
    lastTimestamp = Date.now();
}, 300);
