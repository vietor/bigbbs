var _ = require('underscore');
var async = require('async');
var config = require('config');

function findTopicById(topic_id, callback) {
    brcx.execSQL("SELECT * FROM  topics WHERE id=$1", [
        topic_id
    ], function(err, rows) {
        if (err)
            callback(err);
        else if (rows.length < 1)
            callback(brcx.errNotFoundTopic());
        else
            callback(null, rows[0]);
    });
}

function findUserAndCheckScore(user_id, score, callback) {
    brcx.findUserById(user_id, function(err, user) {
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
            brcx.execSQL("INSERT INTO topics(user_id, node_id, title, content, create_date, update_date) VALUES($1, $2, $3, $4, $5, $5) RETURNING id", [
                user_id, node_id, title, content, brcx.getTimestamp()
            ], function(err, rows) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, rows[0].id);
            });
        },
        function(topic_id, nextcall) {
            brcx.execSQL("UPDATE users SET topic_count=topic_count+1, score=score-$2 WHERE id=$1", [
                user_id, score
            ], function(err) {
                if (err)
                    nextcall(err);
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
            var sql = "SELECT " + [
                "id", "node_id", "user_id", "title", "reply_count",
                "create_date", "update_date", "update_user_id"
            ].join(',') + " FROM  topics";
            var params = [];
            if (node_id) {
                sql += " WHERE node_id=$1";
                params.push(node_id);
            }
            sql += " ORDER BY";
            if (otype == brcx.TOPIC_OTYPE_CREATE)
                sql += " create_date";
            else
                sql += " update_date";
            sql += " DESC LIMIT " + limit + " OFFSET " + offset;
            brcx.execSQL(sql, params, function(err, rows) {
                if (err)
                    nextcall(err);
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
                        nextcall(null);
                    else
                        nextcall(null, topics, user_map);
                });
            }
        }
    ], callback);
};

exports.reply_create = function(user_id, topic_id, content, callback) {
    var timestamp = brcx.getTimestamp();
    var score = config.limits.score.reply_create;
    var score_reward = config.limits.score.reply_reward;
    async.waterfall([
        function(nextcall) {
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
            brcx.execSQL("INSERT INTO replies(topic_id, user_id, content, create_date) VALUES($1, $2, $3, $4) RETURNING id", [
                topic_id, user_id, content, timestamp
            ], function(err, rows) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic, rows[0].id);
            });
        },
        function(topic, reply_id, nextcall) {
            brcx.execSQL("UPDATE topics SET update_user_id=$1,update_date=$2,reply_count=reply_count+1 WHERE id=$3", [
                user_id, timestamp, topic_id
            ], function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, topic);
            });
        },
        function(topic, nextcall) {
            brcx.execSQL("UPDATE users SET score=score-$2 WHERE id=$1", [
                user_id, score
            ], function(err) {
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
                brcx.execSQL("UPDATE users SET score=score+$2 WHERE id=$1", [
                    topic.user_id, score_reward
                ], function(err) {
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
            var page_count = brcx.getPageCount(topic.reply_count, pagesize);
            if (page < 1 || page > page_count)
                page = page_count;
            brcx.execSQL("SELECT * FROM  replies WHERE topic_id=$1 ORDER BY create_date ASC OFFSET $2 LIMIT $3", [
                topic_id, brcx.getPageOffset(page, pagesize), pagesize
            ], function(err, rows) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, page, page_count, topic, rows);
            });
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
            var sql = "SELECT " + [
                "id", "node_id", "user_id", "title", "reply_count",
                "create_date", "update_date", "update_user_id"
            ].join(',') + " FROM  topics";
            var params = [];
            sql += " WHERE user_id=$1";
            params.push(user_id);
            sql += " ORDER BY";
            sql += " create_date";
            sql += " DESC LIMIT " + limit + " OFFSET " + offset;
            brcx.execSQL(sql, params, function(err, rows) {
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
