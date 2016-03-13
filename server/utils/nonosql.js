var util = require('util');
var _ = require('underscore');

function Query(executor) {
    var _match = null;
    var _project = null;
    var _sort = null;
    var _offset = -1;
    var _limit = -1;

    this.match = function(match) {
        _match = match;
        return this;
    };
    this.select = function(fields) {
        _project = fields;
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
        executor.find(_match, _project, _sort, _offset, _limit, callback);
    };
}

function ModelShell(executor) {
    this.find = function(match, select, callback) {
        if (typeof select == 'function') {
            callback = select;
            select = null;
        }
        var query = new Query(executor);
        if (match)
            query.match(match);
        if (select)
            query.select(select);
        if (callback)
            query.exec(callback);
        else
            return query;
    };
    this.insert = function(fields, options, callback) {
        if (typeof options == 'function') {
            callback = options;
            options = null;
        }
        executor.insert(fields, options || {}, callback);
    };
    this.update = function(match, fields, options, callback) {
        if (typeof options == 'function') {
            callback = options;
            options = null;
        }
        executor.update(match, fields, options || {}, callback);
    };
    this.remove = function(match, callback) {
        executor.remove(match, callback);
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
                    if (err)
                        callback(err);
                    else
                        callback(null, result.rows);
                });
        });
    }

    function Executor(name) {

        function parseWhere(match, index, parameters) {
            var wheres = [];
            var base = index;
            _.mapObject(match, function(value, key) {
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

        this.find = function(match, select, sort, offset, limit, callback) {
            var index = 0,
                parameters = [],
                sql = 'SELECT';
            if (!select)
                sql += ' *';
            else {
                if (util.isArray(select))
                    sql += ' ' + select.join(',');
                else {
                    var columns = [];
                    _.mapObject(select, function(value, key) {
                        if (value)
                            columns.push(key);
                    });
                    sql += ' ' + columns.join(',');
                }
            }
            sql += ' FROM ' + name;
            if (match) {
                var where = parseWhere(match, 0, parameters);
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
            execSQL(sql, parameters, function(err, rows) {
                callback(err, rows);
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
            if (options.return)
                sql += ' RETURNING ' + options.return;
            execSQL(sql, parameters, function(err, rows) {
                if (err)
                    callback(err);
                else {
                    var value = null;
                    if (options.return)
                        value = rows[0];
                    callback(null, value);
                }
            });
        };

        this.update = function(match, fields, options, callback) {
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
            if (match) {
                var where = parseWhere(match, index, parameters);
                if (where.subsql)
                    sql += where.subsql;
            }
            if (options.return)
                sql += ' RETURNING ' + options.return;
            execSQL(sql, parameters, function(err, rows) {
                if (err)
                    callback(err);
                else {
                    var value = null;
                    if (options.return)
                        value = rows[0];
                    callback(null, value);
                }
            });
        };

        this.remove = function(match, callback) {
            var parameters = [],
                sql = 'DELETE FROM ' + name;
            if (match) {
                var where = parseWhere(match, 0, parameters);
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

    this.model = function(name) {
        return new ModelShell(new Executor(name));
    };
}

exports.connect = function(type, params) {
    if (type == 'pgsql')
        return new PgSQLProxy(params);
    throw new TypeError('Unsupport database type: ' + type);
};
