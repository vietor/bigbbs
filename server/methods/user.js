var async = require('async');
var config = require('config');
var datastore = require('../utils/datastore'),
    UserModel = datastore.UserModel;

function asKey(text) {
    return text.toLowerCase();
}

function mkUKey(username) {
    return brcx.md5(asKey(username));
}

function findUserAndCheckStatus(user_id, callback) {
    brcx.findUserAndCheckStatus(user_id, brcx.STATUS_NOLOGIN, function(err, user) {
        if (err)
            callback(err);
        else
            callback(null, user);
    });
}

exports.user_register = function(username, password, email, callback) {
    async.waterfall([
        function(nextcall) {
            brcx.findUserByKV('ukey', mkUKey(username), function(err, user) {
                if (err)
                    nextcall(err);
                else if (user)
                    nextcall(brcx.errAlreadyExistsUser());
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserByKV('email', asKey(email), function(err, user) {
                if (err)
                    nextcall(err);
                else if (user)
                    nextcall(brcx.errAlreadyExistsEmail());
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            UserModel.insert({
                ukey: mkUKey(username),
                username: username,
                password: brcx.md5(password),
                email: asKey(email),
                score: config.limits.score.user_create,
                create_date: brcx.getTimestamp()
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.addCounter(brcx.COUNTER_USER, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        }
    ], callback);
};

exports.user_login = function(username, password, callback) {
    brcx.findUserByKVAndCheckStatus('ukey', mkUKey(username), brcx.STATUS_NOLOGIN, function(err, user) {
        if (err)
            callback(err);
        else if (user.password != brcx.md5(password))
            callback(brcx.errInvalidUserOrPwd());
        else
            callback(null, user);
    });
};

exports.user_detail = function(user_id, callback) {
    brcx.findUserById(user_id, callback);
};

exports.user_setting_profile = function(user_id, email, homepage, signature, callback) {
    async.waterfall([
        function(nextcall) {
            findUserAndCheckStatus(user_id, function(err, user) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, user);
            });
        },
        function(user, nextcall) {
            if (user.email == email)
                nextcall(null);
            else
                brcx.findUserByKV('email', asKey(email), function(err, user) {
                    if (err)
                        nextcall(err);
                    else if (user)
                        nextcall(brcx.errAlreadyExistsEmail());
                    else
                        nextcall(null);
                });
        },
        function(nextcall) {
            UserModel.update({
                _id: user_id
            }, {
                email: asKey(email),
                homepage: homepage,
                signature: signature
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserById(user_id, nextcall);
        }
    ], callback);
};

exports.user_setting_password = function(user_id, password, newpassword, callback) {
    async.waterfall([
        function(nextcall) {
            findUserAndCheckStatus(user_id, function(err, user) {
                if (err)
                    nextcall(err);
                else if (user.password != brcx.md5(password))
                    nextcall(brcx.errInvalidPwd());
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            UserModel.update({
                _id: user_id
            }, {
                password: brcx.md5(newpassword)
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserById(user_id, nextcall);
        }
    ], callback);
};

exports.user_setting_avatar = function(user_id, file, callback) {
    async.waterfall([
        function(nextcall) {
            findUserAndCheckStatus(user_id, function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.storeAvatar(file.path, function(err, avatar_uri) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, avatar_uri);
            });
        },
        function(avatar_uri, nextcall) {
            UserModel.update({
                _id: user_id
            }, {
                avatar: avatar_uri
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserById(user_id, nextcall);
        }
    ], callback);
};

exports.user_findpwd = function(username, email, callback) {
    async.waterfall([
        function(nextcall) {
            var time = brcx.getTimestamp();
            brcx.findUserByKVAndCheckStatus('ukey', mkUKey(username), brcx.STATUS_NOLOGIN, function(err, user) {
                if (err)
                    nextcall(err);
                else if (user.email != asKey(email))
                    nextcall(brcx.errInvalidEmailOwner());
                else if (time - user.reset_date < config.limits.second_of_findpwd)
                    nextcall(brcx.errBusyForFindPwd());
                else
                    nextcall(null, user, time);
            });
        },
        function(user, time, nextcall) {
            var code = brcx.randomString(12);
            UserModel.update({
                _id: user._id
            }, {
                reset_code: code,
                reset_date: time
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null, user, code);
            });
        },
        function(user, code, nextcall) {
            brcx.sendMail4FindPwd(user.email, brcx.encryptSafeData({
                i: user._id,
                c: code,
                t: brcx.getTimestamp()
            }), function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        }
    ], callback);
};

exports.user_resetpwd = function(code, newpassword, callback) {
    async.waterfall([
        function(nextcall) {
            var obj = brcx.decryptSafeData(code);
            if (!obj)
                nextcall(brcx.errInvalidSafeCode());
            else
                nextcall(null, obj);
        },
        function(obj, nextcall) {
            brcx.findUserById(obj.i, function(err, user) {
                if (err)
                    nextcall(err);
                else if (user.reset_code !== obj.c)
                    nextcall(brcx.errInvalidSafeCode());
                else
                    nextcall(null, user);
            });
        },
        function(user, nextcall) {
            UserModel.update({
                id: user.id
            }, {
                reset_code: "",
                password: brcx.md5(newpassword)
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null);
            });
        }
    ], callback);
};


exports.user_active = function(id, callback) {
    async.waterfall([
        function(nextcall) {
            brcx.findUserById(id, function(err, user) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, user);
            });
        },
        function(user, nextcall) {
            var timestamp = brcx.getTimestamp();
            if (!brcx.isActiveAble(user.active_date))
                nextcall(null);
            else {
                var days = 1;
                if (timestamp - user.active_date < brcx.ACTIVE_INTERVAL)
                    days = user.active_days + 1;
                UserModel.update({
                    _id: id
                }, {
                    $set: {
                        active_date: timestamp,
                        active_days: days
                    },
                    $inc: {
                        score: config.limits.score.user_active

                    }
                }, function(err) {
                    if (err)
                        nextcall(brcx.errDBAccess(err));
                    else
                        nextcall(null);
                });
            }
        }
    ], callback);
};

exports.user_modify_status = function(user_id, status, status_expire, callback) {
    async.waterfall([
        function(nextcall) {
            brcx.findUserById(user_id, function(err, user) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, user);
            });
        },
        function(user, nextcall) {
            UserModel.update({
                _id: user_id
            }, {
                status: status,
                status_expire: status_expire
            }, function(err) {
                if (err)
                    nextcall(brcx.errDBAccess(err));
                else
                    nextcall(null);
            });
        }
    ], callback);
};