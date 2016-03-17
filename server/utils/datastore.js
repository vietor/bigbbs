var config = require('config');
var bignosql = require('bignosql');

var nsclient = bignosql.connect(config.store.db.type, config.store.db[config.store.db.type]);

exports.CounterModel = nsclient.model("counters", {
    _id: bignosql.String,
    value: bignosql.Number
});

exports.UserModel = nsclient.model("users", {
    _id: bignosql.Number
});

exports.TopicModel = nsclient.model("topics", {
    _id: bignosql.Number,
    node_id: bignosql.Number,
    user_id: bignosql.Number,
    update_user_id: {
        type: bignosql.Number,
        default: 0
    },
    create_date: bignosql.Number
});

exports.ReplyModel = nsclient.model("replies", {
    _id: bignosql.Number,
    topic_id: bignosql.Number,
    user_id: bignosql.Number,
    create_date: bignosql.Number
});
