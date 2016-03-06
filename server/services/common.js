var _ = require('underscore');

function dumpUserSimple(data) {
    if (!data)
        return {};
    else
        return _.pick(data, 'id', 'username', 'avatar');
}

exports.dumpUserSimple = dumpUserSimple;

function dumpTopicDetail(data, user_map) {
    var topic = _.pick(data, 'id', 'title', 'content', 'create_date', 'reply_count', 'update_date');
    topic.creator = dumpUserSimple(user_map[data.user_id]);
    topic.node = brcx.findNode(data.node_id);
    return topic;
}

function dumpTopicList(datas, user_map) {
    return _.map(datas, function(data) {
        var topic = _.pick(data, 'id', 'title', 'create_date', 'reply_count');
        topic.creator = dumpUserSimple(user_map[data.user_id]);
        topic.node = brcx.findNode(data.node_id);
        if (data.update_user_id > 0)
            topic.update_creator = dumpUserSimple(user_map[data.update_user_id]);
        return topic;
    });
}

exports.dumpTopicList = dumpTopicList;
exports.dumpTopicDetail = dumpTopicDetail;

exports.getReqNode = function(req) {
    var node_id = parseInt(req.param('node_id', '0'));
    return brcx.findNode(node_id);
};

function sendAlter(res, err) {
    res.render('alter.html', {
        message: err.message ? err.message : err
    });
}

exports.sendAlter = sendAlter;

exports.getOffset = function(page, pagesize) {
    if (page < 2)
        return 0;
    else
        return (page - 1) * pagesize;
};


exports.login_user_detail = function(req, res, template, variables) {
    if (!variables)
        variables = {};
    brmx.user_detail(req.session.login_user.id, function(err, user) {
        if (err)
            sendAlter(res, err);
        else
            res.render(template, _.extend(variables, {
                current_user: user,
                can_active: brcx.isActiveAble(user.active_date)
            }));
    });
};