var config = require('config');
var nonosql = require('./nonosql');

var nsclient = nonosql.connect('pgsql', config.store.pg);

exports.CounterModel = nsclient.model("counters", {
    _id: nonosql.STRING,
    value: nonosql.NUMBER
});

exports.UserModel = nsclient.model("users", {
    _id: nonosql.NUMBER
});

exports.TopicModel = nsclient.model("topics", {
    _id: nonosql.NUMBER,
    node_id: nonosql.NUMBER,
    user_id: nonosql.NUMBER,
    update_user_id: {
        type: nonosql.NUMBER,
        default: 0
    }
});

exports.ReplyModel = nsclient.model("replies", {
    _id: nonosql.NUMBER,
    topic_id: nonosql.NUMBER,
    user_id: nonosql.NUMBER
});