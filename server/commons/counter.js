var _ = require('underscore');
var datastore = require('../utils/datastore'),
    CounterModel = datastore.CounterModel;

exports.COUNTER_USER = 1;
exports.COUNTER_TOPIC = 2;
exports.COUNTER_REPLY = 3;

exports.addCounter = function(id, callback, count) {
    if (!count)
        count = 1;
    CounterModel.update({
        id: id
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
    CounterModel.find({}, function(err, rows) {
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