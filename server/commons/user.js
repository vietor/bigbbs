var _ = require('underscore');
var datastore = require('../utils/datastore'),
    UserModel = datastore.UserModel;

var SECONDS_OF_DAY = 24 * 3600;

exports.ACTIVE_INTERVAL = SECONDS_OF_DAY * 2;

exports.ROLE_NORMAL = 0;
exports.ROLE_MANAGER = 1;
exports.STATUS_NORMAL = 0;
exports.STATUS_NOVOICE = 1;
exports.STATUS_NOLOGIN = 2;

exports.isActiveAble = function(active_date, timestamp) {
    if (!timestamp)
        timestamp = brcx.getTimestamp();
    return parseInt(active_date) + SECONDS_OF_DAY < timestamp;
};

function findUser(key, value, callback) {
    var match = {};
    match[key] = value;
    UserModel.find(match, function(err, rows) {
        if (err)
            callback(brcx.errDBAccess(err));
        else if (rows.length < 1)
            callback(null, null);
        else
            callback(null, rows[0]);
    });
}

function findUserById(user_id, callback) {
    findUser('_id', user_id, function(err, user) {
        if (err)
            callback(brcx.errDBAccess(err));
        else if (!user)
            callback(brcx.errNotFoundUser());
        else
            callback(null, user);
    });
}

exports.findUserByKV = findUser;
exports.findUserById = findUserById;

exports.findUsersById = function(user_ids, callback) {
    if (user_ids.length < 1)
        callback(null, {});
    else
        UserModel.find({
            _id: {
                $in: user_ids
            }
        }, function(err, rows) {
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
};

function checkUserStatus(user, status) {
    return (user.status < status) || (user.status == status && (user.status_expire < 1 || user.status_expire < brcx.getTimestamp()));
}

exports.findUserAndCheckStatus = function(user_id, status, callback) {
    findUserById(user_id, function(err, user) {
        if (err)
            callback(err);
        else if (!checkUserStatus(user, status))
            callback(brcx.errStatusLimited());
        else
            callback(null, user);
    });
};

exports.findUserByKVAndCheckStatus = function(key, value, status, callback) {
    findUser(key, value, function(err, user) {
        if (err)
            callback(err);
        else if (!user)
            callback(brcx.errNotFoundUser());
        else if (!checkUserStatus(user, status))
            callback(brcx.errStatusLimited());
        else
            callback(null, user);
    });
};