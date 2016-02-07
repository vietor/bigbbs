var _ = require('underscore');

var SECONDS_OF_DAY = 24 * 3600;

exports.ACTIVE_INTERVAL = SECONDS_OF_DAY * 2;

exports.isActiveAble = function(active_date, timestamp) {
    if (!timestamp)
        timestamp = brcx.getTimestamp();
    return parseInt(active_date) + SECONDS_OF_DAY < timestamp;
};

function findUser(key, value, callback) {
    brcx.execSQL("SELECT * FROM users WHERE " + key + "=$1", [value], function(err, rows) {
        if (err)
            callback(err);
        else if (rows.length < 1)
            callback(null, null);
        else
            callback(null, rows[0]);
    });
}

exports.findUserByKV = findUser;

exports.findUserById = function(id, callback) {
    findUser('id', id, function(err, user) {
        if (err)
            callback(err);
        else if (!user)
            callback(brcx.errNotFoundUser());
        else
            callback(null, user);
    });
};

exports.findUsersById = function(ids, callback) {
    if (ids.length < 1)
        callback(null, {});
    else
        brcx.execSQL("SELECT * FROM users WHERE id IN (" + _.map(ids, function(item, i) {
            return '$' + (i + 1);
        }).join(',') + ")", ids, function(err, rows) {
            if (err)
                callback(err);
            else {
                var map = {};
                _.each(rows, function(row) {
                    map[row.id] = row;
                });
                callback(null, map);
            }
        });
};
