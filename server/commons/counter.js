var _ = require('underscore');
var datastore = require('../utils/datastore'),
    CounterModel = datastore.CounterModel;

var COUNTER_USER = "users",
    COUNTER_TOPIC = "topics",
    COUNTER_REPLY = "replies";

exports.COUNTER_USER = COUNTER_USER;
exports.COUNTER_TOPIC = COUNTER_TOPIC;
exports.COUNTER_REPLY = COUNTER_REPLY;

exports.addCounter = function(id, callback, count) {
    if (!count)
        count = 1;
    CounterModel.update({
        _id: id
    }, {
        $inc: {
            value: count
        }
    }, function(err) {
        if (err)
            callback(brcx.errDBAccess(err));
        else
            callback(null);
    });
};

exports.readCounters = function(callback) {
    CounterModel.find({
        _id: {
            $in: [COUNTER_USER, COUNTER_TOPIC, COUNTER_REPLY]
        }
    }, function(err, rows) {
        if (err)
            callback(brcx.errDBAccess(err));
        else {
            var counters = {};
            _.each(rows, function(row) {
                counters[row.id] = row.value;
            });
            callback(null, counters);
        }
    });
};