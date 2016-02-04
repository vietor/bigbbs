var errors = {
    201001: "数据库错误",
    201002: "文件系统错误",
    201003: "缓存系统错误",
    202001: "用户不存在",
    202002: "邮箱不存在",
    202003: "密码错误",
    202004: "用户或密码错误",
    202005: "用户已经存在",
    202006: "邮箱已经存在",
    202007: "错误的邮箱所有者",
    202008: "错误的安全校验码",
    202009: "找回密码操作过于频繁",
    202010: "账户积分不足",
    203001: "节点不存在",
    203002: "话题不存在",
    203003: "重复操作太频繁"
};

function ErrorNode(errno, extra) {
    var message = errors[errno];
    if (extra)
        message += ": " + extra;
    this.errno = errno;
    this.message = message;
}

exports.errDBAccess = function(err) {
    return new ErrorNode(201001, err);
};

exports.errFSAccess = function(err) {
    return new ErrorNode(201002, err);
};

exports.errCSAccess = function(err) {
    return new ErrorNode(201003, err);
};

exports.errNotFoundUser = function() {
    return new ErrorNode(202001);
};

exports.errNotFoundEmail = function() {
    return new ErrorNode(202002);
};

exports.errInvalidPwd = function() {
    return new ErrorNode(202003);
};

exports.errInvalidUserOrPwd = function() {
    return new ErrorNode(202004);
};

exports.errAlreadyExistsUser = function() {
    return new ErrorNode(202005);
};

exports.errAlreadyExistsEmail = function() {
    return new ErrorNode(202006);
};

exports.errInvalidEmailOwner = function() {
    return new ErrorNode(202007);
};

exports.errInvalidSafeCode = function() {
    return new ErrorNode(202008);
};

exports.errBusyForFindPwd = function() {
    return new ErrorNode(202009);
};

exports.errScoreNotEnouth = function() {
    return new ErrorNode(202010);
};

exports.errNotFoundNode = function() {
    return new ErrorNode(203001);
};

exports.errNotFoundTopic = function() {
    return new ErrorNode(203002);
};

exports.errRequestRateLimit = function() {
    return new ErrorNode(203003);
};
