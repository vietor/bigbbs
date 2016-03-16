var config = require('config');
var bignosql = require('bignosql');

var nsclient = bignosql.connect(config.store.db.type, config.store.db[config.store.db.type]);

exports.CounterModel = nsclient.model("counters", {
    _id: bignosql.STRING,
    value: bignosql.NUMBER
});

exports.UserModel = nsclient.model("users", {
    _id: bignosql.NUMBER
});

exports.TopicModel = nsclient.model("topics", {
    _id: bignosql.NUMBER,
    node_id: bignosql.NUMBER,
    user_id: bignosql.NUMBER,
    update_user_id: {
        type: bignosql.NUMBER,
        default: 0
    },
    create_date: bignosql.NUMBER
});

exports.ReplyModel = nsclient.model("replies", {
    _id: bignosql.NUMBER,
    topic_id: bignosql.NUMBER,
    user_id: bignosql.NUMBER,
    create_date: bignosql.NUMBER
});
