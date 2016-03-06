var pg = require('pg');
var config = require('config');
var _ = require('underscore');

exports.COUNTER_USER = 1;
exports.COUNTER_TOPIC = 2;
exports.COUNTER_REPLY = 3;

var COUNTER_LIMIT = 3;

function execSQL(sql, parameters, callback) {
    pg.connect(config.store.pg, function(err, client, done) {
        if (err)
            callback(brcx.errDBAccess(err));
        else
            client.query(sql, parameters, function(err, result) {
                done();
                if (err)
                    callback(brcx.errDBAccess(err));
                else
                    callback(null, result.rows);
            });
    });
}

exports.execSQL = execSQL;

exports.addCounter = function(id, callback, count) {
    if (!count)
        count = 1;
    execSQL('UPDATE counters SET value=value+$1 WHERE id=$2 RETURNING value', [
        count, id
    ], function(err, rows) {
        if (err)
            callback(err);
        else
            callback(null, rows[0].value);
    });
};

exports.readCounters = function(callback) {
    execSQL('SELECT * FROM counters WHERE id <' + COUNTER_LIMIT, [], function(err, rows) {
        if (err)
            callback(err);
        else {
            var counters = {};
            _.each(rows, function(row) {
                counters[row.id] = row.value;
            });
            callback(null, counters);
        }
    });
};