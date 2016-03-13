var config = require('config');
var nonosql = require('./nonosql');

var nsclient = nonosql.connect('pgsql', config.store.pg);

exports.CounterModel = nsclient.model("counters");
exports.UserModel = nsclient.model("users");
exports.TopicModel = nsclient.model("topics");
exports.ReplyModel = nsclient.model("replies");