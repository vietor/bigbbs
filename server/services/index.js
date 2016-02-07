var config = require('config');

exports.request_failure = function(req, res) {
    res.render("alter.html", {
        message: "错误的请求参数"
    });
};

exports.request_preprocess = function(req, res) {
    var logined = req.session && req.session.login_user;
    if (req.workparam.logined && !logined) {
        res.render("alter.html", {
            location: "/",
            message: "登陆用户才能操作"
        });
        return false;
    }
    if (req.workparam.unlogined && logined) {
        res.render("alter.html", {
            message: "登陆用户无法操作"
        });
        return false;
    }
    if (logined)
        res.locals.login_user = req.session.login_user;

    res.locals.csrf = req.csrfToken();
    res.locals.score = config.limits.score;
    return true;
};
