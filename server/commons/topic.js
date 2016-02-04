exports.TOPIC_OTYPE_CREATE = 0;
exports.TOPIC_OTYPE_UPDATE = 1;

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
