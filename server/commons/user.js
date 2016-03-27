var _ = require('underscore');
var datastore = require('../utils/datastore'),
    UserModel = datastore.UserModel;

var SECONDS_OF_DAY = 24 * 3600;

exports.ACTIVE_INTERVAL = SECONDS_OF_DAY * 2;

exports.ROLE_NORMAL = 0;
exports.ROLE_MANAGER = 1;

exports.STATUS_NORMAL = 0;
exports.STATUS_DISABLE = 1;

exports.mkUserKey = function(username) {
    return brcx.md5(username.toLowerCase());
};

exports.mkUserEmail = function(text) {
    return text.toLowerCase();
};

exports.isActiveAble = function(active_date, timestamp) {
    if (!timestamp)
        timestamp = brcx.getTimestamp();
    return parseInt(active_date) + SECONDS_OF_DAY < timestamp;
};

function processFindUser(options, callback) {
    if (!options)
        options = {};
    return function(err, rows) {
        if (err)
            callback(brcx.errDBAccess(err));
        else if (rows.length < 1) {
            if (!!!options.required)
                callback(null, null);
            else
                callback(brcx.errNotFoundUser());
        } else {
            var user = rows[0];
            if (typeof options.status != 'number' || options.status == user.status)
                callback(null, user);
            else
                callback(brcx.errStatusLimited());
        }
    };
}

exports.findUserById = function(id, callback, options) {
    UserModel.find({
        _id: id
    }, processFindUser(options, callback));
};

exports.findUserByKey = function(userkey, callback, options) {
    UserModel.find({
        userkey: userkey
    }, processFindUser(options, callback));
};

exports.findUserByEmail = function(email, callback, options) {
    UserModel.find({
        email: email
    }, processFindUser(options, callback));
};


exports.findUsersById = function(user_ids, callback, options) {
    if (!options)
        options = {};
    if (user_ids.length < 1)
        callback(null, {});
    else {
        var projection = null;
        if (!options.fully)
            projection = {
                _id: 1,
                username: 1,
                avatar: 1,
                role: 1
            };
        UserModel.find({
            _id: {
                $in: user_ids
            }
        }, projection, function(err, rows) {
            if (err)
                callback(brcx.errDBAccess(err));
            else {
                var map = {};
                _.each(rows, function(row) {
                    map[row._id] = row;
                });
                callback(null, map);
            }
        });
    }
};
