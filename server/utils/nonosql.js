var util = require('util');
var _ = require('underscore');

var NUMBER = 1,
    STRING = 2;

exports.NUMBER = NUMBER;
exports.STRING = STRING;

function Transfer(fields) {
    var _fields = [];

    _.mapObject(fields, function(value, key) {
        if (typeof value == 'number')
            _fields.push({
                key: key,
                type: value,
                default: null
            });
        else
            _fields.push({
                key: key,
                type: value.type,
                default: value.default
            });
    });

    this.exec = function(obj) {
        var out = {};
        _.each(_fields, function(row) {
            var value = obj[row.key];
            if (_.isUndefined(value) || _.isNull(value) || _.isNaN(value)) {
                if (row.default)
                    out[row.key] = row.default;
            } else {
                if (row.type == NUMBER)
                    out[row.key] = Number(value);
                else if (row.type == STRING)
                    out[row.key] = '' + value;
                else
                    out[row.key] = value;
            }
        });
        _.mapObject(obj, function(value, key) {
            if (!_.has(out, key))
                out[key] = value;
        });
        return out;
    };
}

function Query(query, executor) {
    var _query = query;
    var _fields = null;
    var _sort = null;
    var _offset = -1;
    var _limit = -1;

    this.select = function(fields) {
        _fields = fields;
        return this;
    };
    this.sort = function(fields) {
        _sort = fields;
        return this;
    };
    this.skip = function(count) {
        _offset = count;
        return this;
    };
    this.limit = function(count) {
        _limit = count;
        return this;
    };

    this.exec = function(callback) {
        executor.find(_query, _fields, _sort, _offset, _limit, callback);
    };
}

function ModelShell(executor) {
    this.find = function(query, fields, callback) {
        if (typeof fields == 'function') {
            callback = fields;
            fields = null;
        }
        var q = new Query(query, executor);
        if (fields)
            q.select(fields);
        if (callback)
            q.exec(callback);
        else
            return q;
    };
    this.insert = function(fields, options, callback) {
        if (typeof options == 'function') {
            callback = options;
            options = null;
        }
        executor.insert(fields, options || {}, callback);
    };
    this.update = function(query, fields, options, callback) {
        if (typeof options == 'function') {
            callback = options;
            options = null;
        }
        executor.update(query, fields, options || {}, callback);
    };
    this.remove = function(query, callback) {
        executor.remove(query, callback);
    };
}

