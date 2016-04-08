var url = require('url');
var _ = require('underscore');
var config = require('config');

var search = config.webapp.search || {};
if (typeof search == 'string') {
    search = {
        type: search
    };
}
var search_type = search.type || '';
var hostname = search.domain || url.parse(config.webapp.site.home_url).hostname;

if (!_.contains(['google', 'bing'], search_type)) {
    throw Error('Unsupported webapp search type');
}

exports.makeSearchUrl = function(q) {
    if (search_type == 'bing')
        return "https://www.bing.com/search?q=site:" + hostname + encodeURIComponent(' ' + q);
    else
        return "https://www.google.com/search?q=site:" + hostname + encodeURIComponent(' ' + q);
};
