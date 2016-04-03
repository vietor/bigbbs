var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');
var xbase64 = require('xbase64');
var request = require('request');
var _ = require('underscore');
var config = require('config');
var uuid = require('node-uuid');

var store_type = config.store.avatar.type;
var store_params = config.store.avatar.params;

if (!store_params || !_.contains(['localfs', 'qiniu', 'aliyun'], store_type)) {
    throw Error('Unsupported avatar store type');
}

function fileCopy(source, target, callback) {
    var ins = fs.createReadStream(source);
    var outs = fs.createWriteStream(target);
    ins.on('end', function() {
        callback(null);
    });
    ins.on('error', function(err) {
        callback(err);
    });
    ins.pipe(outs);
}

function mkdirp(filepath) {
    if (!fs.existsSync(filepath)) {
        var parent = path.dirname(filepath);
        if (parent && parent != filepath)
            mkdirp(parent);
        try {
            fs.mkdirSync(filepath);
        } catch (e) {}
    }
    return filepath;
}

function hmac_sha1(content, secret) {
    return crypto.createHmac('sha1', secret).update(content).digest();
}

function storeQiniu(params, filename, filepath, callback) {
    if (!filename)
        filename = path.basename(filepath);
    var putPolicy = {
        scope: params.bucket + ':' + filename,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        returnBody: "{}"
    };
    var encodedPutPolicy = xbase64.urlencode(JSON.stringify(putPolicy));
    var encodedSign = xbase64.urlencode(hmac_sha1(encodedPutPolicy, params.secretKey));
    var formData = {
        key: filename,
        file: fs.createReadStream(filepath),
        token: params.accessKey + ':' + encodedSign + ':' + encodedPutPolicy
    };
    request.post({
        url: params.url,
        formData: formData
    }, function(err, resp, body) {
        if (err)
            callback(err);
        else if (resp.statusCode == 200)
            callback(null);
        else
            callback(new Error('status: ' + resp.statusCode) + ', message: ' + JSON.parse(body).error);
    });
}

function storeAliyun(params, filename, filepath, callback) {
    if (!filename)
        filename = path.basename(filepath);

    var policy = {
        "expiration": (new Date(Date.now() + 360000)).toISOString(),
        "conditions": [{
            key: filename
        }]
    };
    var encodedPolicy = xbase64.encode(JSON.stringify(policy));
    var encodedSign = xbase64.encode(hmac_sha1(encodedPolicy, params.accessKeySecret));
    var formData = {
        key: filename,
        OSSAccessKeyId: params.accessKeyId,
        policy: encodedPolicy,
        Signature: encodedSign,
        success_action_status: 200,
        file: fs.createReadStream(filepath)
    };
    request.post({
        url: params.url,
        formData: formData
    }, function(err, resp, body) {
        if (err)
            callback(err);
        else if (resp.statusCode == 200)
            callback(null);
        else
            callback(new Error('status: ' + resp.statusCode + ', error: ' + body));
    });
}

exports.storeAvatar = function(origin_filepath, callback) {
    var filename = uuid.v1().replace(/-/g, '') + path.extname(origin_filepath);
    if (store_type == "localfs") {
        var daypath = brcx.getDayCode('/').substring(0, 7);
        var rawpath = mkdirp(path.join(store_params.filepath, daypath));
        fileCopy(origin_filepath, path.join(rawpath, filename), function(err) {
            if (err)
                callback(brcx.errFSAccess(err));
            else
                callback(null, daypath + '/' + filename);
        });
    } else if (store_type == "qiniu") {
        storeQiniu(store_params, filename, origin_filepath, function(err) {
            if (err)
                callback(brcx.errFSAccess(err));
            else
                callback(null, filename);
        });
    } else if (store_type == "aliyun") {
        storeAliyun(store_params, filename, origin_filepath, function(err) {
            if (err)
                callback(brcx.errFSAccess(err));
            else
                callback(null, filename);
        });
    } else {
        callback(brcx.errFSAccess('不支持的存储类型'));
    }
};
