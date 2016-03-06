var util = require('util'),
    swig = require('swig');
var config = require('config');
var nodemailer = require('nodemailer');

var FORMAT_AUTO = 0;
var FORMAT_TEXT = 1;
var FORMAT_HTML = 2;
var transporter = nodemailer.createTransport(config.mailto.server);

function sendMail(to, subject, content, format, callback) {
    if (util.isArray(to))
        to = to.join(',');
    if (typeof format == 'function') {
        callback = format;
        format = FORMAT_AUTO;
    } else {
        if (!format || [FORMAT_TEXT, FORMAT_HTML].indexOf(format) == -1)
            format = FORMAT_AUTO;
        if (!callback)
            callback = function() {};
    }
    var mailopts = {
        from: config.mailto.from,
        to: to,
        subject: subject
    };
    if (format == FORMAT_AUTO) {
        format = FORMAT_TEXT;
        if (content.length > 13) {
            var subtext = content.substr(0, 128)
                .toLowerCase()
                .replace(/ /g, '');
            if (subtext.substr(0, 5) == "<html" || subtext.substr(0, 9) == "<!doctype")
                format = FORMAT_HTML;
        }
    }
    if (format == FORMAT_TEXT)
        mailopts.text = content;
    else
        mailopts.html = content;
    transporter.sendMail(mailopts, callback);
}

var tplFindPwd = swig.compileFile(project_rootdir + '/resources/mail/findpwd.html');

exports.sendMail4FindPwd = function(to, code, callback) {
    sendMail(to, "找回密码", tplFindPwd({
        reset_code: code
    }), callback);
};