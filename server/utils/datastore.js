var config = require('config');
var nonosql = require('./nonosql');

var nsclient = nonosql.connect('pgsql', config.store.pg);

exports.CounterModel = nsclient.model("counters", {
    value: nonosql.NUMBER
});

exports.UserModel = nsclient.model("users", {
    id: nonosql.NUMBER
});

exports.TopicModel = nsclient.model("topics", {
    id: nonosql.NUMBER,
    node_id: nonosql.NUMBER,
    user_id: nonosql.NUMBER,
    update_user_id: {
        type: nonosql.NUMBER,
        default: 0
    }
});

exports.ReplyModel = nsclient.model("replies", {
    id: nonosql.NUMBER,
    topic_id: nonosql.NUMBER,
    user_id: nonosql.NUMBER
});
