var crypto = require('crypto');
var config = require('config');

exports.md5 = function(text) {
    var hash = crypto.createHash('md5');
    hash.update(text);
    return hash.digest('hex');
};

exports.sha1 = function(text) {
    var hash = crypto.createHash('sha1');
    hash.update(text);
    return hash.digest('hex');
};

exports.getTimestamp = function() {
    return Math.round(Date.now() / 1000);
};

exports.getDayCode = function(sep) {
    if (!sep)
        sep = "";
    var dt = new Date();
    return dt.getFullYear() + sep + (dt.getMonth() < 9 ? '0' : '') + (dt.getMonth() + 1) + sep + (dt.getDate() < 10 ? '0' : '') + dt.getDate();
};

exports.randomString = function(length) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
};

exports.encryptSafeData = function(data) {
    var cipher = crypto.createCipher('AES-128-ECB', config.store.safekey);
    return cipher.update(JSON.stringify(data), 'utf-8', 'hex') + cipher.final('hex');
};

exports.decryptSafeData = function(data) {
    var cipher = crypto.createDecipher('AES-128-ECB', config.store.safekey);
    var text = cipher.update(data, 'hex', 'utf-8') + cipher.final('utf-8');
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};
