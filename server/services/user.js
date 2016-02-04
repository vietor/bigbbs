var _ = require('underscore');
var config = require('config');
var common = require('./common');

exports.user_register = function(req, res) {
    res.render('user_register.html', {});
};

exports.user_register_action = function(req, res) {
    brmx.user_register(req.param("username"), req.param("password"), req.param("email"), function(err) {
        if (err)
            common.sendAlter(res, err);
        else
            res.redirect("/");
    });
};

exports.user_login = function(req, res) {
    res.render('user_login.html', {});
};

exports.user_login_action = function(req, res) {
    brmx.user_login(req.param("username"), req.param("password"), function(err, user) {
        if (err)
            common.sendAlter(res, err);
        else {
            req.session.login_user = {
                id: user.id,
                username: user.username
            };
            res.redirect("/");
        }
    });
};

exports.user_logout = function(req, res) {
    req.session.destroy(function() {
        res.redirect("/");
    });
};

exports.user_findpwd = function(req, res) {
    res.render('user_findpwd.html', {});
};

exports.user_findpwd_action = function(req, res) {
    brmx.user_findpwd(req.param("username"), req.param("email"), function(err) {
        if (err)
            common.sendAlter(res, err);
        else
            res.redirect("/");
    });
};

exports.user_resetpwd = function(req, res) {
    res.render('user_resetpwd.html', {
        code: req.param('code')
    });
};

exports.user_resetpwd_action = function(req, res) {
    brmx.user_resetpwd(req.param("code"), req.param("newpassword"), function(err) {
        if (err)
            common.sendAlter(res, err);
        else
            res.redirect("/");
    });
};

exports.user_show = function(req, res) {
    brmx.user_topic_list(parseInt(req.param('id')), 0, config.limits.user_show_topics, function(err, user, topics, user_map) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('user_show.html', {
                current_user: user,
                topic_list: common.dumpTopicList(topics, user_map)
            });
    });
};


exports.user_recent = function(req, res) {
    var page = parseInt(req.param('page'));
    brmx.user_topic_list(parseInt(req.param('id')), common.getOffset(page, config.limits.topic_pagesize), config.limits.topic_pagesize, function(err, user, topics, user_map) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('user_recent.html', {
                current_user: user,
                topic_list: common.dumpTopicList(topics, user_map),
                page: page,
                has_next: topics.length >= config.limits.topic_pagesize
            });
    });
};


exports.user_setting_profile = function(req, res) {
    common.login_user_detail(req, res, 'user_setting_profile.html');
};

exports.user_setting_profile_action = function(req, res) {
    brmx.user_setting_profile(req.session.login_user.id, req.param('email'), req.param('homepage', ''), req.param('signature', ''), function(err, user) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('user_setting_profile.html', {
                current_user: user
            });
    });
};

exports.user_setting_avatar = function(req, res) {
    common.login_user_detail(req, res, 'user_setting_avatar.html');
};

exports.user_setting_avatar_action = function(req, res) {
    var avatar_file = req.files.avatar_file;
    if (!avatar_file)
        common.sendAlter(res, '未上传指定文件');
    else if (avatar_file.size > 512 * 1024)
        common.sendAlter(res, '文件长度超过限制');
    else if (!_.contains(['image/jpeg', 'image/png', 'image/gif', 'image/jpg'], avatar_file.type))
        common.sendAlter(res, '不支持的文件类型');
    else
        brmx.user_setting_avatar(req.session.login_user.id, avatar_file, function(err, user) {
            if (err)
                common.sendAlter(res, err);
            else
                res.render('user_setting_avatar.html', {
                    current_user: user
                });
        });
};

exports.user_setting_password = function(req, res) {
    common.login_user_detail(req, res, 'user_setting_password.html');
};

exports.user_setting_password_action = function(req, res) {
    brmx.user_setting_password(req.session.login_user.id, req.param('password'), req.param('newpassword'), function(err, user) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('user_setting_password.html', {
                current_user: user
            });
    });
};


exports.user_active_action = function(req, res) {
    brmx.user_active(req.session.login_user.id, function(err) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('back_and_refresh.html');
    });
};
