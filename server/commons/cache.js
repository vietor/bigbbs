var redis = require('redis');
var config = require('config');

var client = redis.createClient(config.store.redis.port, config.store.redis.host, config.store.redis.options || {});

function x_lock(key, timeout, callback) {
    client.set('lock:' + key, "locked", "ex", timeout, 'nx', function(err, res) {
        if (err)
            callback(brcx.errCSAccess(err));
        else
            callback(null, res === 'OK');
    });
}

exports.checkRateOfCreate = function(key, callback) {
    x_lock(key, config.limits.rate_of_create, function(err, pass) {
        if (err)
            callback(err);
        else if (!pass)
            callback(brcx.errRequestRateLimit());
        else
            callback(null);
    });
};
