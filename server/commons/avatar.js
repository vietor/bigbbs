var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var config = require('config');
var uuid = require('node-uuid');

var store_type = config.store.avatar.type;
var store_params = config.store.avatar[store_type];

if (!store_params || !_.contains(['LOCAL'], store_type)) {
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

exports.storeAvatar = function(origin_filepath, callback) {
    if (store_type == "LOCAL") {
        var filename = uuid.v1().replace(/-/g, '') + path.extname(origin_filepath);
        var daypath = brcx.getDayCode('/').substring(0, 7);
        var rawpath = mkdirp(path.join(store_params.path, daypath));
        fileCopy(origin_filepath, path.join(rawpath, filename), function(err) {
            if (err)
                callback(brcx.errFSAccess(err));
            else
                callback(null, 'LOCAL:' + daypath + '/' + filename);
        });
    }
};
