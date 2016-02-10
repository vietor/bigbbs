var _ = require('underscore');
var config = require('config');
var common = require('./common');

function dumpReplyDetail(data, user_map) {
    var reply = _.pick(data, 'id', 'content', 'create_date');
    reply.creator = common.dumpUserSimple(user_map[data.user_id]);
    return reply;
}

exports.topic_create = function(req, res) {
    common.login_user_detail(req, res, 'topic_create.html', {
        node_id: parseInt(req.param('node_id'))
    });
};

exports.topic_create_action = function(req, res) {
    brmx.topic_create(req.session.login_user.id, parseInt(req.param('node_id')), req.param('title'), req.param('content'), function(err, topic_id) {
        if (err)
            common.sendAlter(res, err);
        else
            res.redirect('/t/' + topic_id);
    });
};

exports.topic_move_action = function(req, res) {
    brmx.topic_move(req.session.login_user.id, parseInt(req.param('topic_id')), parseInt(req.param('node_id')), function(err, topic_id) {
        if (err)
            common.sendAlter(res, err);
        else
            res.redirect('/t/' + topic_id);
    });
};

exports.reply_create_action = function(req, res) {
    brmx.reply_create(req.session.login_user.id, parseInt(req.param('topic_id')), req.param('content'), function(err, topic_id) {
        if (err)
            common.sendAlter(res, err);
        else
            res.redirect('/t/' + topic_id);
    });
};

exports.topic_show = function(req, res) {
    brmx.topic_show(parseInt(req.param('id')), parseInt(req.param('page')), config.limits.reply_pagesize, function(err, topic, replies, user_map, page, page_count) {
        if (err)
            common.sendAlter(res, err);
        else {
            var baseindex = brcx.getPageOffset(page, config.limits.reply_pagesize);
            res.render('topic_show.html', {
                topic: common.dumpTopicDetail(topic, user_map),
                reply_list: _.map(replies, function(row, index) {
                    return _.extend(dumpReplyDetail(row, user_map), {
                        index: baseindex + index + 1
                    });
                }),
                page: page,
                page_count: page_count
            });
        }
    });
};