function PgSQLProxy(params) {
    var pg = require('pg');

    function execSQL(sql, parameters, callback) {
        pg.connect(params, function(err, client, done) {
            if (err)
                callback(err);
            else
                client.query(sql, parameters, function(err, result) {
                    done();
                    callback(err, result);
                });
        });
    }

    function Executor(name, transfer) {

        function parseWhere(query, index, parameters) {
            var wheres = [];
            var base = index;
            _.mapObject(query, function(value, key) {
                if (typeof value != 'object') {
                    wheres.push(key + '=$' + (++index));
                    parameters.push(value);
                } else {
                    _.mapObject(value, function(v, k) {
                        if (k == '$eq') {
                            wheres.push(key + '=$' + (++index));
                            parameters.push(v);
                        } else if (k == '$ne') {
                            wheres.push(key + '!=$' + (++index));
                            parameters.push(v);
                        } else if (k == '$lte') {
                            wheres.push(key + '<=$' + (++index));
                            parameters.push(v);
                        } else if (k == '$lt') {
                            wheres.push(key + '<$' + (++index));
                            parameters.push(v);
                        } else if (k == '$gte') {
                            wheres.push(key + '>=$' + (++index));
                            parameters.push(v);
                        } else if (k == '$gt') {
                            wheres.push(key + '>$' + (++index));
                            parameters.push(v);
                        } else if (k == '$in' || k == '$nin') {
                            var idxs = [];
                            _.each(v, function(o) {
                                parameters.push(o);
                                idxs.push('$' + (++index));
                            });
                            wheres.push(key + (k == '$in' ? ' IN ' : ' NOT IN ') + '(' + idxs.join(',') + ')');
                        }
                    });
                }
            });
            return {
                skip: index - base,
                subsql: wheres.length < 1 ? '' : ' WHERE ' + wheres.join(' AND ')
            };
        }

        this.find = function(query, fields, sort, offset, limit, callback) {
            var index = 0,
                parameters = [],
                sql = 'SELECT';
            if (!fields)
                sql += ' *';
            else {
                if (util.isArray(fields))
                    sql += ' ' + fields.join(',');
                else {
                    var columns = [];
                    _.mapObject(fields, function(value, key) {
                        if (value)
                            columns.push(key);
                    });
                    sql += ' ' + columns.join(',');
                }
            }
            sql += ' FROM ' + name;
            if (query) {
                var where = parseWhere(query, 0, parameters);
                if (where.subsql) {
                    sql += where.subsql;
                    index += where.skip;
                }
            }
            if (sort) {
                var sorts = [];
                _.mapObject(sort, function(value, key) {
                    if (value == 1)
                        sorts.push(key + ' ASC');
                    else if (value == -1)
                        sorts.push(key + ' DESC');
                });
                if (sorts.length > 0)
                    sql += ' ORDER BY ' + sorts.join(',');
            }
            if (limit >= 0) {
                sql += ' LIMIT $' + (++index);
                parameters.push(limit);
            }
            if (offset >= 0) {
                sql += ' OFFSET $' + (++index);
                parameters.push(offset);
            }
            execSQL(sql, parameters, function(err, result) {
                if (err)
                    callback(err);
                else
                    callback(null, _.map(result.rows, function(row) {
                        return transfer.exec(row);
                    }));
            });
        };

        this.insert = function(fields, options, callback) {
            var index = 0,
                parameters = [],
                sql = 'INSERT INTO ' + name;
            var columns = [],
                indexs = [];
            _.mapObject(fields, function(value, key) {
                columns.push(key);
                indexs.push('$' + (++index));
                parameters.push(value);
            });
            sql += ' (' + columns.join(',') + ') VALUES(' + indexs.join(',') + ')';
            if (options.id)
                sql += ' RETURNING ' + options.id;
            execSQL(sql, parameters, function(err, result) {
                if (err)
                    callback(err);
                else {
                    var value = null;
                    if (options.id)
                        value = transfer.exec(result.rows[0]);
                    callback(null, value);
                }
            });
        };

        this.update = function(query, fields, options, callback) {
            var index = 0,
                parameters = [],
                sql = 'UPDATE ' + name + ' SET';
            var fieldSet = null,
                fieldInc = null,
                sets = [];
            if (fields.$inc)
                fieldInc = fields.$inc;
            if (fields.$set)
                fieldSet = fields.$set;
            else
                fieldSet = fields;
            if (fieldInc) {
                _.mapObject(fieldInc, function(value, key) {
                    sets.push(key + '=' + key + '+$' + (++index));
                    parameters.push(value);
                });
            }
            if (fieldSet) {
                _.mapObject(fieldSet, function(value, key) {
                    if (key.substring(0, 1) == '$')
                        return;
                    sets.push(key + '=$' + (++index));
                    parameters.push(value);
                });
            }
            sql += ' ' + sets.join(',');
            if (query) {
                var where = parseWhere(query, index, parameters);
                if (where.subsql)
                    sql += where.subsql;
            }
            execSQL(sql, parameters, function(err, result) {
                if (err)
                    callback(err);
                else {
                    callback(null, result.rowCount);
                }
            });
        };

        this.remove = function(query, callback) {
            var parameters = [],
                sql = 'DELETE FROM ' + name;
            if (query) {
                var where = parseWhere(query, 0, parameters);
                if (where.subsql)
                    sql += where.subsql;
            }
            execSQL(sql, parameters, function(err) {
                if (err)
                    callback(err);
                else
                    callback(null);
            });
        };
    }

    this.model = function(name, fields) {
        return new ModelShell(new Executor(name, new Transfer(fields)));
    };
}

