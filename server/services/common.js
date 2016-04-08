var _ = require('underscore');

function dumpUserSimple(data) {
    if (!data)
        return {};
    else
        return {
            id: data._id,
            username: data.username,
            avatar: data.avatar
        };
}

exports.dumpUserSimple = dumpUserSimple;

function dumpTopicDetail(data, user_map) {
    return {
        id: data._id,
        title: data.title,
        content: data.content,
        create_date: data.create_date,
        reply_count: data.reply_count,
        update_date: data.update_date,
        creator: dumpUserSimple(user_map[data.user_id]),
        node: brcx.findNode(data.node_id)
    };
}

function dumpTopicList(datas, user_map) {
    return _.map(datas, function(data) {
        var topic = {
            id: data._id,
            title: data.title,
            create_date: data.create_date,
            reply_count: data.reply_count,
            creator: dumpUserSimple(user_map[data.user_id]),
            node: brcx.findNode(data.node_id)
        };
        if (data.update_user_id > 0)
            topic.update_creator = dumpUserSimple(user_map[data.update_user_id]);
        return topic;
    });
}

exports.dumpTopicList = dumpTopicList;
exports.dumpTopicDetail = dumpTopicDetail;

exports.dumpUserDetail = function(data) {
    return _.extend(data, {
        id: data._id,
    });
};

exports.getReqNode = function(req) {
    var node_id = parseInt(req.param('node_id', '0'));
    return brcx.findNode(node_id);
};

function sendAlter(res, err, location) {
    var objs = {
        message: err.message ? err.message : err
    };
    if (location)
        objs.location = location;
    res.render('alter.html', objs);
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