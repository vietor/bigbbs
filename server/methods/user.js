var async = require('async');
var config = require('config');

function asKey(text) {
    return text.toLowerCase();
}

function mkUKey(username) {
    return brcx.md5(asKey(username));
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
            brcx.execSQL("INSERT INTO users(ukey, username, password, email, score, create_date) VALUES($1, $2, $3, $4, $5, $6)", [
                mkUKey(username),
                username,
                brcx.md5(password),
                asKey(email),
                config.limits.score.user_create,
                brcx.getTimestamp()
            ], function(err) {
                if (err)
                    nextcall(err);
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
    async.waterfall([
        function(nextcall) {
            brcx.findUserByKV('ukey', mkUKey(username), function(err, user) {
                if (err)
                    nextcall(err);
                else if (!user)
                    nextcall(brcx.errNotFoundUser());
                else if (user.password != brcx.md5(password))
                    nextcall(brcx.errInvalidUserOrPwd());
                else
                    nextcall(null, user);
            });
        }
    ], callback);
};

exports.user_detail = function(id, callback) {
    brcx.findUserById(id, callback);
};

exports.user_setting_profile = function(id, email, homepage, signature, callback) {
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
            brcx.execSQL("UPDATE users SET email=$1, homepage=$2, signature=$3 WHERE id=$4", [
                asKey(email), homepage, signature, id
            ], function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserById(id, nextcall);
        }
    ], callback);
};

exports.user_setting_password = function(id, password, newpassword, callback) {
    async.waterfall([
        function(nextcall) {
            brcx.findUserById(id, function(err, user) {
                if (err)
                    nextcall(err);
                else if (user.password != brcx.md5(password))
                    nextcall(brcx.errInvalidPwd());
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.execSQL("UPDATE users SET password=$1 WHERE id=$2", [
                brcx.md5(newpassword), id
            ], function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserById(id, nextcall);
        }
    ], callback);
};

exports.user_setting_avatar = function(id, file, callback) {
    async.waterfall([
        function(nextcall) {
            brcx.findUserById(id, function(err) {
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
            brcx.execSQL("UPDATE users SET avatar=$1 WHERE id=$2", [
                avatar_uri, id
            ], function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null);
            });
        },
        function(nextcall) {
            brcx.findUserById(id, nextcall);
        }
    ], callback);
};

exports.user_findpwd = function(username, email, callback) {
    async.waterfall([
        function(nextcall) {
            var time = brcx.getTimestamp();
            brcx.findUserByKV('ukey', mkUKey(username), function(err, user) {
                if (err)
                    nextcall(err);
                else if (!user)
                    nextcall(brcx.errNotFoundUser());
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
            brcx.execSQL("UPDATE users SET reset_code=$1, reset_date=$2 WHERE id=$3", [
                code, time, user.id
            ], function(err) {
                if (err)
                    nextcall(err);
                else
                    nextcall(null, user, code);
            });
        },
        function(user, code, nextcall) {
            brcx.sendMail4FindPwd(user.email, brcx.encryptSafeData({
                i: user.id,
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
            brcx.execSQL("UPDATE users SET password=$1, reset_code='' WHERE id=$2", [
                brcx.md5(newpassword), user.id
            ], function(err) {
                if (err)
                    nextcall(err);
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
                brcx.execSQL("UPDATE users SET active_date=$1, active_days=$2, score=score+$3 WHERE id=$4", [
                    timestamp, days, config.limits.score.user_active, id
                ], function(err) {
                    if (err)
                        nextcall(err);
                    else
                        nextcall(null);
                });
            }
        }
    ], callback);
};
