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

    var statics = [{
        urlpath: '/',
        filepath: path.join(__dirname, "webroot")
    }];
    if (config.store.avatar.LOCAL) {
        statics.push({
            urlpath: config.store.avatar.LOCAL.url,
            filepath: config.store.avatar.LOCAL.path
        });
    }

    var opts = {
        debug: config.debug,
        basepath: path.join(__dirname, "server"),
        limits: {
            bodySize: 4 * 1024 * 1024,
            uploadSize: 4 * 1024 * 1024
        },
        viewer: {
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

    swig.setDefaults({
        cache: !opts.debug,
        locals: {
            webapp: config.webapp,
            limits: config.limits
        }
    });

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
        var raw_url = avatar_uri;
        if (avatar_uri) {
            var pos = avatar_uri.indexOf(':');
            if (pos > 0) {
                var type = avatar_uri.substring(0, pos);
                var use_type = config.store.avatar[type];
                if (use_type)
                    raw_url = use_type.url + avatar_uri.substring(pos + 1);
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
