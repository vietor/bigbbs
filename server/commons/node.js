var _ = require('underscore');
var config = require('config');

var nodes = [];
_.each(config.webapp.node_groups, function(node_group) {
    nodes = nodes.concat(node_group.nodes);
});

exports.findNode = function(id) {
    return _.find(nodes, function(row) {
        return row.id == id;
    });
};

exports.getNodeGroups = function() {
    return config.webapp.node_groups;
};
