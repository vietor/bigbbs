var config = require('config');
var bigcluster = require('bigcluster');

bigcluster(config.cpu, function() {
    var util = require('util');
    var path = require('path');
    var swig = require('swig'),
        marked = require('marked'),
        bigrest = require('bigrest'),
        csrf = require('csurf'),
        connredis = require('connect-redis');

    global.project_rootdir = path.resolve(__dirname);

    var port = config.port;
    var bind = config.bind || "";
    var avatar = config.store.avatar;

    var statics = [{
        urlpath: '/',
        filepath: path.join(__dirname, "webroot")
    }];
    if (avatar.type == 'localfs')
        statics.push({
            urlpath: avatar.params.baseurl,
            filepath: avatar.params.filepath
        });

    var opts = {
        debug: config.debug,
        basepath: path.join(__dirname, "server"),
        limits: {
            bodySize: 4 * 1024 * 1024,
            uploadSize: 4 * 1024 * 1024
        },
        viewer: {
            cache: false,
            render: swig.renderFile,
            filepath: path.join(__dirname, "resources", "views")
        },
        session: {
            secret: config.store.session.secret,
            store: function(session) {
                return new(connredis(session))(config.store.session.redis);
            }
        },
        static: statics,
        middlewares: [
            csrf({
                cookie: true
            })
        ]
    };

    var swigDefaults = {
        locals: {
            webapp: config.webapp,
            limits: config.limits
        }
    };
    if (opts.debug)
        swigDefaults.cache = false;
    swig.setDefaults(swigDefaults);

    function tstext(timestamp) {
        var date = new Date(timestamp * 1000);
        return util.format('%d-%d-%d %d:%d:%d', date.getFullYear(), date.getMonth() + 1, date.getDay(), date.getHours(), date.getMinutes(), date.getSeconds());
    }

    swig.setFilter('tstext', tstext);
    swig.setFilter('tsbeforetext', function(timestamp) {
        var current = Math.floor(Date.now() / 1000);
        var distance = current - parseInt(timestamp);
        if (distance < 60)
            return '几秒前';
        if (distance < 3600)
            return Math.floor(distance / 60) + '分钟前';
        if (distance < 86400)
            return Math.floor(distance / 3600) + '小时前';
        if (distance < 432000)
            return Math.floor(distance / 86400) + '天前';
        return tstext(timestamp);
    });
    swig.setFilter('avatar', function(avatar_uri) {
        var raw_url = "";
        if (avatar_uri) {
            if (!avatar.params.baseurl)
                raw_url = avatar_uri;
            else {
                raw_url = avatar.params.baseurl + avatar_uri;
            }
        }
        return raw_url || "/images/avatar.png";
    });
    swig.setFilter('prange', function(count) {
        var arr = [];
        for (var i = 1; i <= count; ++i)
            arr.push(i);
        return arr;
    });

    function markdown(context) {
        return marked(context);
    }
    markdown.safe = true;
    swig.setFilter('markdown', markdown);

    function kvmap(k, vmap) {
        return vmap[k] || '';
    }
    swig.setFilter('kvmap', kvmap);

    bigrest.listen(port, opts, bind, function() {
        console.info("Starting on %s:%d ...", bind, port);
    });
});
