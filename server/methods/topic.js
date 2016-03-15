var _ = require('underscore');
var async = require('async');
var config = require('config');
var datastore = require('../utils/datastore'),
    UserModel = datastore.UserModel,
    TopicModel = datastore.TopicModel,
    ReplyModel = datastore.ReplyModel;

function findTopicById(topic_id, callback) {
    TopicModel.find({
        _id: topic_id
    }, function(err, rows) {
        if (err)
            callback(brcx.errDBAccess(err));
        else if (rows.length < 1)
            callback(brcx.errNotFoundTopic());
        else
            callback(null, rows[0]);
    });
}

function findUserAndCheckScore(user_id, score, callback) {
    brcx.findUserAndCheckStatus(user_id, brcx.STATUS_NOVOICE, function(err, user) {
        if (err)
            callback(err);
        else if (user.score < score)
            callback(brcx.errScoreNotEnouth());
        else
            callback(null, user);
    });
}

function checkUserRateOfCreate(user_id, callback) {
    brcx.checkRateOfCreate('u:' + user_id, callback);
}

exports.topic_create = function(user_id, node_id, title, content, callback) {
    var score = config.limits.score.topic_create;
    async.waterfall([
        function(nextcall) {
            var node = brcx.findNode(node_id);
            if (!node)
                nextcall(brcx.errNotFoundNode());
            else
                nextcall(null);
        },
        function(nextcall) {
            checkUserRateOfCreate(user_id, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            findUserAndCheckScore(user_id, score, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            var time = brcx.getTimestamp();
            TopicModel.insert({
                user_id: user_id,
                node_id: node_id,
                title: title,
                content: content,
                create_date: time,
                update_date: time
            }, {
                id: "_id"
            }, function(err, data) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null, data._id);
            });
        },
        function(topic_id, nextcall) {
            UserModel.update({
                _id: user_id
            }, {
                $inc: {
                    topic_count: 1,
                    score: 0 - score
                }
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null, topic_id);
            });
        },
        function(topic_id, nextcall) {
            brcx.addCounter(brcx.COUNTER_TOPIC, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic_id);
            });
        }
    ], callback);
};

exports.topic_list = function(node_id, otype, offset, limit, callback) {
    async.waterfall([
        function(nextcall) {
            if (!node_id)
                nextcall(null);
            else {
                var node = brcx.findNode(node_id);
                if (!node)
                    nextcall(brcx.errNotFoundNode());
                else
                    nextcall(null);
            }
        },
        function(nextcall) {
            var match = {},
                sort = {};
            if (node_id)
                match.node_id = node_id;
            else
                match.node_id = {
                    $gt: 0
                };
            if (otype == brcx.TOPIC_OTYPE_CREATE)
                sort.create_date = -1;
            else
                sort.update_date = -1;
            TopicModel.find(match, {
                _id: 1,
                node_id: 1,
                user_id: 1,
                title: 1,
                reply_count: 1,
                create_date: 1,
                update_date: 1,
                update_user_id: 1
            }).sort(sort).skip(offset).limit(limit).exec(function(err, rows) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null, rows);
            });
        },
        function(topics, nextcall) {
            if (topics.length < 1)
                nextcall(null, topics, {});
            else {
                var user_ids = [];
                _.each(topics, function(row) {
                    user_ids.push(row.user_id);
                    if (row.update_user_id && row.update_user_id > 0) {
                        user_ids.push(row.update_user_id);
                    }
                });
                brcx.findUsersById(_.uniq(user_ids), function(err, user_map) {
                    if (err)
                        nextcall(brcx.errDBAccess(err));
                    else
                        nextcall(null, topics, user_map);
                });
            }
        }
    ], callback);
};

