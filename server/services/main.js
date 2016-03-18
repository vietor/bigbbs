var config = require('config');
var common = require('./common');

function getOffset(page) {
    return common.getOffset(page, config.limits.topic_pagesize);
}

exports.home = function(req, res) {
    brmx.topic_list(0, brcx.TOPIC_OTYPE_UPDATE, 0, config.limits.topic_pagesize, function(err, topics, user_map) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('topic_list_all.html', {
                topic_list: common.dumpTopicList(topics, user_map)
            });
    });
};

exports.home_recent = function(req, res) {
    var page = parseInt(req.param('page'));
    brmx.topic_list(0, brcx.TOPIC_OTYPE_CREATE, getOffset(page), config.limits.topic_pagesize, function(err, topics, user_map) {
        if (err)
            common.sendAlter(res, err);
        else
            res.render('topic_list_all_recent.html', {
                topic_list: common.dumpTopicList(topics, user_map),
                page: page,
                has_next: topics.length >= config.limits.topic_pagesize
            });
    });
};

function validateNode(req, res, callback) {
    var node_id = parseInt(req.param('id'));
    if (!node_id)
        res.redirect("/");
    else if (node_id < 0 && !(req.session && req.session.login_user && req.session.login_user.role > 0))
        common.sendAlter(res, "无访问此节点的权限");
    else {
        callback(node_id);
    }
}

exports.node = function(req, res) {
    validateNode(req, res, function(node_id) {
        brmx.topic_list(node_id, brcx.TOPIC_OTYPE_UPDATE, 0, config.limits.topic_pagesize, function(err, topics, user_map) {
            if (err)
                common.sendAlter(res, err);
            else
                res.render('topic_list_node.html', {
                    current_node: brcx.findNode(node_id),
                    topic_list: common.dumpTopicList(topics, user_map)
                });
        });
    });
};

exports.node_recent = function(req, res) {
    validateNode(req, res, function(node_id) {
        var page = parseInt(req.param('page'));
        brmx.topic_list(node_id, brcx.TOPIC_OTYPE_CREATE, getOffset(page), config.limits.topic_pagesize, function(err, topics, user_map) {
            if (err)
                common.sendAlter(res, err);
            else
                res.render('topic_list_node_recent.html', {
                    current_node: brcx.findNode(node_id),
                    topic_list: common.dumpTopicList(topics, user_map),
                    page: page,
                    has_next: topics.length >= config.limits.topic_pagesize
                });
        });
    });
};
