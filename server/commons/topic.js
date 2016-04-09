var _ = require('underscore');
var config = require('config');

var nodes = [config.webapp.node_trash];
_.each(config.webapp.node_groups, function(node_group) {
    var group = _.omit(node_group, "nodes");
    nodes = nodes.concat(_.map(node_group.nodes, function(node) {
        return _.extend({}, node, {
            group: group
        });
    }));
});

exports.findNode = function(id) {
    return _.find(nodes, function(row) {
        return row.id == id;
    });
};

exports.findNodeByCode = function(code) {
    return _.find(nodes, function(row) {
        return row.code == code;
    });
};

exports.getPageOffset = function(page, pagesize) {
    if (page < 2)
        return 0;
    else
        return (page - 1) * pagesize;
};

exports.getPageCount = function(total, pagesize) {
    if (total < 1)
        return 0;
    return Math.floor(total / pagesize) + (total % pagesize > 0 ? 1 : 0);
};

exports.TOPIC_OTYPE_CREATE = 0;
exports.TOPIC_OTYPE_UPDATE = 1;