exports.topic_move = function(user_id, topic_id, node_id, callback) {
    async.waterfall([
        function(nextcall) {
            var node = brcx.findNode(node_id);
            if (!node)
                nextcall(brcx.errNotFoundNode());
            else
                nextcall(null);
        },
        function(nextcall) {
            findTopicById(topic_id, function(err, topic) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            if (topic.node_id == node_id)
                nextcall(null, topic_id);
            else
                TopicModel.update({
                    _id: topic_id
                }, {
                    node_id: node_id
                }, function(err) {
                    if (err)
                        nextcall(brcx.errDBAccess(err));
                    else
                        nextcall(null, topic_id);
                });
        }
    ], callback);
};

exports.reply_create = function(user_id, topic_id, content, callback) {
    var timestamp = brcx.getTimestamp();
    var score = config.limits.score.reply_create;
    var score_reward = config.limits.score.reply_reward;
    async.waterfall([
        function(nextcall) {
            if (!config.limits.active_reply)
                nextcall(brcx.errFeatureAccess());
            else
                checkUserRateOfCreate(user_id, function(err) {
                    if (err)
                        nextcall(err);
                    else
                        nextcall(null);
                });
        },
        function(nextcall) {
            findTopicById(topic_id, function(err, topic) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            findUserAndCheckScore(user_id, score, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            ReplyModel.insert({
                topic_id: topic_id,
                user_id: user_id,
                content: content,
                create_date: timestamp
            }, {
                id: "_id"
            }, function(err, data) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic, data._id);
            });
        },
        function(topic, reply_id, nextcall) {
            TopicModel.update({
                _id: topic_id
            }, {
                $set: {
                    update_user_id: user_id,
                    update_date: timestamp
                },
                $inc: {
                    reply_count: 1
                }
            }, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            UserModel.update({
                _id: user_id
            }, {
                $inc: {
                    score: 0 - score
                }
            }, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            if (user_id == topic.user_id)
                nextcall(null, topic);
            else
                UserModel.update({
                    _id: topic.user_id
                }, {
                    $inc: {
                        score: score_reward
                    }
                }, function(err) {
                    if (err)
                        nextcall(err);
                    else
                        nextcall(null, topic);
                });
        },
        function(topic, nextcall) {
            brcx.addCounter(brcx.COUNTER_REPLY, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic_id);
            });
        }
    ], callback);
};

exports.topic_show = function(topic_id, page, pagesize, callback) {
    async.waterfall([
        function(nextcall) {
            findTopicById(topic_id, function(err, topic) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            if (!config.limits.active_reply)
                nextcall(null, 0, 0, topic, []);
            else {
                var page_count = brcx.getPageCount(topic.reply_count, pagesize);
                if (page < 1 || page > page_count)
                    page = page_count;
                ReplyModel.find({
                    topic_id: topic_id
                }).sort({
                    create_date: 1
                }).skip(brcx.getPageOffset(page, pagesize)).limit(pagesize).exec(function(err, rows) {
                    if (err)
                        nextcall(err);
                    else
                        nextcall(null, page, page_count, topic, rows);
                });
            }
        },
        function(page, page_count, topic, replies, nextcall) {
            var user_ids = [topic.user_id];
            _.each(replies, function(row) {
                user_ids.push(row.user_id);
            });
            brcx.findUsersById(_.uniq(user_ids), function(err, user_map) {
                if (err)
                    nextcall(null);
                else
                    nextcall(null, topic, replies, user_map, page, page_count);
            });
        }
    ], callback);
};

exports.user_topic_list = function(user_id, offset, limit, callback) {
    async.waterfall([
        function(nextcall) {
            brcx.findUserById(user_id, function(err, user) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, user);
            });
        },
        function(user, nextcall) {
            TopicModel.find({
                user_id: user_id
            }, {
                _id: 1,
                node_id: 1,
                user_id: 1,
                title: 1,
                reply_count: 1,
                create_date: 1,
                update_date: 1,
                update_user_id: 1
            }).sort({
                create_date: -1
            }).skip(offset).limit(limit).exec(function(err, rows) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, user, rows);
            });
        },
        function(user, topics, nextcall) {
            if (topics.length < 1)
                nextcall(null, topics, {});
            else {
                var user_ids = [];
                _.each(topics, function(row) {
                    user_ids.push(row.user_id);
                    if (row.update_user_id && row.update_user_id > 0) {
                        user_ids.push(row.update_user_id);
                    }
                });
                brcx.findUsersById(_.uniq(user_ids), function(err, user_map) {
                    if (err)
                        nextcall(err);
                    else {
                        user_map[user_id] = user;
                        nextcall(null, user, topics, user_map);
                    }
                });
            }
        }
    ], callback);
};