function MySQLProxy(params) {
    var mysql = require('mysql'),
        pool = mysql.createPool(params);

    function execSQL(sql, parameters, callback) {
        pool.getConnection(function(err, connection) {
            if (err)
                callback(err);
            else
                connection.query(sql, parameters, function(err, result) {
                    connection.release();
                    callback(err, result);
                });
        });
    }

    function Executor(name, transfer) {

        function parseWhere(query, parameters) {
            var wheres = [];
            _.mapObject(query, function(value, key) {
                if (typeof value != 'object') {
                    wheres.push(key + '=?');
                    parameters.push(value);
                } else {
                    _.mapObject(value, function(v, k) {
                        if (k == '$eq') {
                            wheres.push(key + '=?');
                            parameters.push(v);
                        } else if (k == '$ne') {
                            wheres.push(key + '!=?');
                            parameters.push(v);
                        } else if (k == '$lte') {
                            wheres.push(key + '<=?');
                            parameters.push(v);
                        } else if (k == '$lt') {
                            wheres.push(key + '<?');
                            parameters.push(v);
                        } else if (k == '$gte') {
                            wheres.push(key + '>=?');
                            parameters.push(v);
                        } else if (k == '$gt') {
                            wheres.push(key + '>?');
                            parameters.push(v);
                        } else if (k == '$in' || k == '$nin') {
                            var idxs = [];
                            _.each(v, function(o) {
                                parameters.push(o);
                                idxs.push('?');
                            });
                            wheres.push(key + (k == '$in' ? ' IN ' : ' NOT IN ') + '(' + idxs.join(',') + ')');
                        }
                    });
                }
            });
            return wheres.length < 1 ? '' : ' WHERE ' + wheres.join(' AND ');
        }

        this.find = function(query, fields, sort, offset, limit, callback) {
            var parameters = [],
                sql = 'SELECT';
            if (!fields)
                sql += ' *';
            else {
                if (util.isArray(fields))
                    sql += ' ' + fields.join(',');
                else {
                    var columns = [];
                    _.mapObject(fields, function(value, key) {
                        if (value)
                            columns.push(key);
                    });
                    sql += ' ' + columns.join(',');
                }
            }
            sql += ' FROM ' + name;
            if (query) {
                var subsql = parseWhere(query, parameters);
                if (subsql)
                    sql += subsql;
            }
            if (sort) {
                var sorts = [];
                _.mapObject(sort, function(value, key) {
                    if (value == 1)
                        sorts.push(key + ' ASC');
                    else if (value == -1)
                        sorts.push(key + ' DESC');
                });
                if (sorts.length > 0)
                    sql += ' ORDER BY ' + sorts.join(',');
            }
            if (limit >= 0) {
                sql += ' LIMIT ?';
                parameters.push(limit);
            }
            if (offset >= 0) {
                sql += ' OFFSET ?';
                parameters.push(offset);
            }
            execSQL(sql, parameters, function(err, rows) {
                if (err)
                    callback(err);
                else
                    callback(null, _.map(rows, function(row) {
                        return transfer.exec(row);
                    }));
            });
        };

        this.insert = function(fields, options, callback) {
            var parameters = [],
                sql = 'INSERT INTO ' + name;
            var columns = [],
                indexs = [];
            _.mapObject(fields, function(value, key) {
                columns.push(key);
                indexs.push('?');
                parameters.push(value);
            });
            sql += ' (' + columns.join(',') + ') VALUES(' + indexs.join(',') + ')';
            execSQL(sql, parameters, function(err, result) {
                if (err)
                    callback(err);
                else {
                    if (!options.id)
                        callback(null, null);
                    else {
                        var value = {};
                        value[options.id] = result.insertId;
                        callback(null, transfer.exec(value));
                    }
                }
            });
        };

        this.update = function(query, fields, options, callback) {
            var parameters = [],
                sql = 'UPDATE ' + name + ' SET';
            var fieldSet = null,
                fieldInc = null,
                sets = [];
            if (fields.$inc)
                fieldInc = fields.$inc;
            if (fields.$set)
                fieldSet = fields.$set;
            else
                fieldSet = fields;
            if (fieldInc) {
                _.mapObject(fieldInc, function(value, key) {
                    sets.push(key + '=' + key + '+?');
                    parameters.push(value);
                });
            }
            if (fieldSet) {
                _.mapObject(fieldSet, function(value, key) {
                    if (key.substring(0, 1) == '$')
                        return;
                    sets.push(key + '=?');
                    parameters.push(value);
                });
            }
            sql += ' ' + sets.join(',');
            if (query) {
                var subsql = parseWhere(query, parameters);
                if (subsql)
                    sql += subsql;
            }
            execSQL(sql, parameters, function(err, result) {
                if (err)
                    callback(err);
                else
                    callback(null, result.affectedRows);
            });
        };

        this.remove = function(query, callback) {
            var parameters = [],
                sql = 'DELETE FROM ' + name;
            if (query) {
                var subsql = parseWhere(query, parameters);
                if (subsql)
                    sql += subsql;
            }
            execSQL(sql, parameters, function(err) {
                if (err)
                    callback(err);
                else
                    callback(null);
            });
        };
    }

    this.model = function(name, fields) {
        return new ModelShell(new Executor(name, new Transfer(fields)));
    };
}


exports.connect = function(type, params) {
    if (type == 'pgsql')
        return new PgSQLProxy(params);
    else if (type == 'mysql')
        return new MySQLProxy(params);
    throw new TypeError('Unsupport database type: ' + type);
};