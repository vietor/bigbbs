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
            res.render('home.html', {
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
            res.render('home_recent.html', {
                topic_list: common.dumpTopicList(topics, user_map),
                page: page,
                has_next: topics.length >= config.limits.topic_pagesize
            });
    });
};

exports.node = function(req, res) {
    var node_id = parseInt(req.param('id'));
    if (!node_id)
        res.redirect("/");
    else
        brmx.topic_list(node_id, brcx.TOPIC_OTYPE_UPDATE, 0, config.limits.topic_pagesize, function(err, topics, user_map) {
            if (err)
                common.sendAlter(res, err);
            else
                res.render('node.html', {
                    current_node: brcx.findNode(node_id),
                    topic_list: common.dumpTopicList(topics, user_map)
                });
        });
};

exports.node_recent = function(req, res) {
    var page = parseInt(req.param('page'));
    var node_id = parseInt(req.param('id'));
    if (!node_id)
        res.redirect("/");
    else
        brmx.topic_list(node_id, brcx.TOPIC_OTYPE_CREATE, getOffset(page), config.limits.topic_pagesize, function(err, topics, user_map) {
            if (err)
                common.sendAlter(res, err);
            else
                res.render('node_recent.html', {
                    current_node: brcx.findNode(node_id),
                    topic_list: common.dumpTopicList(topics, user_map),
                    page: page,
                    has_next: topics.length >= config.limits.topic_pagesize
                });
        });
};
