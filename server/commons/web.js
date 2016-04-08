var url = require('url');
var _ = require('underscore');
var config = require('config');

var search_type = config.webapp.search;
var hostname = url.parse(config.webapp.site.home_url).hostname;

if (!_.contains(['google', 'bing'], search_type)) {
    throw Error('Unsupported webapp search type');
}

exports.makeSearchUrl = function(q) {
    if (search_type == 'bing')
        return "https://www.bing.com/search?q=site:" + hostname + encodeURIComponent(' ' + q);
    else
        return "https://www.google.com/search?q=site:" + hostname + encodeURIComponent(' ' + q);
};